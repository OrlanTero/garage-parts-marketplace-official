<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Car;
use App\Models\Part;
use App\Models\RestockSubscription;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RestockController extends Controller
{
    /** GET /restocks — my active restock alerts. */
    public function index(Request $request): JsonResponse
    {
        $subs = RestockSubscription::query()
            ->where('user_id', $request->user()->id)
            ->latest()
            ->get()
            ->map(fn (RestockSubscription $sub) => $this->serialize($sub));

        return response()->json(['status' => 'success', 'data' => $subs]);
    }

    /** POST /restocks — subscribe to a sold-out listing. */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'listing_type' => ['required', 'string', 'in:car,part'],
            'listing_id' => ['required', 'integer', 'min:1'],
        ]);

        $listing = $data['listing_type'] === 'car'
            ? Car::find($data['listing_id'])
            : Part::find($data['listing_id']);
        if (!$listing) {
            abort(404, 'Listing not found.');
        }

        $sub = RestockSubscription::firstOrCreate([
            'user_id' => $request->user()->id,
            'listing_type' => $data['listing_type'],
            'listing_id' => (int) $data['listing_id'],
        ]);

        return (response()->json([
            'status' => 'success',
            'data' => $this->serialize($sub->refresh()),
        ]))->setStatusCode(201);
    }

    /** DELETE /restocks/{subscription} — unsubscribe. */
    public function destroy(Request $request, RestockSubscription $subscription): JsonResponse
    {
        if ((int) $subscription->user_id !== (int) $request->user()->id) {
            abort(403, 'This restock alert belongs to another user.');
        }
        $subscription->delete();

        return response()->json(['status' => 'success', 'message' => 'Restock alert removed.']);
    }

    private function serialize(RestockSubscription $sub): array
    {
        $listing = $sub->listing_type === 'car'
            ? Car::select('id', 'uuid', 'title', 'price', 'status', 'quantity', 'primary_image_url')->find($sub->listing_id)
            : Part::select('id', 'uuid', 'title', 'price', 'status', 'quantity', 'primary_image_url')->find($sub->listing_id);

        return [
            'id' => $sub->id,
            'listing_type' => $sub->listing_type,
            'listing_id' => $sub->listing_id,
            'listing' => $listing ? [
                'id' => $listing->id,
                'uuid' => $listing->uuid ?? null,
                'title' => $listing->title,
                'price' => (float) $listing->price,
                'status' => is_object($listing->status) ? $listing->status->value : $listing->status,
                'quantity' => $listing->quantity,
                'primary_image_url' => $listing->primary_image_url,
                'url' => $sub->listing_type === 'car'
                    ? '/marketplace/' . ($listing->uuid ?? $listing->id)
                    : '/parts/' . ($listing->uuid ?? $listing->id),
            ] : null,
            'created_at' => $sub->created_at?->toIso8601String(),
        ];
    }
}
