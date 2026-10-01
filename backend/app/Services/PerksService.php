<?php

namespace App\Services;

use App\Models\PlatformSetting;
use App\Models\PlatformTransaction;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Member perks (discount club) core.
 *
 * Any signed-in user can subscribe: ₱100/yr (parameterized) unlocks
 * per-part member discounts (0–30% set per listing, capped) plus the
 * merchant perks catalog (tires, mags, mechanics, carwash…).
 */
class PerksService
{
    public const DEFAULT_FEE = 100.0;
    public const DEFAULT_DURATION_DAYS = 365;
    public const MAX_PART_DISCOUNT_PCT = 30;

    public static function fee(): float
    {
        return round((float) (PlatformSetting::get('perks_subscription_fee', self::DEFAULT_FEE)), 2);
    }

    public static function durationDays(): int
    {
        return max(1, (int) (PlatformSetting::get('perks_subscription_duration_days', self::DEFAULT_DURATION_DAYS)));
    }

    public static function maxPartDiscountPct(): int
    {
        return max(0, min(100, (int) (PlatformSetting::get('perks_max_part_discount_pct', self::MAX_PART_DISCOUNT_PCT))));
    }

    /** Active = status active + not expired. Auto-flips stale rows on read. */
    public static function isActive(?User $user): bool
    {
        if (!$user) {
            return false;
        }
        if (($user->perks_status ?? 'inactive') !== 'active') {
            return false;
        }
        if ($user->perks_expires_at && $user->perks_expires_at->isPast()) {
            $user->forceFill(['perks_status' => 'expired'])->save();
            return false;
        }
        return true;
    }

    /** Subscribe / renew the yearly perks membership (mock pay + auto-activate). */
    public static function subscribe(User $user, string $paymentMethod = 'gcash', ?string $paymentReference = null): User
    {
        $user = $user->refresh();
        $fee = static::fee();
        $days = static::durationDays();
        $now = now();

        $base = ($user->perks_status === 'active' && $user->perks_expires_at && $user->perks_expires_at->isFuture())
            ? $user->perks_expires_at
            : $now;
        $expiresAt = (clone $base)->addDays($days);

        return DB::transaction(function () use ($user, $fee, $paymentMethod, $paymentReference, $now, $expiresAt) {
            $user->forceFill([
                'perks_status' => 'active',
                'perks_subscribed_at' => $user->perks_subscribed_at ?? $now,
                'perks_expires_at' => $expiresAt,
                'perks_last_payment_at' => $now,
                'perks_last_payment_amount' => $fee,
            ])->save();

            PlatformTransaction::create([
                'stream_type' => 'perks_subscription',
                'direction' => 'credit',
                'gross_amount' => $fee,
                'fee_rate' => 0,
                'net_amount' => $fee,
                'currency' => 'PHP',
                'payment_method' => $paymentMethod,
                'payment_reference' => $paymentReference ?? ('PERKS-' . $user->id . '-' . $now->format('Ymd')),
                'reference_number' => 'PERKS-' . $user->id . '-' . $now->format('YmdHis'),
                'status' => 'completed',
                'user_id' => $user->id,
                'seller_id' => User::house()?->id,
                'title' => "Member Perks Subscription - {$user->name}",
                'description' => 'Yearly member perks subscription fee of ₱' . number_format($fee, 2),
                'metadata' => ['duration_days' => static::durationDays(), 'mock_payment' => true],
            ]);

            return $user->refresh();
        });
    }

    /**
     * Member discount for one parts line (capped). Cars never discount.
     * @return array{pct:int,amount:float}
     */
    public static function lineDiscount(?User $buyer, $part, float $unitPrice, int $quantity): array
    {
        if (!static::isActive($buyer) || !$part) {
            return ['pct' => 0, 'amount' => 0.0];
        }
        $cap = static::maxPartDiscountPct();
        $pct = max(0, min($cap, (int) ($part->perks_discount_pct ?? 0)));
        if ($pct <= 0 || $quantity <= 0) {
            return ['pct' => 0, 'amount' => 0.0];
        }

        return ['pct' => $pct, 'amount' => round($unitPrice * $quantity * ($pct / 100), 2)];
    }
}
