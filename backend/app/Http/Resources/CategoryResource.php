<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CategoryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'code' => $this->code,
            'description' => $this->description,
            'image_url' => $this->image_url,
            'icon' => $this->icon,
            'is_active' => (bool) $this->is_active,
            // Live computed counts — replaces hardcoded "1,420 items".
            'parts_count' => $this->whenCounted('parts', $this->parts_count ?? null),
            'subcategories' => $this->whenLoaded('subcategories', fn () => $this->subcategories->map(fn ($s) => [
                'id' => $s->id,
                'name' => $s->name,
                'slug' => $s->slug,
                'description' => $s->description,
            ])),
        ];
    }
}
