<?php

namespace App\Http\Controllers\Api;

use App\Events\MessageSent;
use App\Http\Controllers\Controller;
use App\Http\Resources\OfferResource;
use App\Models\Car;
use App\Models\Conversation;
use App\Models\Offer;
use App\Models\Part;
use App\Services\PiiSecurityService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * In-chat deal making on a listing thread.
 *
 * Either side posts priced offers; the counterparty accepts/rejects or
 * counters (parent chain). The originator then CONFIRMS an accepted offer
 * — both users have acted — which mints a single-use checkout token the
 * seller turns into a checkout link at the agreed price.
 *
 * Every transition posts a message carrying the offer so the thread reads
 * as a negotiation log.
 */
class DealOfferController extends Controller
{
    /** GET /chat/conversations/{conversation}/offers — deal thread. */
    public function index(Request $request, Conversation $conversation)
    {
        $this->authorizeParticipant($conversation, $request->user()->id);

        $offers = Offer::query()
            ->where('conversation_id', $conversation->id)
            ->with(['buyer:id,username', 'seller:id,username', 'part:id,title,price', 'car:id,title,price'])
            ->orderBy('created_at', 'asc')
            ->get();

        return OfferResource::collection($offers);
    }

    /** POST /chat/conversations/{conversation}/offers — open or counter. */
    public function store(Request $request, Conversation $conversation, PiiSecurityService $pii): JsonResponse
    {
        $user = $request->user();
        $this->authorizeParticipant($conversation, $user->id);

        $data = $request->validate([
            'amount' => ['required', 'numeric', 'min:1', 'max:9999999999.99'],
            'message' => ['nullable', 'string', 'max:1000'],
            'item_type' => ['required', 'in:car,part'],
            'car_id' => ['required_if:item_type,car', 'nullable', 'integer', 'exists:cars,id'],
            'part_id' => ['required_if:item_type,part', 'nullable', 'integer', 'exists:parts,id'],
            'parent_id' => ['nullable', 'integer', 'exists:offers,id'],
        ]);

        $listing = $data['item_type'] === 'car' ? Car::find($data['car_id']) : Part::find($data['part_id']);
        if (!$listing) {
            abort(404, 'Listing not found.');
        }
        if ((string) ($listing->status->value ?? $listing->status) !== 'active') {
            throw ValidationException::withMessages([
                'item_type' => ['Deals can only be negotiated on live marketplace listings.'],
            ]);
        }

        $parent = null;
        if (!empty($data['parent_id'])) {
            $parent = Offer::findOrFail($data['parent_id']);
            if ((int) $parent->conversation_id !== (int) $conversation->id) {
                abort(422, 'Counter must reference an offer from this conversation.');
            }
            if ($parent->status !== 'pending') {
                throw ValidationException::withMessages([
                    'parent_id' => ['Only a pending offer can be countered.'],
                ]);
            }
            if ((int) $parent->sender_id === (int) $user->id) {
                throw ValidationException::withMessages([
                    'parent_id' => ['Wait for the other party — you cannot counter your own offer.'],
                ]);
            }
            if ((int) $parent->car_id !== (int) ($data['car_id'] ?? 0)
                || (int) $parent->part_id !== (int) ($data['part_id'] ?? 0)) {
                abort(422, 'Counter must stay on the same listing.');
            }
        }

        $sellerId = (int) $listing->seller_id;
        $buyerId = $sellerId === (int) $user->id
            ? (int) $conversation->getOtherUser($user)?->id
            : (int) $user->id;

        if (!$buyerId || $buyerId === $sellerId) {
            abort(422, 'A deal needs a buyer and a seller on opposite sides.');
        }

        $sanitized = $pii->sanitize((string) ($data['message'] ?? ''));

        $offer = Offer::create([
            'buyer_id' => $buyerId,
            'seller_id' => $sellerId,
            'conversation_id' => $conversation->id,
            'sender_id' => $user->id,
            'parent_id' => $parent?->id,
            'item_type' => $data['item_type'],
            'part_id' => $data['part_id'] ?? null,
            'car_id' => $data['car_id'] ?? null,
            'amount' => $data['amount'],
            'message' => $sanitized['sanitized'] ?: null,
            'status' => 'pending',
        ]);

        if ($parent) {
            $parent->forceFill(['status' => 'superseded'])->save();
        }

        $label = $parent ? 'Counter-offered' : 'Offered';
        $this->postDealMessage(
            $conversation,
            (int) $user->id,
            "{$label} ₱" . number_format((float) $offer->amount, 2),
            $offer,
        );

        return (new OfferResource($offer->load(['buyer', 'seller', 'part', 'car'])))
            ->response()->setStatusCode(201);
    }

