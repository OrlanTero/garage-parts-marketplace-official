<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Offer extends Model
{
    protected $fillable = [
        'buyer_id',
        'seller_id',
        'conversation_id',
        'sender_id',
        'parent_id',
        'item_type',
        'part_id',
        'car_id',
        'amount',
        'message',
        'status',
        'seller_note',
        'checkout_token',
        'checkout_used_at',
        'confirmed_by',
    ];

    protected function casts(): array
    {
        return ['amount' => 'decimal:2', 'checkout_used_at' => 'datetime'];
    }

    public function buyer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'buyer_id');
    }

    public function seller(): BelongsTo
    {
        return $this->belongsTo(User::class, 'seller_id');
    }

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class);
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(Offer::class, 'parent_id');
    }

    public function confirmer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'confirmed_by');
    }

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_id');
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
