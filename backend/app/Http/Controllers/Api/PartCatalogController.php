<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Part;
use App\Models\PartRelation;
use App\Models\PartSerial;
use App\Models\PartSupplier;
use App\Models\Supplier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Catalog extensions per part (§1 master data, §4 supplier links,
 * §5 relationships, serialized units). All owner-scoped.
 */
class PartCatalogController extends Controller
{
    private function part(Request $request, Part $part): Part
    {
        $user = $request->user();
        if ((int) $part->seller_id !== (int) $user->id && !$user->isAdmin()) {
            abort(403, 'You can only manage your own parts catalog.');
        }

        return $part;
    }

    // ---------- Supplier links ----------

    /** GET /seller/parts/{part}/suppliers */
    public function suppliers(Request $request, Part $part): JsonResponse
    {
        $this->part($request, $part);

        return response()->json(['data' => $part->supplierLinks()->with('supplier:id,name,lead_time_days')->get()]);
    }

    /** POST /seller/parts/{part}/suppliers */
    public function linkSupplier(Request $request, Part $part): JsonResponse
    {
        $this->part($request, $part);

        $data = $request->validate([
            'supplier_id' => ['required', 'integer', 'exists:suppliers,id'],
            'supplier_sku' => ['nullable', 'string', 'max:120'],
            'cost_price' => ['nullable', 'numeric', 'min:0'],
            'lead_time_days' => ['nullable', 'integer', 'min:0', 'max:3650'],
            'moq' => ['sometimes', 'integer', 'min:1'],
            'is_preferred' => ['sometimes', 'boolean'],
        ]);

        $supplier = Supplier::findOrFail($data['supplier_id']);
        if ((int) $supplier->owner_id !== (int) $request->user()->id && !$request->user()->isAdmin()) {
            abort(403, 'Supplier belongs to another account.');
        }

        if (!empty($data['is_preferred'])) {
            PartSupplier::where('part_id', $part->id)->update(['is_preferred' => false]);
        }

        $link = PartSupplier::updateOrCreate(
            ['part_id' => $part->id, 'supplier_id' => $data['supplier_id']],
            $data
        );

        return response()->json(['data' => $link->load('supplier:id,name')], 201);
    }

    /** DELETE /seller/parts/{part}/suppliers/{supplier} */
    public function unlinkSupplier(Request $request, Part $part, Supplier $supplier): JsonResponse
    {
        $this->part($request, $part);
        PartSupplier::where('part_id', $part->id)->where('supplier_id', $supplier->id)->delete();

        return response()->json(['message' => 'Supplier unlinked.']);
    }

    // ---------- Relationships (§5) ----------

    /** GET /seller/parts/{part}/relations */
    public function relations(Request $request, Part $part): JsonResponse
    {
        $this->part($request, $part);

        return response()->json(['data' => $part->relations()->with('relatedPart:id,title,part_number,price,quantity')->get()]);
    }

    /** POST /seller/parts/{part}/relations */
    public function linkRelation(Request $request, Part $part): JsonResponse
    {
        $this->part($request, $part);

        $data = $request->validate([
            'related_part_id' => ['required', 'integer', 'exists:parts,id'],
            'relation_type' => ['required', 'string', Rule::in(PartRelation::TYPES)],
            'quantity' => ['sometimes', 'numeric', 'min:0.001'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        if ((int) $data['related_part_id'] === (int) $part->id) {
            abort(422, 'A part cannot relate to itself.');
        }

        $related = Part::findOrFail($data['related_part_id']);
        if ((int) $related->seller_id !== (int) $request->user()->id && !$request->user()->isAdmin()) {
            abort(403, 'Related part belongs to another account.');
        }

        $relation = PartRelation::updateOrCreate(
            ['part_id' => $part->id, 'related_part_id' => $data['related_part_id'], 'relation_type' => $data['relation_type']],
            ['quantity' => $data['quantity'] ?? 1, 'notes' => $data['notes'] ?? null]
        );

        return response()->json(['data' => $relation->load('relatedPart:id,title,part_number')], 201);
    }

    /** DELETE /seller/parts/{part}/relations/{relation} */
    public function unlinkRelation(Request $request, Part $part, PartRelation $relation): JsonResponse
    {
        $this->part($request, $part);
        if ((int) $relation->part_id !== (int) $part->id) {
            abort(404);
        }
        $relation->delete();

        return response()->json(['message' => 'Relation removed.']);
    }

    // ---------- Serials ----------

    /** GET /seller/parts/{part}/serials */
    public function serials(Request $request, Part $part): JsonResponse
    {
        $this->part($request, $part);

        return response()->json(['data' => $part->serials()->with(['warehouse:id,name,code', 'bin:id,code'])->orderBy('serial')->get()]);
    }

    /** POST /seller/parts/{part}/serials — register one or many serials. */
    public function storeSerials(Request $request, Part $part): JsonResponse
    {
        $this->part($request, $part);

        $data = $request->validate([
            'serials' => ['required', 'array', 'min:1', 'max:500'],
            'serials.*' => ['required', 'string', 'max:120', 'distinct'],
            'warehouse_id' => ['nullable', 'integer', 'exists:warehouses,id'],
            'bin_id' => ['nullable', 'integer', 'exists:bins,id'],
        ]);

        $created = [];
        foreach ($data['serials'] as $serial) {
            $created[] = PartSerial::firstOrCreate(
                ['part_id' => $part->id, 'serial' => $serial],
                [
                    'status' => 'in_stock',
                    'warehouse_id' => $data['warehouse_id'] ?? null,
                    'bin_id' => $data['bin_id'] ?? null,
                ]
            );
        }

        return response()->json(['data' => $created], 201);
    }

    /** PATCH /seller/serials/{serial} — change unit status/location. */
    public function updateSerial(Request $request, PartSerial $serial): JsonResponse
    {
        $this->part($request, $serial->part);

        $data = $request->validate([
            'status' => ['sometimes', 'string', Rule::in(PartSerial::STATUSES)],
            'warehouse_id' => ['nullable', 'integer', 'exists:warehouses,id'],
            'bin_id' => ['nullable', 'integer', 'exists:bins,id'],
        ]);

        $serial->update($data);

        return response()->json(['data' => $serial->refresh()]);
    }
}