    /** POST /chat/offers/{offer}/accept — counterparty accepts. */
    public function accept(Request $request, Offer $offer): OfferResource
    {
        $user = $request->user();
        $this->authorizeOfferParty($offer, $user->id);

        if ((int) $offer->sender_id === (int) $user->id) {
            abort(422, 'You cannot accept your own offer — the other party acts first.');
        }
        if ($offer->status !== 'pending') {
            throw ValidationException::withMessages([
                'status' => ['Only pending offers can be accepted.'],
            ]);
        }

        $offer->forceFill(['status' => 'accepted'])->save();
        $this->postDealMessage(
            $offer->conversation, (int) $user->id,
            "Accepted ₱" . number_format((float) $offer->amount, 2) . ' — awaiting originator confirmation.',
            $offer,
        );

        return new OfferResource($offer->load(['buyer', 'seller', 'part', 'car']));
    }

    /** POST /chat/offers/{offer}/reject — counterparty declines. */
    public function reject(Request $request, Offer $offer): OfferResource
    {
        $user = $request->user();
        $this->authorizeOfferParty($offer, $user->id);

        if ((int) $offer->sender_id === (int) $user->id) {
            abort(422, 'You cannot reject your own offer — withdraw it instead.');
        }
        if ($offer->status !== 'pending') {
            throw ValidationException::withMessages([
                'status' => ['Only pending offers can be rejected.'],
            ]);
        }

        $offer->forceFill(['status' => 'rejected'])->save();
        $this->postDealMessage(
            $offer->conversation, (int) $user->id,
            'Declined ₱' . number_format((float) $offer->amount, 2) . '.',
            $offer,
        );

        return new OfferResource($offer->load(['buyer', 'seller', 'part', 'car']));
    }

    /** POST /chat/offers/{offer}/withdraw — originator pulls a pending offer. */
    public function withdraw(Request $request, Offer $offer): OfferResource
    {
        $user = $request->user();
        $this->authorizeOfferParty($offer, $user->id);

        if ((int) $offer->sender_id !== (int) $user->id) {
            abort(403, 'Only the originator can withdraw this offer.');
        }
        if ($offer->status !== 'pending') {
            throw ValidationException::withMessages([
                'status' => ['Only pending offers can be withdrawn.'],
            ]);
        }

        $offer->forceFill(['status' => 'withdrawn'])->save();
        $this->postDealMessage(
            $offer->conversation, (int) $user->id,
            'Withdrew the ₱' . number_format((float) $offer->amount, 2) . ' offer.',
            $offer,
        );

        return new OfferResource($offer->load(['buyer', 'seller', 'part', 'car']));
    }

