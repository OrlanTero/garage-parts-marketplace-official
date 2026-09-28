<?php

namespace App\Services;

use App\Enums\CarStatus;
use App\Models\Car;
use App\Models\Conversation;
use App\Models\Order;
use Illuminate\Support\Facades\Log;

/**
 * Sellout flow: when payment secures the LAST unit of a car, the order
 * flips to `sold` immediately (never backwards into `negotiating`), the
 * listing flips to sold (off the marketplace), and losing buyers are
 * notified with a restock-subscription path. Threads are never locked
 * here — ThreadGate judges every send live so the paying buyer and the
 * seller can always talk.
 */
class SelloutService
{
    public function __construct(private NotificationService $notifications) {}

    /** Early (pre-fulfillment) order states that auto-sell may advance. */
    private const EARLY_STATUSES = ['processing', 'negotiating', 'reserved', 'preparing'];

    /**
     * Called right after car units are reserved by a secured payment.
     * No-op unless this payment took the last unit.
     */
    public function handleCarSellout(Order $order, Car $car): void
    {
        try {
            $order->refresh();
            $car->refresh();

            if (($order->item_type ?? null) !== 'car') {
                return;
            }
            if ((int) $car->quantity > 0) {
                return; // stock remains — normal flow continues
            }
            if (!in_array($order->status, self::EARLY_STATUSES, true)) {
                return; // already fulfilled — never drag backwards
            }
            if (($order->verification_status ?? 'pending') !== 'accepted') {
                return;
            }

            $order->forceFill(['status' => 'sold'])->save();

            if ($this->carStatus($car) !== CarStatus::Sold->value) {
                $car->forceFill(['status' => CarStatus::Sold->value])->save();
            }

            $this->lockLoserThreads($order, $car);
        } catch (\Throwable $e) {
            Log::warning('Sellout handling failed: ' . $e->getMessage(), [
                'order_id' => $order->id ?? null,
                'car_id' => $car->id ?? null,
            ]);
        }
    }

    /**
     * Lock every thread on this listing except the winner's, buyer-side
     * only (the seller stays exempt), and notify the losing buyers.
     */
    private function lockLoserThreads(Order $order, Car $car): void
    {
        $listingKey = Conversation::makeListingKey('car', (int) $car->id);
        $threads = Conversation::query()->where('listing_key', $listingKey)->get();
        if ($threads->isEmpty()) {
            return;
        }

        // The winner is whoever paid: account id when signed in, else
        // resolve the checkout email to an account (guest checkouts carry
        // no user_id, but the buyer may still own a chat thread). Without
        // any resolvable buyer, every thread on the listing is a loser
        // thread — a true guest has no in-app thread to protect.
        $buyerId = $order->user_id ? (int) $order->user_id : null;
        if ($buyerId === null && $order->buyer_email) {
            $buyerId = \App\Models\User::where('email', $order->buyer_email)->value('id');
            $buyerId = $buyerId !== null ? (int) $buyerId : null;
        }
        $sellerId = (int) ($order->seller_id ?? $car->seller_id);
        $listingLink = '/marketplace/' . ($car->uuid ?? $car->id);

        foreach ($threads as $thread) {
            $isWinnerThread = $buyerId !== null && $thread->hasParticipant($buyerId);
            if ($isWinnerThread) {
                continue;
            }

            // NOTE: threads are deliberately NOT locked here. The payer
            // cannot always be identified at payment time, and a wrong
            // lock silences the buyer↔seller thread. Access is judged
            // live instead (see ThreadGate): sellers and the winning
            // buyer always pass; losers on a sold-out listing are
            // rejected at send time.

            // Notify the buyer side of the thread (never the seller).
            foreach ([$thread->user_one_id, $thread->user_two_id] as $participantId) {
                $participantId = (int) $participantId;
                if ($participantId === $sellerId) {
                    continue;
                }
                try {
                    $this->notifications->send(
                        $participantId,
                        'listing',
                        "Sold: {$car->title}",
                        'Another buyer secured the last unit. Messaging on this thread is now closed — tap Notify Me on the listing to hear about a restock.',
                        ['car_id' => $car->id, 'order_number' => $order->order_number, 'sold' => true],
                        $listingLink,
                    );
                } catch (\Throwable $e) {
                    Log::warning('Sellout loser notification failed: ' . $e->getMessage());
                }
            }
        }
    }

    private function carStatus(Car $car): ?string
    {
        if ($car->status === null) {
            return null;
        }

        return $car->status instanceof CarStatus ? $car->status->value : (string) $car->status;
    }
}
