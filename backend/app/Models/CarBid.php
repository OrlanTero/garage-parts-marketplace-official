<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class CarBid extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid',
        'car_auction_id',
        'user_id',
        'bidder_name',
        'bidder_email',
        'bidder_phone',
        'bid_amount',
        'status',
        'ip_address',
    ];

    protected $casts = [
        'bid_amount' => 'decimal:2',
    ];

    protected static function booted(): void
    {
        static::creating(function ($bid) {
            if (empty($bid->uuid)) {
                $bid->uuid = (string) Str::uuid();
            }
        });
    }

    public function auction(): BelongsTo
    {
        return $this->belongsTo(CarAuction::class, 'car_auction_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
