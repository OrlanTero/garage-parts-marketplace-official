<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Car\StoreCarRequest;
use App\Http\Requests\Car\UpdateCarRequest;
use App\Http\Resources\CarResource;
use App\Models\Car;
use App\Models\User;
use App\Services\CarService;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/**
 * Seller inventory — auth + role:seller,admin.
 * Ownership enforced by CarPolicy (owner or admin).
 */
class SellerCarController extends Controller
{
    public function __construct(private CarService $cars) {}

    public function index(Request $request)
    {
        $validated = $request->validate([
            'status' => ['sometimes', 'in:draft,pending_inspection,inspected,active,rejected,sold,archived'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:50'],
        ]);

        $query = Car::query()
            ->ofSeller((int) $request->user()->id)
            ->with('media')
            ->withCount('heldOrders')
            ->when($validated['status'] ?? null, fn ($q, $s) => $q->where('status', $s))
            ->orderByDesc('created_at');

        return CarResource::collection($query->paginate((int) ($validated['per_page'] ?? 15)));
    }

    public function store(StoreCarRequest $request): JsonResponse
    {
        $user = $request->user();

        if ($user->isPartsSeller()) {
            return response()->json([
                'message' => 'Parts Sellers are authorized to list auto parts only. Vehicle builds must be listed by Sellers or Dealers.',
            ], 403);
        }

        $this->ensureKycVerified($user);

        $car = $this->cars->create($user, $request->validated());

        // Keep the `data` envelope consistent with every other car endpoint.
        return (new CarResource($car))->response()->setStatusCode(201);
    }

    public function show(Request $request, Car $car): CarResource
    {
        $this->authorize('view', $car);

        return new CarResource($car->loadMissing(['seller:id,name', 'media'])->loadCount('heldOrders'));
    }

    public function update(UpdateCarRequest $request, Car $car): CarResource
    {
        $this->authorize('update', $car);

        return new CarResource($this->cars->update($car, $request->validated()));
    }

    public function destroy(Request $request, Car $car): JsonResponse
    {
        $this->authorize('delete', $car);
        $car->delete();

        return response()->json(['message' => 'Car deleted.']);
    }

    public function publish(Request $request, Car $car): CarResource
    {
        $this->authorize('update', $car);
        $this->ensureKycVerified($request->user());

        return new CarResource($this->cars->publish($car));
    }

    public function unpublish(Request $request, Car $car): CarResource
    {
        $this->authorize('update', $car);

        return new CarResource($this->cars->unpublish($car));
    }

    public function markSold(Request $request, Car $car): CarResource
    {
        $this->authorize('update', $car);

        return new CarResource($this->cars->markSold($car));
    }

    /**
     * Submit a build for inspection (garage drop-off or on-site visit).
     * This is the ONLY way a draft/archived/rejected car enters the
     * verification queue — sellers can never self-publish to active.
     */
    public function submitInspection(Request $request, Car $car): JsonResponse
    {
        $this->authorize('update', $car);

        $data = $request->validate([
            'inspection_type' => ['sometimes', 'string', 'in:garage_dropoff,onsite_visit'],
        ]);

        $updated = $this->cars->submitInspection($car, $data['inspection_type'] ?? 'garage_dropoff');

        try {
            $adminIds = \App\Models\User::query()->whereIn('role', ['admin', 'super_admin'])->pluck('id')->all();
            app(\App\Services\NotificationService::class)->sendMany(
                $adminIds,
                'listing',
                "Inspection requested: {$updated->title}",
                "Seller submitted a build for " . (($data['inspection_type'] ?? 'garage_dropoff') === 'onsite_visit' ? 'on-site visit' : 'garage drop-off') . ' — assign an inspector.',
                ['car_id' => $updated->id, 'inspection_type' => $updated->inspection_type],
                '/admin/listings',
            );
        } catch (\Throwable $e) {
            report($e);
        }

        return (new CarResource($updated))->response()->setStatusCode(200);
    }

    /**
     * Set seller-manageable status: draft/archived/sold. `active` is
     * NOT seller-settable — a build goes live only through the
     * inspection flow (submit → inspect → approve). Inspection &
     * moderation states stay house-managed and are rejected here.
     */
    public function setStatus(Request $request, Car $car): CarResource
    {
        $this->authorize('update', $car);

        $data = $request->validate([
            'status' => ['required', 'string', 'in:draft,active,archived,sold'],
        ]);

        if ($data['status'] === 'active') {
            throw ValidationException::withMessages([
                'status' => ['Listings go live only after passing inspection. Submit this build for inspection first.'],
            ]);
        }

        $current = $car->status instanceof \App\Enums\CarStatus
            ? $car->status->value
            : (string) $car->status;

        if ($data['status'] === $current) {
            return new CarResource($car->refresh());
        }

        if ($data['status'] === 'sold') {
            return new CarResource($this->cars->markSold($car));
        }

        if (in_array($current, ['pending_inspection', 'inspected', 'rejected'], true)) {
            throw ValidationException::withMessages([
                'status' => ['Inspection and moderation states are managed by the house.'],
            ]);
        }

        $prev = $current;
        $car->forceFill(['status' => $data['status']])->save();
        $car = $car->refresh();
        event(new \App\Events\CarStatusChanged($car, $prev));

        return new CarResource($car);
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
                'message' => 'KYC verification is required before listing vehicles. Complete Seller KYC & Verification to unlock selling.',
                'code' => 'kyc_verification_required',
            ], 403));
        }
    }
}
