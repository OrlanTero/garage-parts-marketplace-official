<?php

namespace App\Services;

use App\Models\Car;
use App\Models\Conversation;
use App\Models\Order;
use App\Models\Part;
use Illuminate\Support\Facades\Log;

/**
 * Winner-aware thread access for sold-out listings.
 *
 * Old design locked loser threads at payment time, but the payer cannot
 * always be identified then (guest checkout, mismatched emails), which
 * wrongly locked the buyer↔seller thread. New design never locks the
 * winner: every send is judged live —
 *
 *  - seller of the listing: always allowed;
 *  - buyer with a committed order on the listing: always allowed (and any
 *    stale lock on their thread is lifted on the spot — self-healing);
 *  - everyone else on a sold-out listing: rejected with a restock hint.
 *
 * A committed order = accepted verification, not cancelled/refunded, in
 * a fulfillment state (sold or later).
 */
class ThreadGate
{
    private const COMMITTED_STATUSES = ['sold', 'shipped', 'delivered', 'completed'];

    /**
     * True when this viewer must see the thread as locked (read-only).
     */
    public function lockedForViewer(Conversation $conversation, int $userId): bool
    {
        // Explicit per-thread lock (non-exempt side) still counts.
        if ($conversation->lockedFor($userId)) {
            // …unless the viewer is actually the winner (stale lock).
            if ($this->isWinner($conversation, $userId) || $this->isSeller($conversation, $userId)) {
                return false;
            }
            return true;
        }

        if (!$this->listingClosed($conversation)) {
            return false;
        }

        if ($this->isSeller($conversation, $userId) || $this->isWinner($conversation, $userId)) {
            return false;
        }

        return true;
    }

    /**
     * Enforce writability for messages/offers/reservations. Aborts 422
     * for locked-out viewers; self-heals stale locks for winners.
     */
    public function authorizeSend(Conversation $conversation, int $userId): void
    {
        if ($conversation->lockedFor($userId)) {
            if ($this->isWinner($conversation, $userId) || $this->isSeller($conversation, $userId)) {
                $this->unlock($conversation);
                return;
            }
            abort(422, 'This thread is locked — the listing has been sold. Subscribe for restock alerts on the listing page.');
        }

        if ($this->listingClosed($conversation)
            && !$this->isSeller($conversation, $userId)
            && !$this->isWinner($conversation, $userId)) {
            abort(422, 'This listing has been sold — messaging is closed for this thread. Subscribe for restock alerts on the listing page.');
        }
    }

    private function unlock(Conversation $conversation): void
    {
        try {
            $conversation->forceFill(['is_locked' => false, 'locked_exempt_user_id' => null])->save();
        } catch (\Throwable $e) {
            Log::warning('Thread unlock failed: ' . $e->getMessage(), ['conversation_id' => $conversation->id]);
        }
    }

    private function listingClosed(Conversation $conversation): bool
    {
        $listing = $this->listing($conversation);
        if (!$listing) {
            return false;
        }

        $status = is_object($listing->status) ? $listing->status->value : (string) $listing->status;
        if (strtolower($status) === 'sold') {
            return true;
        }

        return $listing->quantity !== null && (int) $listing->quantity <= 0;
    }

    private function isSeller(Conversation $conversation, int $userId): bool
    {
        $listing = $this->listing($conversation);
        if (!$listing || empty($listing->seller_id)) {
            return false;
        }

        return (int) $listing->seller_id === $userId;
    }

    private function isWinner(Conversation $conversation, int $userId): bool
    {
        if (!$conversation->listing_type || !$conversation->listing_id) {
            return false;
        }

        $column = $conversation->listing_type === 'car' ? 'car_id' : 'part_id';

        return Order::query()
            ->where($column, (int) $conversation->listing_id)
            ->where(function ($q) use ($userId) {
                $q->where('user_id', $userId)
                    ->orWhere(function ($inner) use ($userId) {
                        $email = \App\Models\User::whereKey($userId)->value('email');
                        if ($email) {
                            $inner->whereNull('user_id')->where('buyer_email', $email);
                        } else {
                            $inner->whereRaw('1 = 0');
                        }
                    });
            })
            ->where('verification_status', 'accepted')
            ->whereIn('status', self::COMMITTED_STATUSES)
            ->exists();
    }

    private function listing(Conversation $conversation): Car|Part|null
    {
        if (!$conversation->listing_type || !$conversation->listing_id) {
            return null;
        }

        return $conversation->listing_type === 'car'
            ? Car::find($conversation->listing_id)
            : Part::find($conversation->listing_id);
    }
}
