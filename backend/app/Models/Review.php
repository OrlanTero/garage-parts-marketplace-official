<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Review extends Model
{
    protected $fillable = [
        'buyer_id',
        'seller_id',
        'item_type',
        'part_id',
        'car_id',
        'rating',
        'title',
        'body',
        'is_verified_purchase',
        'is_visible',
    ];

    protected function casts(): array
    {
        return [
            'rating' => 'integer',
            'is_verified_purchase' => 'boolean',
            'is_visible' => 'boolean',
        ];
    }

    public function buyer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'buyer_id');
    }

    public function seller(): BelongsTo
    {
        return $this->belongsTo(User::class, 'seller_id');
    }

    public function part(): BelongsTo
    {
        return $this->belongsTo(Part::class, 'part_id');
    }

    public function car(): BelongsTo
    {
        return $this->belongsTo(Car::class, 'car_id');
    }

    /**
     * Recompute a listing's live rating + visible review count.
     * Call after every review create / update / delete / visibility change.
     */
    public static function refreshListingRating(string $itemType, ?int $partId, ?int $carId): void
    {
        $base = static::query()
            ->where('item_type', $itemType)
            ->where('is_visible', true)
            ->when($partId, fn ($q) => $q->where('part_id', $partId))
            ->when($carId, fn ($q) => $q->where('car_id', $carId));

        $count = (clone $base)->count();
        $avg = $count > 0 ? round((float) (clone $base)->avg('rating'), 2) : null;

        if ($itemType === 'car' && $carId && ($car = Car::find($carId))) {
            $car->forceFill([
                'rating' => $avg ?? 5.00,
                'reviews_count' => $count,
            ])->saveQuietly();
        }

        if ($itemType === 'part' && $partId && ($part = Part::find($partId))) {
            $part->forceFill([
                'rating' => $avg ?? 5.00,
                'reviews_count' => $count,
            ])->saveQuietly();
        }
    }
}
