<?php

namespace App\Http\Resources;

use App\Models\Car;
use App\Models\Part;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class FavoriteResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $type = match ($this->favoritable_type) {
            Car::class => 'car',
            Part::class => 'part',
            default => 'item',
        };

        $itemData = null;
        if ($this->relationLoaded('favoritable') && $this->favoritable) {
            if ($this->favoritable instanceof Car) {
                $itemData = (new CarResource($this->favoritable))->toArray($request);
            } elseif ($this->favoritable instanceof Part) {
                $itemData = (new PartResource($this->favoritable))->toArray($request);
            }
        }

        return [
            'id' => $this->id,
            'type' => $type,
            'item_id' => $this->favoritable_id,
            'is_saved' => true,
            'item' => $itemData,
            'created_at' => $this->created_at,
        ];
    }
}
