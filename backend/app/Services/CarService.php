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

        // Default approval status: Admins and authorized Dealers are pre-approved
        $isPreApproved = $seller->isAdmin() || $seller->isDealer();
        $initialStatus = $data['status'] ?? CarStatus::Draft->value;
        $isApproved = $data['is_approved'] ?? $isPreApproved;

        $car = Car::create([
            ...$data,
            'seller_id' => $seller->id,
            'is_approved' => $isApproved,
            'status' => $initialStatus,
            'published_at' => ($initialStatus === CarStatus::Active->value && $isApproved) ? now() : null,
        ]);

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
            if (is_string($item) && (filter_var($item, FILTER_VALIDATE_URL) || str_starts_with($item, '/') || str_starts_with($item, 'http'))) {
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
                    'file_path' => $item['file_path'] ?? null,
                    'file_name' => $item['file_name'] ?? null,
                    'mime_type' => $item['mime_type'] ?? null,
                    'size_bytes' => isset($item['size_bytes']) ? (int) $item['size_bytes'] : null,
                ]);
            }
        }
    }

    /** @throws ValidationException on illegal transition */
    public function publish(Car $car): Car
    {
        $allowedStatuses = [CarStatus::Draft, CarStatus::Archived, CarStatus::Rejected, CarStatus::PendingInspection];
        if (!in_array($car->status, $allowedStatuses)) {
            throw ValidationException::withMessages([
                'status' => ['Only draft, archived, rejected, or pending cars can be published/submitted.'],
            ]);
        }

        $prev = $car->status->value ?? (string) $car->status;

        $car->forceFill([
            'status' => CarStatus::Active->value,
            'is_approved' => true,
            'published_at' => $car->published_at ?? now(),
            'sold_at' => null,
        ])->save();

        $car = $car->refresh();

        event(new CarStatusChanged($car, $prev));

        return $car;
    }

    public function scheduleInspection(Car $car, array $data, ?User $admin = null): Car
    {
        $car->forceFill([
            'inspection_type' => $data['inspection_type'] ?? 'garage_dropoff',
            'inspection_status' => 'scheduled',
            'inspection_date' => $data['inspection_date'] ?? now()->addDays(2),
            'inspection_location' => $data['inspection_location'] ?? 'Main Garage Inspection Bay',
            'inspector_id' => $data['inspector_id'] ?? $admin?->id,
            'inspector_notes' => $data['notes'] ?? $car->inspector_notes,
            'status' => CarStatus::PendingInspection->value,
        ])->save();

        return $car->loadMissing(['seller:id,name', 'inspector:id,name', 'media'])->refresh();
    }

    public function recordInspection(Car $car, array $data, ?User $inspector = null): Car
    {
        $passed = filter_var($data['passed'] ?? true, FILTER_VALIDATE_BOOLEAN);

        $car->forceFill([
            'inspection_score' => $data['inspection_score'] ?? ($passed ? '95/100' : '55/100'),
            'inspector_notes' => $data['notes'] ?? $data['inspector_notes'] ?? null,
            'inspection_status' => $passed ? 'passed' : 'failed',
            'inspector_id' => $inspector?->id ?? $car->inspector_id,
            'status' => $passed ? CarStatus::Inspected->value : CarStatus::Rejected->value,
            'rejection_reason' => $passed ? null : ($data['rejection_reason'] ?? 'Failed vehicle roadworthiness and inspection checklist.'),
        ])->save();

        return $car->loadMissing(['seller:id,name', 'inspector:id,name', 'media'])->refresh();
    }

    public function approveListing(Car $car, User $admin): Car
    {
        $prev = $car->status->value ?? (string) $car->status;

        $car->forceFill([
            'status' => CarStatus::Active->value,
            'is_approved' => true,
            'approved_by' => $admin->id,
            'approved_at' => now(),
            'published_at' => $car->published_at ?? now(),
            'rejection_reason' => null,
            'inspection_status' => $car->inspection_status === 'failed' ? 'passed' : ($car->inspection_status ?? 'passed'),
        ])->save();

        $car = $car->loadMissing(['seller:id,name', 'approver:id,name', 'media'])->refresh();

        event(new CarStatusChanged($car, $prev));

        return $car;
    }

    public function rejectListing(Car $car, string $reason, User $admin): Car
    {
        $prev = $car->status->value ?? (string) $car->status;

        $car->forceFill([
            'status' => CarStatus::Rejected->value,
            'is_approved' => false,
            'rejection_reason' => $reason,
        ])->save();

        $car = $car->loadMissing(['seller:id,name', 'media'])->refresh();

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
            ->with(['seller:id,name,username,avatar_url,is_kyc_verified,kyc_status,role', 'media'])
            ->filter($filters)
            ->paginate(min(max($perPage, 1), 50));
    }
}
