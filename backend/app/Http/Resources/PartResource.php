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
            'uuid' => $this->uuid,
            'title' => $this->title,
            'category' => $enum($this->category),
            'cat' => $enum($this->category),
            'brand' => $this->brand,
            'part_number' => $this->part_number,
            'mpn' => $this->mpn,
            'barcode' => $this->barcode,
            'uom' => $this->uom ?? 'pc',
            'specifications' => $this->specifications ?? [],
            'lifecycle_status' => $this->lifecycle_status ?? 'active',
            'compatibility' => $this->compatibility,
            'condition' => $enum($this->condition),
            'cond' => $enum($this->condition),
            'tag' => $this->tag,
            'quantity' => (int) ($this->quantity ?? 0),
            'reserved_quantity' => (int) ($this->reserved_quantity ?? 0),
            'available_quantity' => max(0, (int) ($this->quantity ?? 0) - (int) ($this->reserved_quantity ?? 0)),
            'min_stock' => (int) ($this->min_stock ?? 0),
            'max_stock' => $this->max_stock !== null ? (int) $this->max_stock : null,
            'reorder_point' => (int) ($this->reorder_point ?? 0),
            'safety_stock' => (int) ($this->safety_stock ?? 0),
            'stock_status' => $this->stockStatus(),
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

    private function stockStatus(): string
    {
        $qty = (int) ($this->quantity ?? 0);
        if ($qty <= 0) {
            return 'out_of_stock';
        }
        if ($qty <= (int) ($this->reorder_point ?? 0)) {
            return 'low';
        }
        if ($this->max_stock !== null && $qty > (int) $this->max_stock) {
            return 'overstock';
        }

        return 'in_stock';
    }
}
