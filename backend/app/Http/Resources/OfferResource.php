<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OfferResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'item_type' => $this->item_type,
            'part_id' => $this->part_id,
            'car_id' => $this->car_id,
            'item_title' => $this->item_title,
            'item_price' => $this->item_type === 'car'
                ? (float) ($this->car?->price ?? 0)
                : (float) ($this->part?->price ?? 0),
            'amount' => (float) $this->amount,
            'formatted_amount' => '₱ ' . number_format((float) $this->amount, 2),
            'message' => $this->message,
            'status' => $this->status,
            'status_label' => ucfirst($this->status),
            'seller_note' => $this->seller_note,
            'buyer' => $this->whenLoaded('buyer', fn () => [
                'id' => $this->buyer->id,
                'name' => $this->buyer->name,
                'username' => $this->buyer->username,
                'avatar_url' => $this->buyer->avatar_url,
            ]),
            'seller' => $this->whenLoaded('seller', fn () => [
                'id' => $this->seller->id,
                'name' => $this->seller->name,
            ]),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
