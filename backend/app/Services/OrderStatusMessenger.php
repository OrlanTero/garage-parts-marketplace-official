<?php

namespace App\Services;

use App\Events\MessageSent;
use App\Models\Conversation;
use App\Models\Order;
use App\Models\User;
use Illuminate\Support\Facades\Log;

/**
 * Posts automatic buyer-facing chat messages whenever the seller (or an
 * admin) moves a sale order, so the buyer is informed inside the thread
 * instead of discovering it on the receipt page.
 *
 * Best-effort: never breaks the order write. Skipped when neither side
 * has an in-app account (true guest checkout).
 */
class OrderStatusMessenger
{
    public function __construct(private NotificationService $notifications) {}

    /**
     * Announce a lifecycle move on the order's listing thread.
     *
     * @param Order $order fresh order AFTER the change
     * @param string|null $fromStatus status before the change (for copy)
     */
    public function announce(Order $order, ?string $fromStatus = null): void
    {
        $body = $this->messageFor($order, $fromStatus);
        if ($body === null) {
            return;
        }

        $this->post(
            $order,
            $body,
            [
                'status' => $order->status,
                'payment_status' => $order->payment_status,
                'verification_status' => $order->verification_status,
            ],
            "Order {$order->order_number}: " . ucfirst($order->status),
        );
    }

    /** Seller verified & accepted the buyer's request. */
    public function announceVerification(Order $order): void
    {
        $this->post(
            $order,
            "Good news — your request for {$order->item_name} (order {$order->order_number}) was verified and accepted. Settlement details on your receipt are now active.",
            ['verification_status' => 'accepted'],
        );
    }

    /** Buyer funds confirmed — dispatch unlocked. */
    public function announceFundsConfirmed(Order $order): void
    {
        $this->post(
            $order,
            "Payment confirmed for order {$order->order_number} ({$order->item_name}). The seller will now prepare dispatch.",
            ['payment_status' => 'confirmed'],
        );
    }

    /** Dispute resolved with a refund. */
    public function announceRefund(Order $order): void
    {
        $this->post(
            $order,
            "Order {$order->order_number} has been refunded. The amount goes back to your original payment channel.",
            ['status' => 'refunded'],
        );
    }

    private function post(Order $order, string $body, array $extraData = [], ?string $title = null): void
    {
        try {
            $buyerId = $this->resolveBuyerId($order);
            $sellerId = (int) ($order->seller_id ?? 0);
            if (!$buyerId || !$sellerId || $buyerId === $sellerId) {
                return;
            }

            $listingType = $order->item_type === 'car' ? 'car' : 'part';
            $listingId = $listingType === 'car' ? (int) $order->car_id : (int) $order->part_id;
            if (!$listingId) {
                return;
            }

            $conversation = Conversation::findOrCreateBetween($buyerId, $sellerId, $listingType, $listingId);

            $message = $conversation->messages()->create([
                'sender_id' => $sellerId,
                'body' => $body,
                'is_redacted' => false,
                'listing_type' => $listingType,
                'listing_id' => $listingId,
            ]);

            $conversation->update([
                'last_message_id' => $message->id,
                'last_message_at' => now(),
            ]);

            try {
                broadcast(new MessageSent($message->load('sender'), $buyerId));
            } catch (\Throwable $broadcastError) {
                report($broadcastError);
            }

            $this->notifications->send(
                $buyerId,
                'order',
                $title ?? "Order {$order->order_number} update",
                mb_substr($body, 0, 140),
                array_merge([
                    'order_id' => $order->id,
                    'order_number' => $order->order_number,
                    'status' => $order->status,
                ], $extraData),
                '/sales-order/' . ($order->order_number ?: $order->id),
            );
        } catch (\Throwable $e) {
            Log::warning('Order message post failed: ' . $e->getMessage(), [
                'order_id' => $order->id ?? null,
            ]);
        }
    }

    /**
     * Buyer account for this order: the signed-in buyer, else the account
     * matching the checkout email (guest checkout).
     */
    private function resolveBuyerId(Order $order): ?int
    {
        if ($order->user_id) {
            return (int) $order->user_id;
        }
        if ($order->buyer_email) {
            $id = User::where('email', $order->buyer_email)->value('id');
            if ($id) {
                return (int) $id;
            }
        }

        return null;
    }

    private function messageFor(Order $order, ?string $fromStatus): ?string
    {
        $ref = $order->order_number ?: "#{$order->id}";
        $item = $order->item_name ?: 'your order';

        return match ($order->status) {
            'negotiating' => "Update on order {$ref}: we're negotiating the terms for {$item}. I'll keep you posted here.",
            'sold' => "Great news — order {$ref} ({$item}) is now SOLD to you and reserved. I'll arrange delivery next.",
            'preparing' => "Update on order {$ref}: {$item} is being prepared for dispatch.",
            'shipped' => "Order {$ref} has shipped"
                . ($order->carrier ? " via {$order->carrier}" : '')
                . ($order->tracking_number ? " (tracking {$order->tracking_number})" : '')
                . '.',
            'delivered' => $order->item_type === 'car'
                ? "Order {$ref} has been delivered — please inspect the car on your receipt page."
                : "Order {$ref} has been delivered. Enjoy!",
            'completed' => "Order {$ref} is complete. Thank you for buying with us!",
            'disputed' => "Order {$ref} is now under review (disputed). Our team will reach out with next steps.",
            'cancelled' => "Order {$ref} has been cancelled.",
            'refunded' => "Order {$ref} has been refunded.",
            default => null,
        };
    }
}
