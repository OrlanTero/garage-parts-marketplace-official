<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ReviewResource;
use App\Models\Car;
use App\Models\Order;
use App\Models\Part;
use App\Models\Review;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/**
 * Listing reviews — stars + comment on cars and parts.
 * One review per buyer per listing (create → 409 on duplicate, update own).
 * Reviewers are exposed as username + avatar only, never real names.
 */
class ReviewController extends Controller
{
    /** GET /reviews — visible reviews for a listing. */
    public function index(Request $request)
    {
        $validated = $request->validate([
            'item_type' => ['required', 'in:part,car'],
            'part_id' => ['required_if:item_type,part', 'nullable', 'integer', 'exists:parts,id'],
            'car_id' => ['required_if:item_type,car', 'nullable', 'integer', 'exists:cars,id'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:50'],
        ]);

        $query = $this->scopeFor($validated)->with('buyer:id,username,avatar_url');

        // Own review first so buyers instantly see/edit theirs.
        $userId = $request->user()?->id;
        if ($userId) {
            $query->orderByRaw('CASE WHEN buyer_id = ? THEN 0 ELSE 1 END', [$userId]);
        }

        $query->orderByDesc('created_at');

        return ReviewResource::collection($query->paginate((int) ($validated['per_page'] ?? 10)));
    }

    /** GET /reviews/summary — live average, count, star distribution. */
    public function summary(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'item_type' => ['required', 'in:part,car'],
            'part_id' => ['required_if:item_type,part', 'nullable', 'integer', 'exists:parts,id'],
            'car_id' => ['required_if:item_type,car', 'nullable', 'integer', 'exists:cars,id'],
        ]);

        $base = $this->scopeFor($validated);
        $count = (clone $base)->count();
        $average = $count > 0 ? round((float) (clone $base)->avg('rating'), 1) : 0;

        $distribution = [];
        for ($stars = 5; $stars >= 1; $stars--) {
            $distribution[$stars] = (clone $base)->where('rating', $stars)->count();
        }

        return response()->json([
            'data' => [
                'average' => $average,
                'count' => $count,
                'distribution' => $distribution,
            ],
        ]);
    }

    /** GET /reviews/mine — authenticated buyer's own review for a listing. */
    public function mine(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'item_type' => ['required', 'in:part,car'],
            'part_id' => ['required_if:item_type,part', 'nullable', 'integer', 'exists:parts,id'],
            'car_id' => ['required_if:item_type,car', 'nullable', 'integer', 'exists:cars,id'],
        ]);

        $review = Review::query()
            ->where('buyer_id', $request->user()->id)
            ->where('item_type', $validated['item_type'])
            ->when($validated['part_id'] ?? null, fn ($q, $id) => $q->where('part_id', $id))
            ->when($validated['car_id'] ?? null, fn ($q, $id) => $q->where('car_id', $id))
            ->with('buyer:id,username,avatar_url')
            ->first();

        if (!$review) {
            return response()->json(['message' => 'No review found for this listing.'], 404);
        }

        return (new ReviewResource($review))->response();
    }

    /** POST /reviews — buyer rates a live listing. */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'item_type' => ['required', 'in:part,car'],
            'part_id' => ['required_if:item_type,part', 'nullable', 'integer', 'exists:parts,id'],
            'car_id' => ['required_if:item_type,car', 'nullable', 'integer', 'exists:cars,id'],
            'rating' => ['required', 'integer', 'min:1', 'max:5'],
            'title' => ['nullable', 'string', 'max:150'],
            'body' => ['nullable', 'string', 'max:2000'],
        ]);

        $listing = $this->resolveListing($data);
        $buyer = $request->user();

        if ((int) $listing->seller_id === (int) $buyer->id) {
            throw ValidationException::withMessages([
                'item_type' => ['You cannot review your own listing.'],
            ]);
        }

        $duplicate = Review::query()
            ->where('buyer_id', $buyer->id)
            ->where('item_type', $data['item_type'])
            ->when($data['part_id'] ?? null, fn ($q, $id) => $q->where('part_id', $id))
            ->when($data['car_id'] ?? null, fn ($q, $id) => $q->where('car_id', $id))
            ->exists();

        if ($duplicate) {
            return response()->json([
                'message' => 'You already reviewed this listing. Update your existing review instead.',
                'code' => 'duplicate_review',
            ], 409);
        }

        $review = Review::create([
            'buyer_id' => $buyer->id,
            'seller_id' => $listing->seller_id,
            'item_type' => $data['item_type'],
            'part_id' => $data['part_id'] ?? null,
            'car_id' => $data['car_id'] ?? null,
            'rating' => $data['rating'],
            'title' => $data['title'] ?? null,
            'body' => $data['body'] ?? null,
            'is_verified_purchase' => $this->hasVerifiedPurchase($buyer->id, $buyer->email, $data),
            'is_visible' => true,
        ]);

        Review::refreshListingRating($review->item_type, $review->part_id, $review->car_id);

        return (new ReviewResource($review->load('buyer:id,username,avatar_url')))
            ->response()->setStatusCode(201);
    }

    /** PUT /reviews/{review} — buyer edits own review. */
    public function update(Request $request, Review $review): ReviewResource
    {
        if ((int) $review->buyer_id !== (int) $request->user()->id) {
            abort(403, 'You can only edit your own reviews.');
        }

        $data = $request->validate([
            'rating' => ['sometimes', 'integer', 'min:1', 'max:5'],
            'title' => ['sometimes', 'nullable', 'string', 'max:150'],
            'body' => ['sometimes', 'nullable', 'string', 'max:2000'],
        ]);

        $review->update($data);
        Review::refreshListingRating($review->item_type, $review->part_id, $review->car_id);

        return new ReviewResource($review->load('buyer:id,username,avatar_url'));
    }

    /** DELETE /reviews/{review} — buyer removes own review. */
    public function destroy(Request $request, Review $review): JsonResponse
    {
        if ((int) $review->buyer_id !== (int) $request->user()->id) {
            abort(403, 'You can only delete your own reviews.');
        }

        $itemType = $review->item_type;
        $partId = $review->part_id;
        $carId = $review->car_id;

        $review->delete();
        Review::refreshListingRating($itemType, $partId, $carId);

        return response()->json(['message' => 'Review deleted.']);
    }

    private function scopeFor(array $validated)
    {
        return Review::query()
            ->where('is_visible', true)
            ->where('item_type', $validated['item_type'])
            ->when($validated['part_id'] ?? null, fn ($q, $id) => $q->where('part_id', $id))
            ->when($validated['car_id'] ?? null, fn ($q, $id) => $q->where('car_id', $id));
    }

    private function resolveListing(array $data): Car|Part
    {
        $listing = $data['item_type'] === 'car'
            ? Car::find($data['car_id'])
            : Part::find($data['part_id']);

        abort_if(!$listing, 404, 'Listing not found.');

        return $listing;
    }

    /** Verified badge when the buyer has a completed/accepted order for it. */
    private function hasVerifiedPurchase(int $buyerId, ?string $email, array $data): bool
    {
        return Order::query()
            ->where(function ($q) use ($buyerId, $email) {
                $q->where('user_id', $buyerId);
                if ($email) {
                    $q->orWhere('buyer_email', $email);
                }
            })
            ->where('item_type', $data['item_type'])
            ->when($data['part_id'] ?? null, fn ($q, $id) => $q->where('part_id', $id))
            ->when($data['car_id'] ?? null, fn ($q, $id) => $q->where('car_id', $id))
            ->whereIn('verification_status', ['accepted'])
            ->exists();
    }
}
