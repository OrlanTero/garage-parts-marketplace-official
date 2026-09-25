<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Part;
use App\Models\StockMovement;
use App\Services\InventoryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Stock ledger (§2–§3), reorder alerts (§10) and inventory reports (§11).
 * All reads/writes are owner-scoped to the authenticated seller's parts.
 */
class InventoryController extends Controller
{
    public function __construct(private InventoryService $inventory) {}

    /**
     * Owner scope: sellers see their own; admins default to the house
     * garage catalog (explicit ?seller_id= still audits anyone).
     */
    private function ownerId(Request $request, array $validated): int
    {
        return $this->inventory->ownerScope($request->user(), $validated['seller_id'] ?? null);
    }

    private function sellerScopeRule(): array
    {
        return ['sometimes', 'integer', 'exists:users,id'];
    }

    /** GET /seller/inventory/movements — movement history with filters. */
    public function movements(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'part_id' => ['sometimes', 'integer', 'exists:parts,id'],
            'warehouse_id' => ['sometimes', 'integer', 'exists:warehouses,id'],
            'type' => ['sometimes', 'string', Rule::in(StockMovement::TYPES)],
            'from' => ['sometimes', 'date'],
            'to' => ['sometimes', 'date'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
            'seller_id' => $this->sellerScopeRule(),
        ]);

        $userId = $this->ownerId($request, $validated);

        $query = StockMovement::query()
            ->whereHas('part', fn ($q) => $q->where('seller_id', $userId))
            ->with(['part:id,title,part_number', 'warehouse:id,name,code', 'bin:id,code', 'user:id,name'])
            ->when($validated['part_id'] ?? null, fn ($q, $id) => $q->where('part_id', $id))
            ->when($validated['warehouse_id'] ?? null, fn ($q, $id) => $q->where('warehouse_id', $id))
            ->when($validated['type'] ?? null, fn ($q, $t) => $q->where('type', $t))
            ->when($validated['from'] ?? null, fn ($q, $d) => $q->whereDate('created_at', '>=', $d))
            ->when($validated['to'] ?? null, fn ($q, $d) => $q->whereDate('created_at', '<=', $d))
            ->orderByDesc('created_at');

