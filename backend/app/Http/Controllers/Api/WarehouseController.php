<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Bin;
use App\Models\Warehouse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Warehouse → Zone → Rack → Shelf → Bin hierarchy (§8).
 * First warehouse becomes default; deleting the default promotes another.
 */
class WarehouseController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'seller_id' => ['sometimes', 'integer', 'exists:users,id'],
        ]);

        $ownerId = app(\App\Services\InventoryService::class)
            ->ownerScope($request->user(), $validated['seller_id'] ?? null);

        $warehouses = Warehouse::query()
            ->where('owner_id', $ownerId)
            ->with(['bins' => fn ($q) => $q->orderBy('code')])
            ->withCount('movements')
            ->orderByDesc('is_default')
            ->orderBy('name')
            ->get()
            ->map(fn ($w) => $this->serialize($w));

        return response()->json(['data' => $warehouses]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'code' => ['required', 'string', 'max:30', Rule::unique('warehouses')->where(fn ($q) => $q->where('owner_id', $request->user()->id))],
            'address' => ['nullable', 'string', 'max:500'],
            'city' => ['nullable', 'string', 'max:120'],
            'is_default' => ['sometimes', 'boolean'],
            'is_active' => ['sometimes', 'boolean'],
            'seller_id' => ['sometimes', 'integer', 'exists:users,id'],
        ]);

        // Sellers own their record; admins file under the house catalog
        // unless explicitly auditing another seller.
        $userId = app(\App\Services\InventoryService::class)
            ->ownerScope($request->user(), $data['seller_id'] ?? null);
        unset($data['seller_id']);

        // Scoped uniqueness follows the effective owner.
        $exists = Warehouse::where('owner_id', $userId)->where('code', $data['code'])->exists();
        if ($exists) {
            throw ValidationException::withMessages(['code' => ['This warehouse code is already used.']]);
        }

        $isFirst = !Warehouse::where('owner_id', $userId)->exists();

        $warehouse = DB::transaction(function () use ($data, $userId, $isFirst) {
            $makeDefault = $isFirst || ($data['is_default'] ?? false);
            if ($makeDefault) {
                Warehouse::where('owner_id', $userId)->update(['is_default' => false]);
            }

            return Warehouse::create([...$data, 'owner_id' => $userId, 'is_default' => $makeDefault]);
        });

        return response()->json(['data' => $this->serialize($warehouse->load('bins'))], 201);
    }

    public function update(Request $request, Warehouse $warehouse): JsonResponse
    {
        $this->ensureOwner($request, $warehouse);

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:150'],
            'code' => ['sometimes', 'string', 'max:30', Rule::unique('warehouses')->where(fn ($q) => $q->where('owner_id', $request->user()->id))->ignore($warehouse->id)],
            'address' => ['nullable', 'string', 'max:500'],
            'city' => ['nullable', 'string', 'max:120'],
            'is_default' => ['sometimes', 'boolean'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        DB::transaction(function () use ($request, $warehouse, $data) {
            if (!empty($data['is_default'])) {
                Warehouse::where('owner_id', $request->user()->id)
                    ->where('id', '!=', $warehouse->id)
                    ->update(['is_default' => false]);
            }
            unset($data['is_default']);
            $warehouse->update($data);
        });

        return response()->json(['data' => $this->serialize($warehouse->refresh()->load('bins'))]);
    }

    public function destroy(Request $request, Warehouse $warehouse): JsonResponse
    {
        $this->ensureOwner($request, $warehouse);

        $wasDefault = (bool) $warehouse->is_default;
        $warehouse->delete();

        if ($wasDefault) {
            $next = Warehouse::where('owner_id', $request->user()->id)->first();
            $next?->forceFill(['is_default' => true])->save();
        }

        return response()->json(['message' => 'Warehouse deleted with its bins.']);
    }

    /** POST /seller/warehouses/{warehouse}/bins — add a bin location. */
    public function storeBin(Request $request, Warehouse $warehouse): JsonResponse
    {
        $this->ensureOwner($request, $warehouse);

        $data = $request->validate([
            'code' => ['required', 'string', 'max:40', Rule::unique('bins')->where(fn ($q) => $q->where('warehouse_id', $warehouse->id))],
            'zone' => ['nullable', 'string', 'max:40'],
            'rack' => ['nullable', 'string', 'max:40'],
            'shelf' => ['nullable', 'string', 'max:40'],
            'name' => ['nullable', 'string', 'max:150'],
            'capacity' => ['nullable', 'integer', 'min:1'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $bin = $warehouse->bins()->create($data);

        return response()->json(['data' => $this->serializeBin($bin)], 201);
    }

    /** DELETE /seller/bins/{bin} — remove a bin location. */
    public function destroyBin(Request $request, Bin $bin): JsonResponse
    {
        $this->ensureOwner($request, $bin->warehouse);
        $bin->delete();

        return response()->json(['message' => 'Bin deleted.']);
    }

    private function ensureOwner(Request $request, Warehouse $warehouse): void
    {
        $user = $request->user();
        if ((int) $warehouse->owner_id !== (int) $user->id && !$user->isAdmin()) {
            abort(403, 'You can only manage your own warehouses.');
        }
    }

    private function serialize(Warehouse $w): array
    {
        return [
            'id' => $w->id,
            'name' => $w->name,
            'code' => $w->code,
            'address' => $w->address,
            'city' => $w->city,
            'is_default' => (bool) $w->is_default,
            'is_active' => (bool) $w->is_active,
            'movements_count' => (int) ($w->movements_count ?? 0),
            'bins' => ($w->relationLoaded('bins') ? $w->bins : collect())->map(fn ($b) => $this->serializeBin($b))->values()->all(),
        ];
    }

    private function serializeBin(Bin $b): array
    {
        return [
            'id' => $b->id,
            'warehouse_id' => $b->warehouse_id,
            'code' => $b->code,
            'zone' => $b->zone,
            'rack' => $b->rack,
            'shelf' => $b->shelf,
            'name' => $b->name,
            'path' => $b->path,
            'capacity' => $b->capacity,
            'is_active' => (bool) $b->is_active,
        ];
    }
}
