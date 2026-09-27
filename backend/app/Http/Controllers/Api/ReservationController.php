<?php

namespace App\Http\Controllers\Api;

use App\Events\MessageSent;
use App\Http\Controllers\Controller;
use App\Http\Resources\ReservationResource;
use App\Models\Car;
use App\Models\Conversation;
use App\Models\Offer;
use App\Models\Part;
use App\Models\PlatformSetting;
use App\Models\PlatformTransaction;
use App\Models\Reservation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

/**
 * Reservation payments issued by the seller inside a deal thread.
 *
 * Amount defaults to the parameterized reservation fee
 * (Variables → reservation_fee_percentage, default 5%) of the deal or
 * listing price. Immediate mock payments confirm at once; SCHEDULED
 * payments stay `paid` until the seller accepts them.
 */
class ReservationController extends Controller
{
    /** POST /chat/conversations/{conversation}/reservations — seller issues. */
    public function store(Request $request, Conversation $conversation): JsonResponse
    {
        $user = $request->user();
        $this->authorizeParticipant($conversation, $user->id);

        $data = $request->validate([
            'offer_id' => ['nullable', 'integer', 'exists:offers,id'],
            'item_type' => ['nullable', 'in:car,part'],
            'car_id' => ['nullable', 'integer', 'exists:cars,id'],
            'part_id' => ['nullable', 'integer', 'exists:parts,id'],
            'amount' => ['nullable', 'numeric', 'min:1', 'max:9999999999.99'],
            'scheduled_for' => ['nullable', 'date', 'after:now'],
        ]);

        $offer = !empty($data['offer_id']) ? Offer::findOrFail($data['offer_id']) : null;
        if ($offer && (int) $offer->conversation_id !== (int) $conversation->id) {
            abort(422, 'Offer does not belong to this conversation.');
        }

        $itemType = $data['item_type'] ?? $offer?->item_type ?? 'car';
        $carId = $data['car_id'] ?? $offer?->car_id;
        $partId = $data['part_id'] ?? $offer?->part_id;

        $listing = $itemType === 'car'
            ? ($carId ? Car::find($carId) : null)
            : ($partId ? Part::find($partId) : null);
        if (!$listing) {
            abort(422, 'A live listing (or linked deal offer) is required.');
        }

        // Only the listing seller issues reservation requests.
        if ((int) $listing->seller_id !== (int) $user->id && !$user->isAdmin()) {
            abort(403, 'Only the seller can issue a reservation payment.');
        }

        $buyer = $conversation->getOtherUser($user);
        $buyerId = $user->isAdmin() ? $offer?->buyer_id : $buyer?->id;
        if (!$buyerId || (int) $buyerId === (int) $listing->seller_id) {
            abort(422, 'A reservation needs a buyer on the other side.');
        }

        $feePct = (float) PlatformSetting::get('reservation_fee_percentage', 5.00);
        $base = (float) ($data['amount'] ?? $offer?->amount ?? $listing->price ?? 0);
        $amount = isset($data['amount'])
            ? (float) $data['amount']
            : round($base * ($feePct / 100), 2);

        if ($amount < 1) {
            abort(422, 'Reservation amount must be at least ₱1.');
        }

        $reservation = Reservation::create([
            'conversation_id' => $conversation->id,
            'offer_id' => $offer?->id,
            'item_type' => $itemType,
            'car_id' => $itemType === 'car' ? $carId : null,
            'part_id' => $itemType === 'part' ? $partId : null,
            'buyer_id' => $buyerId,
            'seller_id' => $listing->seller_id,
            'amount' => $amount,
            'fee_percentage' => $feePct,
            'status' => 'pending',
            'scheduled_for' => $data['scheduled_for'] ?? null,
        ]);

        $when = $reservation->scheduled_for
            ? 'scheduled for ' . $reservation->scheduled_for->format('M d, Y h:i A')
            : 'due now';
        $this->postReservationMessage(
            $conversation, (int) $user->id,
            "Reservation requested: ₱" . number_format($amount, 2) . " ({$feePct}% fee, {$when}).",
            $reservation,
        );

        return (new ReservationResource($reservation))->response()->setStatusCode(201);
    }

