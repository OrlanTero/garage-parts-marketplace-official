<?php

namespace App\Events;

use App\Models\Order;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

/**
 * Fired whenever an order's lifecycle moves (status, payment_status, or
 * verification_status). Delivered to both the buyer and the seller so
 * inboxes, chats, and order screens update live.
 */
class OrderStatusChanged implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public Order $order
    ) {
    }

    public function broadcastOn(): array
    {
        $channels = [];

        // Guest checkouts have no buyer account — seller still updates.
        if ($this->order->user_id) {
            $channels[] = new PrivateChannel('user.' . $this->order->user_id);
        }

        if ($this->order->seller_id) {
            $channels[] = new PrivateChannel('user.' . $this->order->seller_id);
        }

        // Back-office staff watch every order from the admin portal.
        $channels[] = new PrivateChannel('staff.orders');

        return $channels;
    }

    public function broadcastAs(): string
    {
        return 'order.status';
    }

    public function broadcastWith(): array
    {
        return [
            'order_id' => $this->order->id,
            'order_number' => $this->order->order_number,
            'status' => $this->order->status,
            'payment_status' => $this->order->payment_status,
            'verification_status' => $this->order->verification_status,
            'item_type' => $this->order->item_type,
            'car_id' => $this->order->car_id,
            'part_id' => $this->order->part_id,
            'total_amount' => (float) $this->order->total_amount,
            'updated_at' => $this->order->updated_at?->toIso8601String(),
        ];
    }
}
