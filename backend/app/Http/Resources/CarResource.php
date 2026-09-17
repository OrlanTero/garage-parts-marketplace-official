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
