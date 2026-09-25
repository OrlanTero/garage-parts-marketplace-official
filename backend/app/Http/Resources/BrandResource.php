<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BrandResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'country' => $this->country,
            'region' => $this->region,
            'logo_url' => $this->logo_url,
            'is_active' => (bool) $this->is_active,
            'models_count' => $this->whenCounted('carModels'),
            'cars_count' => $this->whenCounted('cars'),
            // Flattened plain array (not a nested {data} envelope) for easy
            // consumption by the storefront and admin taxonomy pages.
            'car_models' => $this->whenLoaded('carModels', fn () => $this->carModels->map(fn ($m) => [
                'id' => $m->id,
                'brand_id' => $m->brand_id,
                'name' => $m->name,
                'slug' => $m->slug,
                'chassis_code' => $m->chassis_code,
                'years' => $m->years_label,
                'years_label' => $m->years_label,
                'year_from' => $m->year_from,
                'year_to' => $m->year_to,
                'engines' => $m->engines ?? [],
                'compatible_parts_count' => $m->compatible_parts_count ?? 0,
            ])->values()->all()),
        ];
    }
}
