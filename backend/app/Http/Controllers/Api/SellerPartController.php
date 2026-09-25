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
        ]);

        $query = Part::query()
            ->ofSeller((int) $request->user()->id)
            ->with('media')
            ->when($validated['status'] ?? null, fn ($q, $s) => $q->where('status', $s))
            ->orderByDesc('created_at');

        return PartResource::collection($query->paginate((int) ($validated['per_page'] ?? 15)));
    }

    public function store(StorePartRequest $request): JsonResponse
    {
        $user = $request->user();

        if ($user->isSeller()) {
            return response()->json([
                'message' => 'Standard Sellers are authorized to list vehicle builds only. Garage or Sales Team role is required to list auto parts.',
            ], 403);
        }

        $this->ensureKycVerified($user);

        $part = $this->parts->create($user, $request->validated());

        // Keep the `data` envelope consistent with every other part endpoint.
        return (new PartResource($part))->response()->setStatusCode(201);
    }

    public function show(Request $request, Part $part): PartResource
    {
        $this->authorize('view', $part);

        return new PartResource($part->loadMissing(['seller:id,name', 'media']));
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
