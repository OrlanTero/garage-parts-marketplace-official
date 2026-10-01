<?php

namespace App\Observers;

use App\Events\OrderStatusChanged;
use App\Models\Order;
use App\Services\NotificationService;

/**
 * Broadcasts every meaningful order lifecycle move so buyer and seller
 * screens (inbox threads, chats, order pages) update in realtime, and
 * drops persistent notifications into both parties' centers.
 * Best-effort: a downed socket server must never break order writes.
 */
class OrderObserver
{
    public function __construct(private NotificationService $notifications) {}

    public function created(Order $order): void
    {
        $this->broadcast($order);
        $this->notifyPlaced($order);
    }

    public function updated(Order $order): void
    {
        if (!$order->wasChanged(['status', 'payment_status', 'verification_status', 'proof_status'])) {
            return;
        }

        $this->broadcast($order);
        $this->notifyChanged($order);
    }

    private function broadcast(Order $order): void
    {
        try {
            OrderStatusChanged::dispatch($order);
        } catch (\Throwable $e) {
            report($e);
        }
    }

    private function orderLink(Order $order): string
    {
        return '/sales-order/' . ($order->order_number ?: $order->id);
    }

    private function notifyPlaced(Order $order): void
    {
        $title = "New order {$order->order_number}";
        try {
            if ($order->user_id) {
                $this->notifications->send(
                    (int) $order->user_id,
                    'order',
                    "Order placed: {$order->order_number}",
                    "Your request for {$order->item_name} is awaiting seller verification.",
                    ['order_id' => $order->id, 'order_number' => $order->order_number, 'status' => $order->status],
                    $this->orderLink($order),
                );
            }
            if ($order->seller_id) {
                $this->notifications->send(
                    (int) $order->seller_id,
                    'order',
                    $title,
                    "{$order->buyer_name} requested {$order->item_name} — verify to unlock payment.",
                    ['order_id' => $order->id, 'order_number' => $order->order_number, 'status' => $order->status],
                    $this->orderLink($order),
                );
            }
        } catch (\Throwable $e) {
            report($e);
        }
    }

    private function notifyChanged(Order $order): void
    {
        $changes = array_keys($order->getChanges());
        $proofOnly = in_array('proof_status', $changes, true)
            && !in_array('status', $changes, true)
            && !in_array('payment_status', $changes, true)
            && !in_array('verification_status', $changes, true);
        $label = match (true) {
            $proofOnly => 'handover proof ' . ($order->proof_status ?? 'updated'),
            in_array('verification_status', $changes, true) => $order->verification_status === 'accepted'
                ? 'verified & accepted' : 'updated (' . $order->verification_status . ')',
            in_array('payment_status', $changes, true) => 'payment ' . $order->payment_status,
            default => 'moved to ' . $order->status,
        };

        try {
            foreach (array_filter([$order->user_id, $order->seller_id]) as $recipientId) {
                $this->notifications->send(
                    (int) $recipientId,
                    $order->status === 'disputed' ? 'dispute' : 'order',
                    "Order {$order->order_number} {$label}",
                    "{$order->item_name} — status: {$order->status}, payment: {$order->payment_status}.",
                    [
                        'order_id' => $order->id,
                        'order_number' => $order->order_number,
                        'status' => $order->status,
                        'payment_status' => $order->payment_status,
                        'verification_status' => $order->verification_status,
                    ],
                    $this->orderLink($order),
                );
            }
        } catch (\Throwable $e) {
            report($e);
        }
    }
}
