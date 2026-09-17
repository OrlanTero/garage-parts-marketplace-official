<?php

namespace App\Services;

use App\Enums\PartStatus;
use App\Models\Part;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Validation\ValidationException;

/**
 * Parts module core: seller CRUD + status transitions + marketplace query.
 * Controllers stay thin; all part rules live here.
 */
class PartService
{
    public function create(User $seller, array $data): Part
    {
        $images = $data['images'] ?? $data['media'] ?? null;
        unset($data['images'], $data['media']);

        $part = Part::create([...$data, 'seller_id' => $seller->id]);

        if (is_array($images)) {
            $this->syncMedia($part, $images);
        }

        // Reload so DB defaults and relations reflect on the instance.
        return $part->loadMissing(['seller:id,name', 'media'])->refresh();
    }

    public function update(Part $part, array $data): Part
    {
        $images = $data['images'] ?? $data['media'] ?? null;
        unset($data['status'], $data['seller_id'], $data['published_at'], $data['sold_at'], $data['images'], $data['media']);

        $part->fill($data)->save();

        if (is_array($images)) {
            $this->syncMedia($part, $images);
        }

        return $part->loadMissing(['seller:id,name', 'media'])->refresh();
    }

    public function syncMedia(Part $part, array $items): void
    {
        $part->media()->delete();

        foreach (array_values($items) as $index => $item) {
            if (is_string($item) && filter_var($item, FILTER_VALIDATE_URL)) {
                $part->media()->create([
                    'url' => $item,
                    'type' => 'image',
                    'is_primary' => $index === 0,
                    'order' => $index,
                ]);
            } elseif (is_array($item) && !empty($item['url'])) {
                $part->media()->create([
                    'url' => $item['url'],
                    'type' => $item['type'] ?? 'image',
                    'is_primary' => (bool) ($item['is_primary'] ?? ($index === 0)),
                    'order' => (int) ($item['order'] ?? $index),
                    'caption' => $item['caption'] ?? null,
                ]);
            }
        }
    }

    /** @throws ValidationException on illegal transition */
    public function publish(Part $part): Part
    {
        if ($part->status !== PartStatus::Draft && $part->status !== PartStatus::Archived) {
            throw ValidationException::withMessages([
                'status' => ['Only draft or archived parts can be published.'],
            ]);
        }

        $part->forceFill([
            'status' => PartStatus::Active->value,
            'published_at' => $part->published_at ?? now(),
            'sold_at' => null,
        ])->save();

        return $part->refresh();
    }

    /** @throws ValidationException on illegal transition */
    public function unpublish(Part $part): Part
    {
        if ($part->status !== PartStatus::Active) {
            throw ValidationException::withMessages([
                'status' => ['Only active parts can be unpublished.'],
            ]);
        }

        $part->forceFill(['status' => PartStatus::Draft->value])->save();

        return $part->refresh();
    }

    /** @throws ValidationException on illegal transition */
    public function markSold(Part $part): Part
    {
        if ($part->status !== PartStatus::Active) {
            throw ValidationException::withMessages([
                'status' => ['Only active parts can be marked as sold.'],
            ]);
        }

        $part->forceFill([
            'status' => PartStatus::Sold->value,
            'sold_at' => now(),
        ])->save();

        return $part->refresh();
    }

    public function marketplace(array $filters, int $perPage = 15): LengthAwarePaginator
    {
        return Part::query()
            ->listed()
            ->with(['seller:id,name', 'media'])
            ->filter($filters)
            ->paginate(min(max($perPage, 1), 50));
    }
}