    /** POST /reservations/{reservation}/pay — buyer settles (mock now, gateway later). */
    public function pay(Request $request, Reservation $reservation): ReservationResource
    {
        $user = $request->user();
        $this->authorizeReservationParty($reservation, $user->id);

        if ((int) $reservation->buyer_id !== (int) $user->id) {
            abort(403, 'Only the buyer can pay this reservation.');
        }
        if ($reservation->status !== 'pending') {
            throw ValidationException::withMessages([
                'status' => ['Only pending reservations can be paid.'],
            ]);
        }

        $data = $request->validate([
            'payment_method' => ['sometimes', 'string', 'in:bank_transfer,ewallet,credit_card'],
            'payment_reference' => ['required', 'string', 'max:100'],
        ]);

        $reservation->forceFill([
            'payment_method' => $data['payment_method'] ?? $reservation->payment_method ?? 'bank_transfer',
            'payment_reference' => trim($data['payment_reference']),
            'status' => 'paid',
        ])->save();

        $txn = PlatformTransaction::recordReservationFee($reservation, 'pending');

        // Immediate payments confirm at once; scheduled ones wait for the seller.
        if ($reservation->scheduled_for === null) {
            $reservation->forceFill(['status' => 'confirmed', 'confirmed_at' => now()])->save();
            $txn->forceFill(['status' => 'completed', 'settled_at' => now()])->save();
            $this->postReservationMessage(
                $reservation->conversation, (int) $user->id,
                'Reservation paid and confirmed: ₱' . number_format((float) $reservation->amount, 2) . '.',
                $reservation->refresh(),
            );
        } else {
            $this->postReservationMessage(
                $reservation->conversation, (int) $user->id,
                'Scheduled reservation paid — awaiting seller acceptance.',
                $reservation->refresh(),
            );
        }

        return new ReservationResource($reservation->refresh());
    }

    /** POST /reservations/{reservation}/accept — seller confirms (required when scheduled). */
    public function accept(Request $request, Reservation $reservation): ReservationResource
    {
        $user = $request->user();
        $this->authorizeReservationParty($reservation, $user->id);

        if ((int) $reservation->seller_id !== (int) $user->id && !$user->isAdmin()) {
            abort(403, 'Only the seller can accept a reservation payment.');
        }
        if ($reservation->status !== 'paid') {
            throw ValidationException::withMessages([
                'status' => ['Only paid reservations can be accepted.'],
            ]);
        }

        $reservation->forceFill(['status' => 'confirmed', 'confirmed_at' => now()])->save();

        PlatformTransaction::query()
            ->where('stream_type', 'reservation_fee')
            ->where('reference_number', 'RSV-' . $reservation->id)
            ->update(['status' => 'completed', 'settled_at' => now(), 'updated_at' => now()]);

        $this->postReservationMessage(
            $reservation->conversation, (int) $user->id,
            'Reservation accepted and confirmed.',
            $reservation->refresh(),
        );

        return new ReservationResource($reservation->refresh());
    }

    /** POST /reservations/{reservation}/cancel — either side while open. */
    public function cancel(Request $request, Reservation $reservation): ReservationResource
    {
        $user = $request->user();
        $this->authorizeReservationParty($reservation, $user->id);

        if (!in_array($reservation->status, ['pending', 'paid'], true)) {
            throw ValidationException::withMessages([
                'status' => ['Only open reservations can be cancelled.'],
            ]);
        }

        $reservation->forceFill(['status' => 'cancelled'])->save();

        PlatformTransaction::query()
            ->where('stream_type', 'reservation_fee')
            ->where('reference_number', 'RSV-' . $reservation->id)
            ->update(['status' => 'cancelled', 'updated_at' => now()]);

        $this->postReservationMessage(
            $reservation->conversation, (int) $user->id,
            'Reservation cancelled.',
            $reservation->refresh(),
        );

        return new ReservationResource($reservation->refresh());
    }

    private function authorizeParticipant(Conversation $conversation, int $userId): void
    {
        if (!$conversation->hasParticipant($userId)) {
            abort(403, 'You are not authorized to access this conversation.');
        }
    }

    private function authorizeReservationParty(Reservation $reservation, int $userId): void
    {
        $conversation = $reservation->conversation;
        if (!$conversation || !$conversation->hasParticipant($userId)) {
            abort(403, 'You are not part of this reservation conversation.');
        }
    }

    private function postReservationMessage(
        Conversation $conversation,
        int $senderId,
        string $body,
        Reservation $reservation,
    ): void {
        $message = $conversation->messages()->create([
            'sender_id' => $senderId,
            'body' => $body,
            'is_redacted' => false,
            'listing_type' => $reservation->item_type,
            'listing_id' => $reservation->item_type === 'car' ? $reservation->car_id : $reservation->part_id,
            'reservation_id' => $reservation->id,
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
                Log::warning('Reservation broadcast failed: ' . $e->getMessage());
            }
        }
    }
}
