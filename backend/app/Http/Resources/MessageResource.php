<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MessageResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $listing = $this->listing;
        $listingData = null;

        if ($listing) {
            $isCar = $this->listing_type === 'car';
            $listingUuid = $listing->uuid ?? $listing->id;
            $listingData = [
                'type' => $this->listing_type,
                'id' => $listing->id,
                'uuid' => $listing->uuid ?? null,
                'title' => $listing->title ?? ($listing->name ?? 'Listing Item'),
                'price' => (float) $listing->price,
                'primary_image_url' => $listing->primary_image_url ?? ($listing->media?->first()?->url ?? null),
                'inspection_score' => $listing->inspection_score ?? null,
                'condition' => is_object($listing->condition) ? $listing->condition->value : $listing->condition,
                'url' => $isCar ? "/marketplace/{$listingUuid}" : "/parts/{$listingUuid}",
            ];
        }

        return [
            'id' => $this->id,
            'conversation_id' => $this->conversation_id,
            'sender_id' => $this->sender_id,
            'sender' => $this->sender ? [
                'id' => $this->sender->id,
                'username' => $this->sender->username,
                'avatar_url' => $this->sender->avatar_url,
                'is_kyc_verified' => (bool) ($this->sender->is_kyc_verified && $this->sender->kyc_status === 'approved'),
                'role' => is_object($this->sender->role) ? $this->sender->role->value : $this->sender->role,
            ] : null,
            'body' => $this->body,
            'is_redacted' => (bool) $this->is_redacted,
            'listing_type' => $this->listing_type,
            'listing_id' => $this->listing_id,
            'listing' => $listingData,
            'read_at' => $this->read_at?->toISOString(),
            'is_read' => $this->read_at !== null,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
