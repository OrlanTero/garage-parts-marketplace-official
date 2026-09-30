<?php

namespace App\Services;

use App\Models\AgentSubscription;
use App\Models\PlatformSetting;
use App\Models\PlatformTransaction;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Sales Agent subscription core.
 *
 * Becoming a Sales Agent requires BOTH:
 *  1. verified KYC (kyc_status=approved + is_kyc_verified), and
 *  2. an active yearly subscription (default ₱100/yr, parameterized in admin panel).
 *
 * Referral reward: when a user who signed up with someone's referral code
 * (users.referred_by_user_id) ALSO becomes an active agent (KYC + paid fee),
 * the referrer gets ₱50 (parameterized) credited to their wallet exactly once.
 */
class AgentService
{
    public const DEFAULT_CAR_PCT = 3.0;
    public const DEFAULT_PART_PCT = 10.0;

    public static function fee(): float
    {
        return round((float) (PlatformSetting::get('agent_subscription_fee', 100)), 2);
    }

    /**
     * Referral commission % by item type (admin-parameterized).
     * Personal commission_rate override on the agent wins when set.
     */
    public static function commissionFor(string $itemType, ?float $override = null): float
    {
        if ($override !== null && $override >= 0) {
            return round($override, 2);
        }

        return $itemType === 'car'
            ? round((float) PlatformSetting::get('agent_commission_car_pct', self::DEFAULT_CAR_PCT), 2)
            : round((float) PlatformSetting::get('agent_commission_part_pct', self::DEFAULT_PART_PCT), 2);
    }

    public static function referralReward(): float
    {
        return round((float) (PlatformSetting::get('agent_referral_reward', 50)), 2);
    }

    public static function durationDays(): int
    {
        return max(1, (int) (PlatformSetting::get('agent_subscription_duration_days', 365)));
    }

    /**
     * Is this user currently an ACTIVE sales agent?
     * Active = KYC verified + subscription_status=active + not expired.
     * Auto-flips stale `active` rows to `expired` on read.
     */
    public static function isActive(?User $user): bool
    {
        if (! $user) {
            return false;
        }

        $user->refreshIfStaleSubscription();

        return $user->isAgentActive();
    }

    /**
     * Subscribe / renew the yearly agent subscription (mock pay + auto-activate).
     *
     * @throws ValidationException when KYC is not verified.
     */
    public static function subscribe(User $user, string $paymentMethod = 'gcash', ?string $paymentReference = null, array $paymentMeta = []): AgentSubscription
    {
        $user = $user->refresh();

        if (! $user->isKycVerified()) {
            throw ValidationException::withMessages([
                'kyc' => ['Verified KYC is required before activating the Sales Agent subscription.'],
            ]);
        }

        $fee = static::fee();
        $days = static::durationDays();
        $now = now();

        // Renewals extend from the current expiry when still active, otherwise from now.
        $base = ($user->agent_subscription_status === 'active' && $user->agent_expires_at && $user->agent_expires_at->isFuture())
            ? $user->agent_expires_at
            : $now;
        $startsAt = $user->agent_subscription_status === 'active' && $user->agent_expires_at && $user->agent_expires_at->isFuture()
            ? $now
            : $now;
        $expiresAt = (clone $base)->addDays($days);

        return DB::transaction(function () use ($user, $fee, $paymentMethod, $paymentReference, $paymentMeta, $startsAt, $expiresAt) {
            // Expire prior active rows (history preserved).
            AgentSubscription::where('user_id', $user->id)
                ->where('status', 'active')
                ->update(['status' => 'renewed']);

            $subscription = AgentSubscription::create([
                'user_id' => $user->id,
                'amount' => $fee,
                'status' => 'active',
                'payment_method' => $paymentMethod,
                'payment_reference' => $paymentReference,
                'starts_at' => $startsAt,
                'expires_at' => $expiresAt,
                'metadata' => array_merge([
                    'fee_config' => $fee,
                    'duration_days' => static::durationDays(),
                    'mock_payment' => true,
                ], $paymentMeta),
            ]);

            $user->forceFill([
                'is_agent' => true,
                'agent_subscription_status' => 'active',
                'agent_subscribed_at' => $user->agent_subscribed_at ?? $startsAt,
                'agent_expires_at' => $expiresAt,
                'agent_last_payment_at' => $startsAt,
                'agent_last_payment_amount' => $fee,
            ])->save();

            PlatformTransaction::recordAgentSubscriptionFee($user, $subscription);

            // New agent just qualified — pay the referrer exactly once (if any).
            static::maybeRewardReferrer($user->refresh(), $subscription);

            return $subscription;
        });
    }

    /**
     * Credit the referrer ₱50 (parameterized) when the referred user qualifies
     * as an active agent (KYC approved + subscription active). Idempotent:
     * returns null when not eligible or when the reward was already paid.
     */
    public static function maybeRewardReferrer(User $user, ?AgentSubscription $subscription = null): ?PlatformTransaction
    {
        $user = $user->refresh();

        if (empty($user->referred_by_user_id)) {
            return null;
        }

        if (! $user->isKycVerified()) {
            return null;
        }

        $user->refreshIfStaleSubscription();
        if (! $user->isAgentActive()) {
            return null;
        }

        if (! empty($user->referral_reward_paid_at)) {
            return PlatformTransaction::where('stream_type', 'agent_referral_reward')
                ->whereJsonContains('metadata->referred_user_id', $user->id)
                ->first();
        }

        $existing = PlatformTransaction::where('stream_type', 'agent_referral_reward')
            ->whereJsonContains('metadata->referred_user_id', $user->id)
            ->first();
        if ($existing) {
            $user->forceFill(['referral_reward_paid_at' => $existing->created_at ?? now()])->save();
            return $existing;
        }

        $referrer = User::find($user->referred_by_user_id);
        if (! $referrer) {
            return null;
        }

        // No self-reward.
        if ((int) $referrer->id === (int) $user->id) {
            return null;
        }

        return DB::transaction(function () use ($user, $referrer, $subscription) {
            // Re-check inside the lock window.
            $fresh = $user->refresh();
            if (! empty($fresh->referral_reward_paid_at)) {
                return null;
            }
            $dup = PlatformTransaction::where('stream_type', 'agent_referral_reward')
                ->whereJsonContains('metadata->referred_user_id', $fresh->id)
                ->first();
            if ($dup) {
                return $dup;
            }

            $txn = PlatformTransaction::recordAgentReferralReward($referrer, $fresh, $subscription);

            $fresh->forceFill(['referral_reward_paid_at' => now()])->save();

            try {
                app(NotificationService::class)->send(
                    (int) $referrer->id,
                    'payout',
                    '₱' . number_format((float) $txn->net_amount, 2) . ' referral reward earned',
                    "@{$fresh->username} became a Sales Agent with your referral — reward credited to your wallet.",
                    ['referred_user_id' => $fresh->id, 'amount' => (float) $txn->net_amount],
                    '/wallet',
                );
            } catch (\Throwable $e) {
                report($e);
            }

            return $txn;
        });
    }
}
