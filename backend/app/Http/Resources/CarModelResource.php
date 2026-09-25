<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CarModelResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'brand_id' => $this->brand_id,
            'brand' => $this->whenLoaded('brand', fn () => [
                'id' => $this->brand->id,
                'name' => $this->brand->name,
                'slug' => $this->brand->slug,
            ]),
            'name' => $this->name,
            'slug' => $this->slug,
            'chassis_code' => $this->chassis_code,
            'years' => $this->years_label,
            'years_label' => $this->years_label,
            'year_from' => $this->year_from,
            'year_to' => $this->year_to,
            'engines' => $this->engines ?? [],
            'description' => $this->description,
            'is_active' => (bool) $this->is_active,
            // Live computed counts — replaces hardcoded "184 Compatible Parts".
            'compatible_parts_count' => $this->whenCounted('compatibleParts', $this->compatible_parts_count ?? null),
            'cars_count' => $this->whenCounted('cars'),
        ];
    }
}
