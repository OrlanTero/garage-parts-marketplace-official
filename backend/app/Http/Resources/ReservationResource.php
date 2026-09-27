<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ReservationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'uuid' => $this->uuid,
            'conversation_id' => $this->conversation_id,
            'offer_id' => $this->offer_id,
            'item_type' => $this->item_type,
            'car_id' => $this->car_id,
            'part_id' => $this->part_id,
            'buyer_id' => $this->buyer_id,
            'seller_id' => $this->seller_id,
            'amount' => (float) $this->amount,
            'formatted_amount' => '₱ ' . number_format((float) $this->amount, 2),
            'fee_percentage' => (float) $this->fee_percentage,
            'status' => $this->status,
            'status_label' => match ($this->status) {
                'paid' => 'Paid — awaiting confirmation',
                'confirmed' => 'Reservation Confirmed',
                'cancelled' => 'Cancelled',
                default => 'Awaiting Payment',
            },
            'scheduled_for' => $this->scheduled_for?->toIso8601String(),
            'is_scheduled' => $this->scheduled_for !== null,
            'payment_method' => $this->payment_method,
            'payment_reference' => $this->payment_reference,
            'confirmed_at' => $this->confirmed_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
