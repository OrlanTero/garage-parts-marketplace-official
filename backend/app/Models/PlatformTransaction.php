<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class PlatformTransaction extends Model
{
    use HasFactory;

    protected $fillable = [
        'uuid',
        'transaction_number',
        'reference_number',
        'stream_type',
        'direction',
        'gross_amount',
        'fee_rate',
        'net_amount',
        'balance_after',
        'currency',
        'payment_method',
        'payment_reference',
        'status',
        'user_id',
        'seller_id',
        'car_id',
        'order_id',
        'showroom_slot_id',
        'title',
        'description',
        'metadata',
        'settled_at',
    ];

    protected function casts(): array
    {
        return [
            'gross_amount' => 'decimal:2',
            'fee_rate' => 'decimal:2',
            'net_amount' => 'decimal:2',
            'balance_after' => 'decimal:2',
            'metadata' => 'array',
            'settled_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (PlatformTransaction $transaction) {
            if (empty($transaction->uuid)) {
                $transaction->uuid = (string) Str::uuid();
            }
            if (empty($transaction->transaction_number)) {
                $prefix = match ($transaction->stream_type) {
                    'car_sale_commission' => 'COMM-CAR',
                    'parking_fee' => 'PARK-FEE',
                    'part_sale_commission' => 'COMM-PART',
                    'reservation_fee' => 'RSV-FEE',
                    default => 'TXN',
                };
                $transaction->transaction_number = $prefix . '-' . date('Y') . '-' . strtoupper(Str::random(6));
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

    public function car(): BelongsTo
    {
        return $this->belongsTo(Car::class, 'car_id');
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class, 'order_id');
    }

    public function showroomSlot(): BelongsTo
    {
        return $this->belongsTo(ShowroomSlot::class, 'showroom_slot_id');
    }

    public function scopeCarCommissions(Builder $query): Builder
    {
        return $query->where('stream_type', 'car_sale_commission');
    }

    public function scopeParkingFees(Builder $query): Builder
    {
        return $query->where('stream_type', 'parking_fee');
    }

    public function scopeCompleted(Builder $query): Builder
    {
        return $query->whereIn('status', ['completed', 'settled']);
    }

    /**
     * Record a 5% commission transaction for a completed car sale deal.
     */
    public static function recordCarSaleCommission(
        Car $car,
        ?Order $order = null,
        ?float $dealPrice = null,
        float $rate = 5.0,
        string $paymentMethod = 'bank_transfer',
        ?string $paymentRef = null,
        ?User $buyer = null
    ): self {
        $actualPrice = $dealPrice ?? (float) ($order?->total_amount ?? $car->price);
        $commissionAmount = round($actualPrice * ($rate / 100), 2);
        $buyerId = $buyer?->id ?? $order?->user_id;
        $sellerId = $car->seller_id ?? $order?->seller_id;

        return self::create([
            'stream_type' => 'car_sale_commission',
            'direction' => 'credit',
            'gross_amount' => $actualPrice,
            'fee_rate' => $rate,
            'net_amount' => $commissionAmount,
            'currency' => 'PHP',
            'payment_method' => $paymentMethod,
            'payment_reference' => $paymentRef ?? $order?->order_number ?? ('DEAL-CAR-' . $car->id . '-' . date('Ymd')),
            'reference_number' => $order?->order_number ?? ('VIN-' . substr($car->vin ?? 'CAR', -8)),
            'status' => 'completed',
            'user_id' => $buyerId,
            'seller_id' => $sellerId,
            'car_id' => $car->id,
            'order_id' => $order?->id,
            'title' => "5% Car Sale Commission — {$car->title}",
            'description' => "Platform 5% sales commission collected on actual vehicle deal price of ₱" . number_format($actualPrice, 2),
            'metadata' => [
                'car_title' => $car->title,
                'car_year' => $car->year,
                'car_vin' => $car->vin,
                'deal_price' => $actualPrice,
                'commission_rate' => $rate,
                'buyer_name' => $buyer?->name ?? $order?->buyer_name ?? 'Verified Buyer',
                'seller_username' => $car->seller?->username ?? 'builder',
            ],
            'settled_at' => now(),
        ]);
    }

    /**
     * Record a 5% commission transaction for a parts sale deal.
     */
    public static function recordPartSaleCommission(
        Part $part,
        ?Order $order = null,
        ?float $dealSubtotal = null,
        float $rate = 5.0,
        string $paymentMethod = 'bank_transfer',
        ?string $paymentRef = null,
        ?User $buyer = null
    ): self {
        $actualSubtotal = $dealSubtotal ?? (float) (($order?->unit_price ?? $part->price) * ($order?->quantity ?? 1));
        $commissionAmount = round($actualSubtotal * ($rate / 100), 2);
        $buyerId = $buyer?->id ?? $order?->user_id;
        $sellerId = $part->seller_id ?? $order?->seller_id;

        return self::create([
            'stream_type' => 'part_sale_commission',
            'direction' => 'credit',
            'gross_amount' => $actualSubtotal,
            'fee_rate' => $rate,
            'net_amount' => $commissionAmount,
            'currency' => 'PHP',
            'payment_method' => $paymentMethod,
            'payment_reference' => $paymentRef ?? $order?->order_number ?? ('DEAL-PART-' . $part->id . '-' . date('Ymd')),
            'reference_number' => $order?->order_number ?? ('PART-' . $part->id),
            'status' => 'completed',
            'user_id' => $buyerId,
            'seller_id' => $sellerId,
            'order_id' => $order?->id,
            'title' => "5% Parts Sale Commission - {$part->title}",
            'description' => "Platform 5% sales commission collected on parts deal subtotal of ?" . number_format($actualSubtotal, 2),
            'metadata' => [
                'part_title' => $part->title,
                'part_number' => $part->part_number,
                'deal_subtotal' => $actualSubtotal,
                'commission_rate' => $rate,
                'buyer_name' => $buyer?->name ?? $order?->buyer_name ?? 'Verified Buyer',
                'seller_username' => $part->seller?->username ?? 'builder',
            ],
            'settled_at' => now(),
        ]);
    }

    /**
     * Record a reservation fee transaction (confirmed on seller acceptance
     * for scheduled payments, at once for immediate ones).
     */
    public static function recordReservationFee(Reservation $reservation, string $status = 'pending'): self
    {
        $completed = $status === 'completed';

        return self::create([
            'stream_type' => 'reservation_fee',
            'direction' => 'credit',
            'gross_amount' => (float) $reservation->amount,
            'fee_rate' => (float) $reservation->fee_percentage,
            'net_amount' => (float) $reservation->amount,
            'currency' => 'PHP',
            'payment_method' => $reservation->payment_method ?? 'bank_transfer',
            'payment_reference' => $reservation->payment_reference ?? ('RSV-' . $reservation->id),
            'reference_number' => 'RSV-' . $reservation->id,
            'status' => $completed ? 'completed' : 'pending',
            'user_id' => $reservation->buyer_id,
            'seller_id' => $reservation->seller_id,
            'car_id' => $reservation->car_id,
            'title' => "Reservation Fee ({$reservation->fee_percentage}%) - " . ($reservation->item_type === 'car' ? 'Car Build' : 'Part'),
            'description' => $reservation->scheduled_for
                ? 'Scheduled reservation, seller acceptance required on payment.'
                : 'Immediate reservation payment.',
            'metadata' => [
                'reservation_uuid' => $reservation->uuid,
                'conversation_id' => $reservation->conversation_id,
                'offer_id' => $reservation->offer_id,
                'scheduled_for' => $reservation->scheduled_for?->toIso8601String(),
            ],
            'settled_at' => $completed ? now() : null,
        ]);
    }
    /**
     * Release the held buyer payment to the seller after inspection
     * acceptance. Net of the platform commission already recorded at
     * checkout — this is the seller's payout leg of the escrow.
     */
    public static function recordSellerPayout(Order $order): self
    {
        $payout = round((float) $order->total_amount - (float) ($order->commission_amount ?? 0), 2);

        return self::create([
            'stream_type' => 'seller_payout',
            'direction' => 'debit',
            'gross_amount' => (float) $order->total_amount,
            'fee_rate' => (float) ($order->commission_rate ?? 5.00),
            'net_amount' => $payout,
            'currency' => 'PHP',
            'payment_method' => $order->payment_method ?? 'bank_transfer',
            'payment_reference' => $order->payment_reference ?? $order->order_number,
            'reference_number' => $order->order_number,
            'status' => 'completed',
            'user_id' => $order->user_id,
            'seller_id' => $order->seller_id,
            'car_id' => $order->car_id,
            'order_id' => $order->id,
            'title' => "Seller Payout — {$order->item_name}",
            'description' => 'Escrow released to seller after buyer inspection acceptance of ₱' . number_format((float) $order->total_amount, 2),
            'metadata' => [
                'order_number' => $order->order_number,
                'commission_amount' => (float) ($order->commission_amount ?? 0),
            ],
            'settled_at' => now(),
        ]);
    }

    /**
     * Return the held buyer payment after a dispute resolves to refund.
     */
    public static function recordOrderRefund(Order $order): self
    {
        return self::create([
            'stream_type' => 'order_refund',
            'direction' => 'debit',
            'gross_amount' => (float) $order->total_amount,
            'fee_rate' => 0,
            'net_amount' => (float) $order->total_amount,
            'currency' => 'PHP',
            'payment_method' => $order->payment_method ?? 'bank_transfer',
            'payment_reference' => $order->payment_reference ?? $order->order_number,
            'reference_number' => $order->order_number,
            'status' => 'completed',
            'user_id' => $order->user_id,
            'seller_id' => $order->seller_id,
            'car_id' => $order->car_id,
            'order_id' => $order->id,
            'title' => "Order Refund — {$order->item_name}",
            'description' => 'Held payment refunded to buyer after inspection dispute of ₱' . number_format((float) $order->total_amount, 2),
            'metadata' => [
                'order_number' => $order->order_number,
            ],
            'settled_at' => now(),
        ]);
    }

    public static function recordParkingFee(ShowroomSlot $slot): self
    {
        $car = $slot->car;
        $seller = $slot->seller;
        $fee = (float) $slot->calculated_fee;
        $price = (float) $slot->car_price;
        $rate = (float) $slot->fee_percentage;

        return self::create([
            'stream_type' => 'parking_fee',
            'direction' => 'credit',
            'gross_amount' => $price,
            'fee_rate' => $rate,
            'net_amount' => $fee,
            'currency' => 'PHP',
            'payment_method' => $slot->payment_method ?? 'gcash',
            'payment_reference' => $slot->payment_reference ?? ('GCASH-SHOW-' . $slot->id),
            'reference_number' => 'SLOT-#' . $slot->id,
            'status' => $slot->status === 'approved' ? 'completed' : 'pending',
            'user_id' => $seller?->id,
            'seller_id' => $seller?->id,
            'car_id' => $car?->id,
            'showroom_slot_id' => $slot->id,
            'title' => "Showroom Parking Placement Fee — " . ($car?->title ?? "Build #{$slot->id}"),
            'description' => "Standard {$rate}% showroom parking slot fee on listing value of ₱" . number_format($price, 2),
            'metadata' => [
                'car_title' => $car?->title,
                'seller_username' => $seller?->username,
                'listing_price' => $price,
                'slot_uuid' => $slot->uuid,
            ],
            'settled_at' => $slot->status === 'approved' ? ($slot->approved_at ?? now()) : null,
        ]);
    }
}
