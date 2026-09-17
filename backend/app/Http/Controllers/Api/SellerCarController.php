<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Car\StoreCarRequest;
use App\Http\Requests\Car\UpdateCarRequest;
use App\Http\Resources\CarResource;
use App\Models\Car;
use App\Services\CarService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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
            'status' => ['sometimes', 'in:draft,active,sold,archived'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:50'],
        ]);

        $query = Car::query()
            ->ofSeller((int) $request->user()->id)
            ->when($validated['status'] ?? null, fn ($q, $s) => $q->where('status', $s))
            ->orderByDesc('created_at');

        return CarResource::collection($query->paginate((int) ($validated['per_page'] ?? 15)));
    }

    public function store(StoreCarRequest $request): JsonResponse
    {
        $car = $this->cars->create($request->user(), $request->validated());

        // Keep the `data` envelope consistent with every other car endpoint.
        return (new CarResource($car))->response()->setStatusCode(201);
    }

    public function show(Request $request, Car $car): CarResource
    {
        $this->authorize('view', $car);

        return new CarResource($car->loadMissing('seller:id,name'));
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
}
