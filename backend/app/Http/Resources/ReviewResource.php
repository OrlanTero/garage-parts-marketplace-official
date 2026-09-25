<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ReviewResource extends JsonResource
{
    /**
     * Privacy rule: reviewers are identified by username + avatar ONLY.
     * Real names and emails are never serialized here.
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'item_type' => $this->item_type,
            'part_id' => $this->part_id,
            'car_id' => $this->car_id,
            'rating' => (int) $this->rating,
            'title' => $this->title,
            'body' => $this->body,
            'is_verified_purchase' => (bool) $this->is_verified_purchase,
            'is_visible' => (bool) $this->is_visible,
            'reviewer' => $this->whenLoaded('buyer', fn () => [
                'username' => $this->buyer->username ?? 'member',
                'avatar_url' => $this->buyer->avatar_url,
            ]),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
