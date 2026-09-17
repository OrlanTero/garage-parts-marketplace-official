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
            'mileage_km' => $this->mileage_km,
            'body_style' => $enum($this->body_style),
            'fuel_type' => $enum($this->fuel_type),
            'transmission' => $enum($this->transmission),
            'condition' => $enum($this->condition),
            'color' => $this->color,
            'vin' => $this->vin,
            'description' => $this->description,
            'city' => $this->city,
            'status' => $enum($this->status),
            'published_at' => $this->published_at,
            'sold_at' => $this->sold_at,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'seller' => $this->whenLoaded('seller', fn () => [
                'id' => $this->seller->id,
                'name' => $this->seller->name,
            ]),
        ];
    }
}
