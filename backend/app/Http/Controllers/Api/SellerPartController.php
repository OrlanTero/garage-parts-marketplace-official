<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Part\StorePartRequest;
use App\Http\Requests\Part\UpdatePartRequest;
use App\Http\Resources\PartResource;
use App\Models\Part;
use App\Services\PartService;
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
        $part = $this->parts->create($request->user(), $request->validated());

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
}
