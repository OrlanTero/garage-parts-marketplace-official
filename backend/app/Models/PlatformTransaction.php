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
                    'agent_subscription' => 'AGENT-SUB',
                    'agent_referral_reward' => 'AGENT-RWD',
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
     * Record the seller payout for an order exactly once.
     * Returns the existing payout when one is already recorded.
     */
    public static function recordPayoutOnce(Order $order): self
    {
        $existing = self::where('order_id', $order->id)
            ->where('stream_type', 'seller_payout')
            ->first();
        if ($existing) {
            return $existing;
        }

        return self::recordSellerPayout($order);
    }

    /**
     * Release the held buyer payment to the seller after inspection
     * acceptance (cars), or settle the captured payment on completion
     * (parts direct capture). Net of the platform commission already
     * recorded at checkout.
     */
    public static function recordSellerPayout(Order $order): self
    {
        $payout = round((float) $order->total_amount - (float) ($order->commission_amount ?? 0), 2);
        $isCar = ($order->item_type ?? 'part') === 'car';

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
            'description' => $isCar
                ? 'Escrow released to seller after buyer inspection acceptance of ₱' . number_format((float) $order->total_amount, 2)
                : 'Captured payment settled to seller on order completion of ₱' . number_format((float) $order->total_amount, 2),
            'metadata' => [
                'order_number' => $order->order_number,
                'item_type' => $order->item_type,
                'part_id' => $order->part_id,
                'commission_amount' => (float) ($order->commission_amount ?? 0),
            ],
            'settled_at' => now(),
        ]);
    }

    /**
     * Settle a referral agent's commission into their wallet when the
     * referred order completes. Idempotent: an existing settlement for
     * the order is returned, and orders without an attributed agent (or
     * with a zero/settled commission) yield nothing. Flips the order's
     * commission_status to `settled` so the agent portal reflects reality.
     */
    public static function recordAgentCommission(Order $order): ?self
    {
        if (empty($order->agent_id) || (float) ($order->commission_amount ?? 0) <= 0) {
            return null;
        }
        if (($order->commission_status ?? 'pending') === 'settled') {
            return self::where('order_id', $order->id)
                ->where('stream_type', 'agent_commission')
                ->first();
        }

        $existing = self::where('order_id', $order->id)
            ->where('stream_type', 'agent_commission')
            ->first();
        if ($existing) {
            $order->forceFill(['commission_status' => 'settled'])->save();
            return $existing;
        }

        $amount = round((float) $order->commission_amount, 2);
        $txn = self::create([
            'stream_type' => 'agent_commission',
            'direction' => 'credit',
            'gross_amount' => $amount,
            'fee_rate' => (float) ($order->commission_rate ?? 5.00),
            'net_amount' => $amount,
            'currency' => 'PHP',
            'payment_method' => $order->payment_method ?? 'bank_transfer',
            'payment_reference' => $order->payment_reference ?? $order->order_number,
            'reference_number' => $order->order_number,
            'status' => 'completed',
            'user_id' => $order->agent_id,
            'seller_id' => $order->seller_id,
            'car_id' => $order->car_id,
            'order_id' => $order->id,
            'title' => "Agent Commission — {$order->item_name}",
            'description' => 'Referral commission of ₱' . number_format($amount, 2)
                . " settled to agent on completion of {$order->order_number}",
            'metadata' => [
                'order_number' => $order->order_number,
                'item_type' => $order->item_type,
                'part_id' => $order->part_id,
                'agent_code' => $order->agent_code,
                'commission_rate' => (float) ($order->commission_rate ?? 5.00),
            ],
            'settled_at' => now(),
        ]);

        $order->forceFill(['commission_status' => 'settled'])->save();

        try {
            app(\App\Services\NotificationService::class)->send(
                (int) $order->agent_id,
                'payout',
                'Commission settled ₱' . number_format($amount, 2),
                "Your referral on {$order->order_number} completed — earnings are in your wallet.",
                ['order_id' => $order->id, 'order_number' => $order->order_number, 'amount' => $amount],
                '/wallet',
            );
        } catch (\Throwable $e) {
            report($e);
        }

        return $txn;
    }

    /**
     * Record a yearly Sales Agent subscription fee payment.
     * Garage revenue: the fee is credited to the house garage account
     * (seller_id = house user) so it shows in garage treasury reports.
     * Idempotent per subscription id via metadata lookup.
     */
    public static function recordAgentSubscriptionFee(User $user, AgentSubscription $subscription): self
    {
        $existing = self::where('stream_type', 'agent_subscription')
            ->whereJsonContains('metadata->agent_subscription_id', $subscription->id)
            ->first();
        if ($existing) {
            return $existing;
        }

        $garageId = User::house()?->id;

        return self::create([
            'stream_type' => 'agent_subscription',
            'direction' => 'credit',
            'gross_amount' => (float) $subscription->amount,
            'fee_rate' => 0,
            'net_amount' => (float) $subscription->amount,
            'currency' => 'PHP',
            'payment_method' => $subscription->payment_method ?? 'gcash',
            'payment_reference' => $subscription->payment_reference ?? ('AGENT-SUB-' . $subscription->id),
            'reference_number' => $subscription->payment_reference ?? $subscription->uuid,
            'status' => 'completed',
            'user_id' => $user->id,
            'seller_id' => $garageId,
            'title' => "Sales Agent Subscription — {$user->name}",
            'description' => 'Yearly Sales Agent subscription fee of ₱' . number_format((float) $subscription->amount, 2)
                . ' credited to garage revenue.',
            'metadata' => [
                'agent_subscription_id' => $subscription->id,
                'agent_code' => $user->agent_code,
                'garage_revenue' => true,
                'mock_account_name' => $subscription->metadata['mock_account_name'] ?? null,
                'mock_account_last4' => isset($subscription->metadata['mock_account_number'])
                    ? substr(preg_replace('/\D/', '', (string) $subscription->metadata['mock_account_number']), -4)
                    : null,
                'starts_at' => $subscription->starts_at?->toIso8601String(),
                'expires_at' => $subscription->expires_at?->toIso8601String(),
            ],
            'settled_at' => now(),
        ]);
    }

    /**
     * Credit a ₱50 (parameterized) referral reward to the referrer's wallet
     * when their referred user qualifies as an active Sales Agent.
     * Idempotent per referred user id.
     */
    public static function recordAgentReferralReward(User $referrer, User $referred, ?AgentSubscription $subscription = null): self
    {
        $existing = self::where('stream_type', 'agent_referral_reward')
            ->whereJsonContains('metadata->referred_user_id', $referred->id)
            ->first();
        if ($existing) {
            return $existing;
        }

        $amount = round((float) \App\Models\PlatformSetting::get('agent_referral_reward', 50), 2);

        return self::create([
            'stream_type' => 'agent_referral_reward',
            'direction' => 'credit',
            'gross_amount' => $amount,
            'fee_rate' => 0,
            'net_amount' => $amount,
            'currency' => 'PHP',
            'payment_method' => 'wallet',
            'payment_reference' => 'AGENT-RWD-' . $referred->id . '-' . date('Ymd'),
            'reference_number' => $referred->agent_code ?? ('USER-' . $referred->id),
            'status' => 'completed',
            'user_id' => $referrer->id,
            'seller_id' => null,
            'title' => "Agent Referral Reward — @{$referred->username}",
            'description' => 'Referral reward of ₱' . number_format($amount, 2)
                . " — @{$referred->username} became an active Sales Agent with your referral code.",
            'metadata' => [
                'referred_user_id' => $referred->id,
                'referred_agent_code' => $referred->agent_code,
                'referrer_agent_code' => $referrer->agent_code,
                'agent_subscription_id' => $subscription?->id,
                'reward_config' => $amount,
            ],
            'settled_at' => now(),
        ]);
    }

    /**
     * Return the buyer payment after a dispute resolves to refund —
     * the held escrow leg (cars) or the captured payment (parts).
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
            'description' => (($order->item_type ?? 'part') === 'car' ? 'Held payment' : 'Captured payment')
                . ' refunded to buyer after dispute of ₱' . number_format((float) $order->total_amount, 2),
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
