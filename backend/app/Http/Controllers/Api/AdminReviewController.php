<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ReviewResource;
use App\Models\Review;
use Illuminate\Http\Request;

/**
 * Staff review moderation — audit listing reviews, hide spam/abuse.
 * Reviewer identity stays username + avatar only, even for staff views.
 */
class AdminReviewController extends Controller
{
    /** GET /admin/reviews — all reviews with listing + reviewer context. */
    public function index(Request $request)
    {
        $validated = $request->validate([
            'visibility' => ['sometimes', 'in:visible,hidden'],
            'item_type' => ['sometimes', 'in:part,car'],
            'search' => ['sometimes', 'string', 'max:120'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:50'],
        ]);

        $query = Review::query()
            ->with(['buyer:id,username,avatar_url', 'part:id,title', 'car:id,title'])
            ->when($validated['visibility'] ?? null,
                fn ($q, $v) => $q->where('is_visible', $v === 'visible'))
            ->when($validated['item_type'] ?? null,
                fn ($q, $t) => $q->where('item_type', $t))
            ->when($validated['search'] ?? null, function ($q, $s) {
                $like = "%{$s}%";
                $q->where(fn ($inner) => $inner
                    ->where('title', 'like', $like)
                    ->orWhere('body', 'like', $like));
            })
            ->orderByDesc('created_at');

        return ReviewResource::collection($query->paginate((int) ($validated['per_page'] ?? 20)));
    }

    /** POST /admin/reviews/{review}/visibility — hide or restore. */
    public function setVisibility(Request $request, Review $review): ReviewResource
    {
        $data = $request->validate([
            'is_visible' => ['required', 'boolean'],
        ]);

        $review->forceFill(['is_visible' => $data['is_visible']])->save();
        Review::refreshListingRating($review->item_type, $review->part_id, $review->car_id);

        return new ReviewResource($review->load(['buyer:id,username,avatar_url', 'part:id,title', 'car:id,title']));
    }
}