    /**
     * POST /chat/offers/{offer}/confirm — originator confirms an accepted
     * offer. Both users have now acted: the deal locks and a single-use
     * checkout token is minted for the seller's checkout link.
     */
    public function confirm(Request $request, Offer $offer): JsonResponse
    {
        $user = $request->user();
        $this->authorizeOfferParty($offer, $user->id);

        if ((int) $offer->sender_id !== (int) $user->id) {
            abort(403, 'Only the offer originator can confirm the deal.');
        }
        if ($offer->status !== 'accepted') {
            throw ValidationException::withMessages([
                'status' => ['Only an accepted offer can be confirmed.'],
            ]);
        }

        $offer->forceFill([
            'status' => 'confirmed',
            'confirmed_by' => $user->id,
            'checkout_token' => (string) Str::uuid(),
        ])->save();

        $this->postDealMessage(
            $offer->conversation, (int) $user->id,
            'Deal locked at ₱' . number_format((float) $offer->amount, 2) . ' — seller may now issue the checkout link.',
            $offer,
            ['checkout_token' => $offer->checkout_token],
        );

        return response()->json([
            'status' => 'success',
            'data' => (new OfferResource($offer->load(['buyer', 'seller', 'part', 'car'])))->toArray($request)
                + $this->checkoutPayload($offer),
        ]);
    }

    /** POST /chat/offers/{offer}/checkout-link — seller issues the deal link. */
    public function checkoutLink(Request $request, Offer $offer): JsonResponse
    {
        $user = $request->user();
        $this->authorizeOfferParty($offer, $user->id);

        if ((int) $offer->seller_id !== (int) $user->id && !$user->isAdmin()) {
            abort(403, 'Only the seller can issue the checkout link.');
        }
        if ($offer->status !== 'confirmed' || empty($offer->checkout_token)) {
            throw ValidationException::withMessages([
                'status' => ['The deal must be confirmed by both users before a checkout link is issued.'],
            ]);
        }
        if ($offer->checkout_used_at) {
            abort(422, 'This checkout link was already used.');
        }

        $this->postDealMessage(
            $offer->conversation, (int) $user->id,
            'Checkout link issued at the agreed ₱' . number_format((float) $offer->amount, 2) . '.',
            $offer,
            ['checkout_token' => $offer->checkout_token],
        );

        return response()->json([
            'status' => 'success',
            'data' => $this->checkoutPayload($offer),
        ]);
    }

    private function checkoutPayload(Offer $offer): array
    {
        $query = http_build_query(array_filter([
            'car_id' => $offer->item_type === 'car' ? $offer->car_id : null,
            'part_id' => $offer->item_type === 'part' ? $offer->part_id : null,
            'offer_token' => $offer->checkout_token,
        ]));

        return [
            'checkout_token' => $offer->checkout_token,
            'checkout_url' => "/checkout?{$query}",
            'agreed_amount' => (float) $offer->amount,
            'item_type' => $offer->item_type,
            'car_id' => $offer->car_id,
            'part_id' => $offer->part_id,
        ];
    }

    private function authorizeOfferParty(Offer $offer, int $userId): void
    {
        $conversation = $offer->conversation;
        if (!$conversation || !$conversation->hasParticipant($userId)) {
            abort(403, 'You are not part of this deal conversation.');
        }
    }

    private function authorizeParticipant(Conversation $conversation, int $userId): void
    {
        if (!$conversation->hasParticipant($userId)) {
            abort(403, 'You are not authorized to access this conversation.');
        }
    }

    private function postDealMessage(
        Conversation $conversation,
        int $senderId,
        string $body,
        Offer $offer,
        ?array $metadata = null,
    ): void {
        $message = $conversation->messages()->create([
            'sender_id' => $senderId,
            'body' => $body,
            'is_redacted' => false,
            'listing_type' => $offer->item_type,
            'listing_id' => $offer->item_type === 'car' ? $offer->car_id : $offer->part_id,
            'offer_id' => $offer->id,
            'metadata' => $metadata,
        ]);

        $conversation->update([
            'last_message_id' => $message->id,
            'last_message_at' => now(),
        ]);

        $other = $conversation->getOtherUser($senderId);
        if ($other) {
            try {
                broadcast(new MessageSent($message->load(['sender', 'offer', 'reservation']), (int) $other->id));
            } catch (\Throwable $e) {
                Log::warning('Deal broadcast failed: ' . $e->getMessage());
            }
        }
    }
}
