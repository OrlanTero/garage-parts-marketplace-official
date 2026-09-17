<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MediaResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'url' => $this->url,
            'type' => $this->type ?? 'image',
            'is_primary' => (bool) $this->is_primary,
            'order' => (int) $this->order,
            'caption' => $this->caption,
        ];
    }
}