        return response()->json(['data' => $query->paginate((int) ($validated['per_page'] ?? 25))]);
    }

    /** POST /seller/parts/{part}/stock-movements — receipt/issue/adjust/count/... */
    public function storeMovement(Request $request, Part $part): JsonResponse
    {
        $data = $request->validate([
            'type' => ['required', 'string', Rule::in(StockMovement::TYPES)],
            'quantity' => ['sometimes', 'integer', 'min:1', 'max:1000000'],
            'quantity_change' => ['sometimes', 'integer', 'min:-1000000', 'max:1000000'],
            'counted_quantity' => ['sometimes', 'integer', 'min:0', 'max:1000000'],
            'warehouse_id' => ['sometimes', 'nullable', 'integer', 'exists:warehouses,id'],
            'bin_id' => ['sometimes', 'nullable', 'integer', 'exists:bins,id'],
            'unit_cost' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'reference' => ['sometimes', 'nullable', 'string', 'max:150'],
            'reason' => ['sometimes', 'nullable', 'string', 'max:500'],
        ]);

        $movement = $this->inventory->move($request->user(), $part, $data);

        return response()->json(['data' => $movement->load(['warehouse:id,name,code', 'bin:id,code'])], 201);
    }

    /** POST /seller/parts/{part}/transfer — warehouse-to-warehouse move. */
    public function transfer(Request $request, Part $part): JsonResponse
    {
        $data = $request->validate([
            'quantity' => ['required', 'integer', 'min:1', 'max:1000000'],
            'from_warehouse_id' => ['nullable', 'integer', 'exists:warehouses,id'],
            'from_bin_id' => ['nullable', 'integer', 'exists:bins,id'],
            'to_warehouse_id' => ['nullable', 'integer', 'exists:warehouses,id'],
            'to_bin_id' => ['nullable', 'integer', 'exists:bins,id'],
            'reference' => ['sometimes', 'nullable', 'string', 'max:150'],
            'reason' => ['sometimes', 'nullable', 'string', 'max:500'],
        ]);

        [$out, $in] = $this->inventory->transfer($request->user(), $part, $data);

        return response()->json(['data' => [$out, $in]], 201);
    }

    /** GET /seller/inventory/low-stock — reorder-point + out-of-stock alerts (§10). */
    public function lowStock(Request $request): JsonResponse
    {
        $validated = $request->validate(['seller_id' => $this->sellerScopeRule()]);

        $parts = Part::query()
            ->where('seller_id', $this->ownerId($request, $validated))
            ->where(function ($q) {
                $q->whereColumn('quantity', '<=', 'reorder_point')
                    ->orWhere('quantity', '<=', 0);
            })
            ->orderBy('quantity')
            ->get(['id', 'title', 'part_number', 'quantity', 'reserved_quantity', 'reorder_point', 'min_stock', 'max_stock', 'safety_stock', 'price'])
            ->map(fn ($p) => [
                'id' => $p->id,
                'title' => $p->title,
                'part_number' => $p->part_number,
                'quantity' => (int) $p->quantity,
                'available' => max(0, (int) $p->quantity - (int) $p->reserved_quantity),
                'reorder_point' => (int) $p->reorder_point,
                'safety_stock' => (int) $p->safety_stock,
                'price' => (float) $p->price,
                // Suggested top-up to reach max (or reorder point when max unset).
                'suggested_order' => max(0, ((int) ($p->max_stock ?? $p->reorder_point) - (int) $p->quantity)),
                'severity' => (int) $p->quantity <= 0 ? 'out_of_stock' : 'low',
            ]);

        return response()->json(['data' => $parts]);
    }

    /** GET /seller/inventory/summary — on-hand, valuation, movement stats (§11). */
    public function summary(Request $request): JsonResponse
    {
        $validated = $request->validate(['seller_id' => $this->sellerScopeRule()]);
        $userId = $this->ownerId($request, $validated);
        $parts = Part::query()->where('seller_id', $userId)->get();

        $onHandUnits = (int) $parts->sum('quantity');
        $valuation = (float) $parts->sum(fn ($p) => (float) $p->price * (int) $p->quantity);
        $reservedUnits = (int) $parts->sum('reserved_quantity');
        $lowCount = $parts->filter(fn ($p) => (int) $p->quantity > 0 && (int) $p->quantity <= (int) $p->reorder_point)->count();
        $outCount = $parts->filter(fn ($p) => (int) $p->quantity <= 0)->count();
        $overCount = $parts->filter(fn ($p) => $p->max_stock !== null && (int) $p->quantity > (int) $p->max_stock)->count();

        $moves = StockMovement::query()->whereHas('part', fn ($q) => $q->where('seller_id', $userId));
        $moveCounts = (clone $moves)
            ->selectRaw('type, COUNT(*) as c, SUM(ABS(quantity_change)) as units')
            ->groupBy('type')
            ->get()
            ->mapWithKeys(fn ($r) => [$r->type => ['moves' => (int) $r->c, 'units' => (int) $r->units]]);

        return response()->json(['data' => [
            'parts_tracked' => $parts->count(),
            'on_hand_units' => $onHandUnits,
            'reserved_units' => $reservedUnits,
            'available_units' => max(0, $onHandUnits - $reservedUnits),
            'stock_valuation' => round($valuation, 2),
            'low_stock_lines' => $lowCount,
            'out_of_stock_lines' => $outCount,
            'overstock_lines' => $overCount,
            'movements_by_type' => $moveCounts,
        ]]);
    }

    /** GET /seller/catalog/search — global part search (§6): number, MPN, barcode, title, brand, supplier SKU. */
    public function search(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'q' => ['required', 'string', 'min:2', 'max:120'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:50'],
            'seller_id' => $this->sellerScopeRule(),
        ]);

        $q = $validated['q'];
        $like = "%{$q}%";

        $results = Part::query()
            ->where('seller_id', $this->ownerId($request, $validated))
            ->where(fn ($w) => $w
                ->where('part_number', 'like', $like)
                ->orWhere('mpn', 'like', $like)
                ->orWhere('barcode', 'like', $like)
                ->orWhere('title', 'like', $like)
                ->orWhere('brand', 'like', $like)
                ->orWhereHas('supplierLinks', fn ($s) => $s->where('supplier_sku', 'like', $like)))
            ->with(['supplierLinks.supplier:id,name'])
            ->orderBy('title')
            ->paginate((int) ($validated['per_page'] ?? 20));

        return response()->json(['data' => $results]);
    }
}
