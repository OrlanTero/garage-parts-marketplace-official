<?php

namespace App\Services;

use App\Enums\CarStatus;
use App\Events\CarCreated;
use App\Events\CarSold;
use App\Events\CarStatusChanged;
use App\Events\CarUpdated;
use App\Models\Car;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Validation\ValidationException;

/**
 * Cars module core: seller CRUD + status transitions + marketplace query.
 * Controllers stay thin; all car rules live here.
 */
class CarService
{
    public function create(User $seller, array $data): Car
    {
        $images = $data['images'] ?? $data['media'] ?? null;
        unset($data['images'], $data['media']);

        $car = Car::create([...$data, 'seller_id' => $seller->id]);

        if (is_array($images)) {
            $this->syncMedia($car, $images);
        }

        // Reload so DB defaults and relations reflect on the instance.
        $car = $car->loadMissing(['seller:id,name', 'media'])->refresh();

        event(new CarCreated($car));

        return $car;
    }

    public function update(Car $car, array $data): Car
    {
        $images = $data['images'] ?? $data['media'] ?? null;
        unset($data['status'], $data['seller_id'], $data['published_at'], $data['sold_at'], $data['images'], $data['media']);

        $car->fill($data)->save();

        if (is_array($images)) {
            $this->syncMedia($car, $images);
        }

        $car = $car->loadMissing(['seller:id,name', 'media'])->refresh();

        event(new CarUpdated($car));

        return $car;
    }

    public function syncMedia(Car $car, array $items): void
    {
        $car->media()->delete();

        foreach (array_values($items) as $index => $item) {
            if (is_string($item) && filter_var($item, FILTER_VALIDATE_URL)) {
                $car->media()->create([
                    'url' => $item,
                    'type' => 'image',
                    'is_primary' => $index === 0,
                    'order' => $index,
                ]);
            } elseif (is_array($item) && !empty($item['url'])) {
                $car->media()->create([
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
    public function publish(Car $car): Car
    {
        if ($car->status !== CarStatus::Draft && $car->status !== CarStatus::Archived) {
            throw ValidationException::withMessages([
                'status' => ['Only draft or archived cars can be published.'],
            ]);
        }

        $prev = $car->status->value ?? (string) $car->status;

        $car->forceFill([
            'status' => CarStatus::Active->value,
            'published_at' => $car->published_at ?? now(),
            'sold_at' => null,
        ])->save();

        $car = $car->refresh();

        event(new CarStatusChanged($car, $prev));

        return $car;
    }

    /** @throws ValidationException on illegal transition */
    public function unpublish(Car $car): Car
    {
        if ($car->status !== CarStatus::Active) {
            throw ValidationException::withMessages([
                'status' => ['Only active cars can be unpublished.'],
            ]);
        }

        $prev = $car->status->value ?? (string) $car->status;

        $car->forceFill(['status' => CarStatus::Draft->value])->save();

        $car = $car->refresh();

        event(new CarStatusChanged($car, $prev));

        return $car;
    }

    /** @throws ValidationException on illegal transition */
    public function markSold(Car $car): Car
    {
        if ($car->status !== CarStatus::Active) {
            throw ValidationException::withMessages([
                'status' => ['Only active cars can be marked as sold.'],
            ]);
        }

        $car->forceFill([
            'status' => CarStatus::Sold->value,
            'sold_at' => now(),
        ])->save();

        $car = $car->refresh();

        event(new CarSold($car));

        return $car;
    }

    public function marketplace(array $filters, int $perPage = 15): LengthAwarePaginator
    {
        return Car::query()
            ->listed()
            ->with(['seller:id,name', 'media'])
            ->filter($filters)
            ->paginate(min(max($perPage, 1), 50));
    }
}
