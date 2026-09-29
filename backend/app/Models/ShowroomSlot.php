<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class ShowroomSlot extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid',
        'seller_id',
        'car_id',
        'car_price',
        'fee_percentage',
        'calculated_fee',
        'payment_method',
        'payment_reference',
        'payment_proof_url',
        'status',
        'seller_notes',
        'admin_notes',
        'approved_by',
        'approved_at',
        'expires_at',
    ];

    protected $casts = [
        'car_price' => 'decimal:2',
        'fee_percentage' => 'decimal:2',
        'calculated_fee' => 'decimal:2',
        'approved_at' => 'datetime',
        'expires_at' => 'datetime',
    ];

    protected static function booted(): void
    {
        static::creating(function ($slot) {
            if (empty($slot->uuid)) {
                $slot->uuid = (string) Str::uuid();
            }
        });
    }

    public function seller(): BelongsTo
    {
        return $this->belongsTo(User::class, 'seller_id');
    }

    public function car(): BelongsTo
    {
        return $this->belongsTo(Car::class, 'car_id');
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}
