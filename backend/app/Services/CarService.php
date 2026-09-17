<?php

namespace App\Services;

use App\Enums\CarStatus;
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
        $car = Car::create([...$data, 'seller_id' => $seller->id]);

        // Reload so DB defaults (e.g. status=draft) reflect on the instance.
        return $car->refresh();
    }

    public function update(Car $car, array $data): Car
    {
        unset($data['status'], $data['seller_id'], $data['published_at'], $data['sold_at']);
        $car->fill($data)->save();

        return $car->refresh();
    }

    /** @throws ValidationException on illegal transition */
    public function publish(Car $car): Car
    {
        if ($car->status !== CarStatus::Draft && $car->status !== CarStatus::Archived) {
            throw ValidationException::withMessages([
                'status' => ['Only draft or archived cars can be published.'],
            ]);
        }

        $car->forceFill([
            'status' => CarStatus::Active->value,
            'published_at' => $car->published_at ?? now(),
            'sold_at' => null,
        ])->save();

        return $car->refresh();
    }

    /** @throws ValidationException on illegal transition */
    public function unpublish(Car $car): Car
    {
        if ($car->status !== CarStatus::Active) {
            throw ValidationException::withMessages([
                'status' => ['Only active cars can be unpublished.'],
            ]);
        }

        $car->forceFill(['status' => CarStatus::Draft->value])->save();

        return $car->refresh();
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

        return $car->refresh();
    }

    public function marketplace(array $filters, int $perPage = 15): LengthAwarePaginator
    {
        return Car::query()
            ->listed()
            ->with('seller:id,name')
            ->filter($filters)
            ->paginate(min(max($perPage, 1), 50));
    }
}
