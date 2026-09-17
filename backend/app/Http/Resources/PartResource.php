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
            'brand' => $this->brand,
            'part_number' => $this->part_number,
            'compatibility' => $this->compatibility,
            'condition' => $enum($this->condition),
            'quantity' => $this->quantity,
            'price' => $this->price,
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
