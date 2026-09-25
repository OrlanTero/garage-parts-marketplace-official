<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Order extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'order_number',
        'user_id',
        'buyer_name',
        'buyer_email',
        'buyer_phone',
        'shipping_address',
        'shipping_city',
        'shipping_postal_code',
        'delivery_latitude',
        'delivery_longitude',
        'delivery_label',
        'chassis_number',
        'vin',
        'vehicle_make_model',
        'item_type',
        'part_id',
        'car_id',
        'seller_id',
        'agent_id',
        'agent_code',
        'agent_name',
        'item_name',
        'item_sku',
        'item_image_url',
        'seller_name',
        'quantity',
        'unit_price',
        'shipping_fee',
        'total_amount',
        'commission_rate',
        'commission_amount',
        'commission_status',
        'payment_method',
        'payment_status',
        'status',
        'verification_status',
        'verification_note',
        'tracking_number',
        'carrier',
        'notes',
    ];

    protected function casts(): array
    {
        return [
            'quantity' => 'integer',
            'unit_price' => 'decimal:2',
            'shipping_fee' => 'decimal:2',
            'total_amount' => 'decimal:2',
            'commission_rate' => 'decimal:2',
            'commission_amount' => 'decimal:2',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (Order $order) {
            if (empty($order->order_number)) {
                $order->order_number = 'SO-' . date('Y') . '-' . strtoupper(Str::random(6));
            }
        });
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function seller(): BelongsTo
    {
        return $this->belongsTo(User::class, 'seller_id');
    }

    public function agent(): BelongsTo
    {
        return $this->belongsTo(User::class, 'agent_id');
    }

    public function part(): BelongsTo
    {
        return $this->belongsTo(Part::class, 'part_id');
    }

    public function car(): BelongsTo
    {
        return $this->belongsTo(Car::class, 'car_id');
    }
}
