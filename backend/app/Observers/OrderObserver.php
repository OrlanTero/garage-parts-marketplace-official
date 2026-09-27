<?php

namespace App\Observers;

use App\Events\OrderStatusChanged;
use App\Models\Order;

/**
 * Broadcasts every meaningful order lifecycle move so buyer and seller
 * screens (inbox threads, chats, order pages) update in realtime.
 * Best-effort: a downed socket server must never break order writes.
 */
class OrderObserver
{
    public function created(Order $order): void
    {
        $this->broadcast($order);
    }

    public function updated(Order $order): void
    {
        if (!$order->wasChanged(['status', 'payment_status', 'verification_status'])) {
            return;
        }

        $this->broadcast($order);
    }

    private function broadcast(Order $order): void
    {
        try {
            OrderStatusChanged::dispatch($order);
        } catch (\Throwable $e) {
            report($e);
        }
    }
}
