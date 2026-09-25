<?php

namespace App\Http\Resources;

use BackedEnum;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** Canonical car shape — backend ↔ frontend contract. */
class CarResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $enum = fn ($value) => $value instanceof BackedEnum ? $value->value : $value;

        return [
            'id' => $this->id,
            'uuid' => $this->uuid,
            'title' => $this->title,
            'brand' => $this->brand,
            'model' => $this->model,
            'year' => $this->year,
            'price' => $this->price,
            'original_price' => $this->original_price,
            'origPrice' => $this->original_price,
            'mileage_km' => $this->mileage_km,
            'body_style' => $enum($this->body_style),
            'fuel_type' => $enum($this->fuel_type),
            'transmission' => $enum($this->transmission),
            'condition' => $enum($this->condition),
            'quantity' => (int) ($this->quantity ?? 1),
            'tag' => $this->tag,
            'color' => $this->color,
            'vin' => $this->vin,
            'description' => $this->description,
            'city' => $this->city,
            'location' => $this->location ?? $this->city,
            'loc' => $this->location ?? $this->city,
            'status' => $enum($this->status),
            'rating' => (float) ($this->rating ?? 5.0),
            'inspection_score' => $this->inspection_score ?? '99/100',
            'score' => $this->inspection_score ?? '99/100',
            'inspection_type' => $this->inspection_type,
            'inspection_status' => $this->inspection_status ?? 'pending',
            'inspection_date' => $this->inspection_date,
            'inspection_location' => $this->inspection_location,
            'inspector_id' => $this->inspector_id,
            'inspector_notes' => $this->inspector_notes,
            'is_approved' => (bool) ($this->is_approved ?? false),
            'approved_by' => $this->approved_by,
            'approved_at' => $this->approved_at,
            'rejection_reason' => $this->rejection_reason,
            'primary_image_url' => $this->primary_image_url,
            'img' => $this->primary_image_url,
            'media' => MediaResource::collection($this->whenLoaded('media', $this->media, fn () => $this->media)),
            'images' => MediaResource::collection($this->whenLoaded('media', $this->media, fn () => $this->media)),
            'image_urls' => $this->image_urls,
            'published_at' => $this->published_at,
            'sold_at' => $this->sold_at,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'seller' => $this->whenLoaded('seller', fn () => [
                'id' => $this->seller->id,
                'username' => $this->seller->username,
                'avatar_url' => $this->seller->avatar_url,
                'is_kyc_verified' => (bool) ($this->seller->is_kyc_verified && $this->seller->kyc_status === 'approved'),
                'kyc_status' => $this->seller->kyc_status ?? 'not_submitted',
                'role' => $this->seller->role instanceof BackedEnum ? $this->seller->role->value : $this->seller->role,
                'rating' => (float) ($this->seller->rating ?? 5.0),
            ]),
        ];
    }
}
