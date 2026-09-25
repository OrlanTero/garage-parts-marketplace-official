<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Supplier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Supplier / vendor management (§4). Owner-scoped; admins see everything
 * only through explicit owner assignment (suppliers belong to sellers).
 */
class SupplierController extends Controller
{
    public function index(Request $request)
    {
        $validated = $request->validate([
            'seller_id' => ['sometimes', 'integer', 'exists:users,id'],
        ]);

        $ownerId = app(\App\Services\InventoryService::class)
            ->ownerScope($request->user(), $validated['seller_id'] ?? null);

        $query = Supplier::query()
            ->where('owner_id', $ownerId)
            ->withCount('partLinks')
            ->when($request->query('search'), fn ($q, $s) => $q->where(fn ($w) => $w
                ->where('name', 'like', "%{$s}%")
                ->orWhere('email', 'like', "%{$s}%")))
            ->when($request->has('is_active'), fn ($q) => $q->where('is_active', $request->boolean('is_active')))
            ->orderBy('name');

        return response()->json(['data' => $query->paginate((int) $request->query('per_page', 20))]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->rules($request);

        // Sellers own their record; admins file under the house catalog
        // unless explicitly auditing another seller.
        $ownerId = app(\App\Services\InventoryService::class)
            ->ownerScope($request->user(), $data['seller_id'] ?? null);
        unset($data['seller_id']);

        $supplier = Supplier::create([...$data, 'owner_id' => $ownerId]);

        return response()->json(['data' => $supplier->loadCount('partLinks')], 201);
    }

    public function show(Request $request, Supplier $supplier): JsonResponse
    {
        $this->ensureOwner($request, $supplier);

        return response()->json(['data' => $supplier->loadCount('partLinks')]);
    }

    public function update(Request $request, Supplier $supplier): JsonResponse
    {
        $this->ensureOwner($request, $supplier);

        $supplier->update($this->rules($request));

        return response()->json(['data' => $supplier->refresh()->loadCount('partLinks')]);
    }

    public function destroy(Request $request, Supplier $supplier): JsonResponse
    {
        $this->ensureOwner($request, $supplier);
        $supplier->delete();

        return response()->json(['message' => 'Supplier deleted. Catalog links removed.']);
    }

    private function rules(Request $request): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'contact_person' => ['nullable', 'string', 'max:150'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'address' => ['nullable', 'string', 'max:500'],
            'city' => ['nullable', 'string', 'max:120'],
            'lead_time_days' => ['sometimes', 'integer', 'min:0', 'max:3650'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'is_active' => ['sometimes', 'boolean'],
            'seller_id' => ['sometimes', 'integer', 'exists:users,id'],
        ]);
    }

    private function ensureOwner(Request $request, Supplier $supplier): void
    {
        $user = $request->user();
        if ((int) $supplier->owner_id !== (int) $user->id && !$user->isAdmin()) {
            abort(403, 'You can only manage your own suppliers.');
        }
    }
}
