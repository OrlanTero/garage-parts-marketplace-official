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
        $part = Part::create([...$data, 'seller_id' => $seller->id]);

        // Reload so DB defaults (e.g. status=draft) reflect on the instance.
        return $part->refresh();
    }

    public function update(Part $part, array $data): Part
    {
        unset($data['status'], $data['seller_id'], $data['published_at'], $data['sold_at']);
        $part->fill($data)->save();

        return $part->refresh();
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
            ->with('seller:id,name')
            ->filter($filters)
            ->paginate(min(max($perPage, 1), 50));
    }
}
