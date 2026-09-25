<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Offer extends Model
{
    protected $fillable = [
        'buyer_id',
        'seller_id',
        'item_type',
        'part_id',
        'car_id',
        'amount',
        'message',
        'status',
        'seller_note',
    ];

    protected function casts(): array
    {
        return ['amount' => 'decimal:2'];
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

    /** Human listing title for inbox display. */
    public function getItemTitleAttribute(): ?string
    {
        return $this->item_type === 'car'
            ? $this->car?->title
            : $this->part?->title;
    }
}
