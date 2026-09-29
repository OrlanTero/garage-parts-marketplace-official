<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Part\StorePartRequest;
use App\Http\Requests\Part\UpdatePartRequest;
use App\Http\Resources\PartResource;
use App\Models\Part;
use App\Models\User;
use App\Services\PartService;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/**
 * Seller inventory — auth + role:seller,admin.
 * Ownership enforced by PartPolicy (owner or admin).
 */
class SellerPartController extends Controller
{
    public function __construct(private PartService $parts) {}

    public function index(Request $request)
    {
        $validated = $request->validate([
            'status' => ['sometimes', 'in:draft,active,sold,archived'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:50'],
            // Admins auditing the catalog may scope to any seller.
            'seller_id' => ['sometimes', 'integer', 'exists:users,id'],
            'q' => ['sometimes', 'nullable', 'string', 'max:120'],
            'category' => ['sometimes', 'nullable', 'string', 'max:60'],
        ]);

        $ownerId = app(\App\Services\InventoryService::class)
            ->ownerScope($request->user(), $validated['seller_id'] ?? null);

        $query = Part::query()
            ->ofSeller($ownerId)
            ->with('media')
            ->withCount('heldOrders')
            ->when($validated['status'] ?? null, fn ($q, $s) => $q->where('status', $s))
            ->when($validated['category'] ?? null, fn ($q, $c) => $q->where('category', $c))
            ->when($validated['q'] ?? null, function ($q, $s) {
                $like = "%{$s}%";
                $q->where(fn ($inner) => $inner
                    ->where('title', 'like', $like)
                    ->orWhere('brand', 'like', $like)
                    ->orWhere('part_number', 'like', $like)
                    ->orWhere('mpn', 'like', $like)
                    ->orWhere('barcode', 'like', $like));
            })
            ->orderByDesc('created_at');

        return PartResource::collection($query->paginate((int) ($validated['per_page'] ?? 15)));
    }

    public function store(StorePartRequest $request): JsonResponse
    {
        $user = $request->user();

        // Parts are sold exclusively by the house garage (GAP Valenzuela
        // Main). Third-party sellers/dealers list vehicles only; admins
        // create parts on the house catalog.
        if (!$user->isHouse() && !$user->isAdmin()) {
            return response()->json([
                'message' => 'Car parts are sold exclusively by GAP Valenzuela Main. Your account may list vehicles only.',
                'code' => 'house_catalog_only',
            ], 403);
        }

        $this->ensureKycVerified($user);

        // Admins publish onto the house catalog, never their own account.
        $owner = $user;
        if ($user->isAdmin() && ($house = \App\Models\User::house())) {
            $owner = $house;
        }

        // Non-house sellers never reach here, but force house ownership
        // for consistency when admins publish on its behalf.
        $part = $this->parts->create($owner, $request->validated());

        // Keep the `data` envelope consistent with every other part endpoint.
        return (new PartResource($part))->response()->setStatusCode(201);
    }

    public function show(Request $request, Part $part): PartResource
    {
        $this->authorize('view', $part);

        return new PartResource($part->loadMissing(['seller:id,name', 'media'])->loadCount('heldOrders'));
    }

    public function update(UpdatePartRequest $request, Part $part): PartResource
    {
        $this->authorize('update', $part);

        return new PartResource($this->parts->update($part, $request->validated()));
    }

    public function destroy(Request $request, Part $part): JsonResponse
    {
        $this->authorize('delete', $part);
        $part->delete();

        return response()->json(['message' => 'Part deleted.']);
    }

    public function publish(Request $request, Part $part): PartResource
    {
        $this->authorize('update', $part);
        $this->ensureKycVerified($request->user());

        return new PartResource($this->parts->publish($part));
    }

    public function unpublish(Request $request, Part $part): PartResource
    {
        $this->authorize('update', $part);

        return new PartResource($this->parts->unpublish($part));
    }

    public function markSold(Request $request, Part $part): PartResource
    {
        $this->authorize('update', $part);

        return new PartResource($this->parts->markSold($part));
    }

    /**
     * Set any seller-manageable status: draft/active/archived/sold.
     * Routes through the guarded transitions (publish/markSold) where
     * they apply.
     */
    public function setStatus(Request $request, Part $part): PartResource
    {
        $this->authorize('update', $part);

        $data = $request->validate([
            'status' => ['required', 'string', 'in:draft,active,archived,sold'],
        ]);

        $current = $part->status instanceof \App\Enums\PartStatus
            ? $part->status->value
            : (string) $part->status;

        if ($data['status'] === $current) {
            return new PartResource($part->refresh());
        }

        if ($data['status'] === 'active') {
            $this->ensureKycVerified($request->user());

            return new PartResource($this->parts->publish($part));
        }

        if ($data['status'] === 'sold') {
            return new PartResource($this->parts->markSold($part));
        }

        $prev = $current;
        $part->forceFill(['status' => $data['status']])->save();
        $part = $part->refresh();
        event(new \App\Events\PartStatusChanged($part, $prev));

        return new PartResource($part);
    }

    /**
     * Security gate: seller-role accounts must hold a verified KYC badge
     * before creating or publishing listings. Staff/admins are exempt.
     */
    private function ensureKycVerified(User $user): void
    {
        if ($user->isAdmin() || $user->isInspector()) {
            return;
        }

        if (!$user->isKycVerified()) {
            throw new HttpResponseException(response()->json([
                'message' => 'KYC verification is required before listing auto parts. Complete Seller KYC & Verification to unlock selling.',
                'code' => 'kyc_verification_required',
            ], 403));
        }
    }
}
