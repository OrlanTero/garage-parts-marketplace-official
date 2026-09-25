<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\OfferResource;
use App\Models\Car;
use App\Models\Offer;
use App\Models\Part;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/**
 * Buyer price offers (amount + comment) on car/part listings.
 * Buyer side: create / my offers / withdraw.
 * Seller side: incoming / accept / reject (accepting one offer
 * auto-rejects the other pending offers on the same listing).
 */
class OfferController extends Controller
{
    /** POST /offers — buyer makes an offer on a listing. */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'item_type' => ['required', 'in:part,car'],
            'part_id' => ['required_if:item_type,part', 'nullable', 'integer', 'exists:parts,id'],
            'car_id' => ['required_if:item_type,car', 'nullable', 'integer', 'exists:cars,id'],
            'amount' => ['required', 'numeric', 'min:1', 'max:9999999999.99'],
            'message' => ['nullable', 'string', 'max:1000'],
        ]);

        $listing = $data['item_type'] === 'car'
            ? Car::find($data['car_id'])
            : Part::find($data['part_id']);

        if (!$listing) {
            abort(404, 'Listing not found.');
        }

        if (($listing->status->value ?? (string) $listing->status) !== 'active') {
            throw ValidationException::withMessages([
                'item_type' => ['Offers can only be made on live marketplace listings.'],
            ]);
        }

        $buyer = $request->user();

        if ((int) $listing->seller_id === (int) $buyer->id) {
            throw ValidationException::withMessages([
                'item_type' => ['You cannot make an offer on your own listing.'],
            ]);
        }

        $duplicate = Offer::query()
            ->where('buyer_id', $buyer->id)
            ->where('item_type', $data['item_type'])
            ->when($data['part_id'] ?? null, fn ($q, $id) => $q->where('part_id', $id))
            ->when($data['car_id'] ?? null, fn ($q, $id) => $q->where('car_id', $id))
            ->where('status', 'pending')
            ->exists();

        if ($duplicate) {
            return response()->json([
                'message' => 'You already have a pending offer on this listing. Withdraw it before offering again.',
                'code' => 'duplicate_pending_offer',
            ], 409);
        }

        $offer = Offer::create([
            'buyer_id' => $buyer->id,
            'seller_id' => $listing->seller_id,
            'item_type' => $data['item_type'],
            'part_id' => $data['part_id'] ?? null,
            'car_id' => $data['car_id'] ?? null,
            'amount' => $data['amount'],
            'message' => $data['message'] ?? null,
            'status' => 'pending',
        ]);

        return (new OfferResource($offer->load(['buyer', 'seller', 'part', 'car'])))
            ->response()->setStatusCode(201);
    }

    /** GET /offers — buyer's own offers. */
    public function mine(Request $request)
    {
        $validated = $request->validate([
            'status' => ['sometimes', 'in:pending,accepted,rejected,withdrawn'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:50'],
        ]);

        $query = Offer::query()
            ->where('buyer_id', $request->user()->id)
            ->with(['part:id,title,price', 'car:id,title,price', 'seller:id,name'])
            ->when($validated['status'] ?? null, fn ($q, $s) => $q->where('status', $s))
            ->orderByDesc('created_at');

        return OfferResource::collection($query->paginate((int) ($validated['per_page'] ?? 15)));
    }

    /** POST /offers/{offer}/withdraw — buyer cancels own pending offer. */
    public function withdraw(Request $request, Offer $offer): OfferResource
    {
        if ((int) $offer->buyer_id !== (int) $request->user()->id) {
            abort(403, 'You can only withdraw your own offers.');
        }

        if ($offer->status !== 'pending') {
            throw ValidationException::withMessages([
                'status' => ['Only pending offers can be withdrawn.'],
            ]);
        }

        $offer->forceFill(['status' => 'withdrawn'])->save();

        return new OfferResource($offer->refresh());
    }

    /** GET /seller/offers — incoming offers on my listings. */
    public function incoming(Request $request)
    {
        $validated = $request->validate([
            'status' => ['sometimes', 'in:pending,accepted,rejected,withdrawn'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:50'],
        ]);

        $query = Offer::query()
            ->where('seller_id', $request->user()->id)
            ->with(['part:id,title,price', 'car:id,title,price', 'buyer:id,name,username,avatar_url'])
            ->when($validated['status'] ?? null, fn ($q, $s) => $q->where('status', $s))
            ->orderByDesc('created_at');

        return OfferResource::collection($query->paginate((int) ($validated['per_page'] ?? 15)));
    }

    /** POST /seller/offers/{offer}/accept — accept one, auto-reject the rest. */
    public function accept(Request $request, Offer $offer): OfferResource
    {
        $this->ensureSeller($request, $offer);

        if ($offer->status !== 'pending') {
            throw ValidationException::withMessages([
                'status' => ['Only pending offers can be accepted.'],
            ]);
        }

        $data = $request->validate([
            'seller_note' => ['sometimes', 'nullable', 'string', 'max:500'],
        ]);

        $offer->forceFill([
            'status' => 'accepted',
            'seller_note' => $data['seller_note'] ?? null,
        ])->save();

        Offer::query()
            ->where('id', '!=', $offer->id)
            ->where('status', 'pending')
            ->where('item_type', $offer->item_type)
            ->when($offer->part_id, fn ($q) => $q->where('part_id', $offer->part_id))
            ->when($offer->car_id, fn ($q) => $q->where('car_id', $offer->car_id))
            ->update([
                'status' => 'rejected',
                'seller_note' => 'Another offer was accepted for this listing.',
                'updated_at' => now(),
            ]);

        return new OfferResource($offer->load(['buyer', 'seller', 'part', 'car']));
    }

    /** POST /seller/offers/{offer}/reject — decline with optional note. */
    public function reject(Request $request, Offer $offer): OfferResource
    {
        $this->ensureSeller($request, $offer);

        if ($offer->status !== 'pending') {
            throw ValidationException::withMessages([
                'status' => ['Only pending offers can be rejected.'],
            ]);
        }

        $data = $request->validate([
            'seller_note' => ['sometimes', 'nullable', 'string', 'max:500'],
        ]);

        $offer->forceFill([
            'status' => 'rejected',
            'seller_note' => $data['seller_note'] ?? null,
        ])->save();

        return new OfferResource($offer->load(['buyer', 'seller', 'part', 'car']));
    }

    private function ensureSeller(Request $request, Offer $offer): void
    {
        $user = $request->user();
        if ((int) $offer->seller_id !== (int) $user->id && !$user->isAdmin()) {
            abort(403, 'You can only respond to offers on your own listings.');
        }
    }
}
