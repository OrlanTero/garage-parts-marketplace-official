<?php

namespace App\Http\Resources;

use BackedEnum;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** Canonical part shape — backend ↔ frontend contract. */
class PartResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $enum = fn ($value) => $value instanceof BackedEnum ? $value->value : $value;

        return [
            'id' => $this->id,
            'title' => $this->title,
            'category' => $enum($this->category),
            'cat' => $enum($this->category),
            'brand' => $this->brand,
            'part_number' => $this->part_number,
            'compatibility' => $this->compatibility,
            'condition' => $enum($this->condition),
            'cond' => $enum($this->condition),
            'tag' => $this->tag,
            'quantity' => $this->quantity,
            'price' => $this->price,
            'original_price' => $this->original_price,
            'origPrice' => $this->original_price,
            'free_shipping' => (bool) $this->free_shipping,
            'freeShip' => (bool) $this->free_shipping,
            'description' => $this->description,
            'city' => $this->city,
            'location' => $this->location ?? $this->city,
            'loc' => $this->location ?? $this->city,
            'status' => $enum($this->status),
            'rating' => (float) ($this->rating ?? 5.0),
            'reviews_count' => (int) ($this->reviews_count ?? 0),
            'reviews' => (int) ($this->reviews_count ?? 0),
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
                'name' => $this->seller->name,
                'email' => $this->seller->email,
            ]),
        ];
    }
}
