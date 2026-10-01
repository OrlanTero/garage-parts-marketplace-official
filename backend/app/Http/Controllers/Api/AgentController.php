<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Models\PlatformTransaction;
use App\Models\User;
use App\Services\AgentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AgentController extends Controller
{
    /**
     * Public verification of an agent referral code.
     * Only ACTIVE agents (verified KYC + paid yearly subscription) verify.
     */
    public function verify(string $code): JsonResponse
    {
        $code = trim($code);
        $agent = User::where('agent_code', $code)->first();

        if (! $agent) {
            return response()->json([
                'valid' => false,
                'message' => 'Agent referral code is not recognized.',
                'agent' => null,
            ], 404);
        }

        if (! AgentService::isActive($agent)) {
            $reason = ! $agent->isKycVerified()
                ? 'This agent has not completed KYC verification yet.'
                : (($agent->agent_subscription_status ?? 'inactive') !== 'active'
                    ? 'This agent’s yearly subscription is not active.'
                    : 'This agent’s subscription has expired.');

            return response()->json([
                'valid' => false,
                'message' => 'Agent referral code is not active. ' . $reason,
                'requirements' => [
                    'kyc_verified' => $agent->isKycVerified(),
                    'subscription_status' => $agent->agent_subscription_status ?? 'inactive',
                    'subscription_fee' => AgentService::fee(),
                ],
                'agent' => null,
            ], 200);
        }

        return response()->json([
            'valid' => true,
            'message' => 'Verified Sales Agent partner.',
            'agent' => [
                'id' => $agent->id,
                'name' => $agent->name,
                'agent_code' => $agent->agent_code,
                'avatar_url' => $agent->avatar_url,
                'tagline' => $agent->agent_tagline ?? 'Official Garage Parts Sales Specialist',
                'commission_rate' => $agent->commission_rate !== null ? (float) $agent->commission_rate : null,
                'commission_car_pct' => \App\Services\AgentService::commissionFor('car', $agent->commission_rate !== null ? (float) $agent->commission_rate : null),
                'commission_part_pct' => \App\Services\AgentService::commissionFor('part', $agent->commission_rate !== null ? (float) $agent->commission_rate : null),
            ],
        ]);
    }

    /**
     * Agent subscription status + requirements (fee config, KYC, expiry).
     */
    public function subscription(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }
        $user->refreshIfStaleSubscription();

        $referrer = $user->referred_by_user_id ? User::find($user->referred_by_user_id) : null;

        return response()->json([
            'subscription' => [
                'status' => $user->agent_subscription_status ?? 'inactive',
                'is_active' => $user->isAgentActive(),
                'is_kyc_verified' => $user->isKycVerified(),
                'kyc_status' => $user->kyc_status ?? 'not_submitted',
                'fee' => AgentService::fee(),
                'referral_reward' => AgentService::referralReward(),
                'duration_days' => AgentService::durationDays(),
                'subscribed_at' => $user->agent_subscribed_at?->toISOString(),
                'expires_at' => $user->agent_expires_at?->toISOString(),
                'last_payment_at' => $user->agent_last_payment_at?->toISOString(),
                'last_payment_amount' => $user->agent_last_payment_amount !== null
                    ? (float) $user->agent_last_payment_amount : null,
                'agent_code' => $user->agent_code,
                'referred_by' => $referrer ? [
                    'id' => $referrer->id,
                    'name' => $referrer->name,
                    'agent_code' => $referrer->agent_code,
                ] : null,
                'requirements' => [
                    'kyc_verified' => $user->isKycVerified(),
                    'subscription_active' => ($user->agent_subscription_status ?? 'inactive') === 'active'
                        && (! $user->agent_expires_at || $user->agent_expires_at->isFuture()),
                ],
            ],
        ]);
    }

    /**
     * Subscribe / renew the yearly Sales Agent subscription.
     * Mock pay + auto-activate. Requires verified KYC.
     */
    public function subscribe(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $validated = $request->validate([
            'payment_method' => ['sometimes', 'string', 'max:60'],
            'payment_reference' => ['sometimes', 'nullable', 'string', 'max:190'],
            'mock_account_name' => ['sometimes', 'nullable', 'string', 'max:160'],
            'mock_account_number' => ['sometimes', 'nullable', 'string', 'max:80'],
        ]);

        if (! $user->isKycVerified()) {
            return response()->json([
                'message' => 'Verified KYC is required before activating the Sales Agent subscription.',
                'requirements' => [
                    'kyc_status' => $user->kyc_status ?? 'not_submitted',
                    'kyc_verified' => false,
                    'subscription_fee' => AgentService::fee(),
                ],
            ], 422);
        }

        $subscription = AgentService::subscribe(
            $user,
            $validated['payment_method'] ?? 'gcash',
            $validated['payment_reference'] ?? null,
            array_filter([
                'mock_account_name' => $validated['mock_account_name'] ?? null,
                'mock_account_number' => $validated['mock_account_number'] ?? null,
            ]),
        );

        $user = $user->refresh();

        return response()->json([
            'message' => 'Sales Agent subscription activated for 1 year.',
            'subscription' => [
                'id' => $subscription->id,
                'uuid' => $subscription->uuid,
                'amount' => (float) $subscription->amount,
                'status' => $subscription->status,
                'payment_method' => $subscription->payment_method,
                'payment_reference' => $subscription->payment_reference,
                'starts_at' => $subscription->starts_at?->toISOString(),
                'expires_at' => $subscription->expires_at?->toISOString(),
            ],
            'agent' => [
                'id' => $user->id,
                'agent_code' => $user->agent_code,
                'is_active' => $user->isAgentActive(),
                'subscription_status' => $user->agent_subscription_status,
                'expires_at' => $user->agent_expires_at?->toISOString(),
            ],
        ], 201);
    }

    /**
     * Agent statistics and earnings summary for authenticated user.
     * Order commissions require active status; referral rewards are
     * included from the wallet ledger.
     */
    public function stats(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        // Ensure user has an agent_code (referral identity), but do NOT
        // auto-activate — activation requires KYC + paid subscription.
        if (empty($user->agent_code)) {
            $slug = Str::slug($user->name ?: 'AGENT', '');
            $prefix = strtoupper(substr($slug, 0, 4)) ?: 'AGT';
            $user->agent_code = 'AGT-' . $prefix . strtoupper(Str::random(4));
            $user->save();
            $user->refresh();
        }

        $user->refreshIfStaleSubscription();
        $isActive = $user->isAgentActive();

        $referredOrdersQuery = Order::where(function ($q) use ($user) {
            $q->where('agent_id', $user->id)
              ->orWhere('agent_code', $user->agent_code);
        });

        $totalOrdersCount = (clone $referredOrdersQuery)->count();
        $totalSalesVolume = (clone $referredOrdersQuery)->sum('total_amount');
        $totalCommissionEarned = (clone $referredOrdersQuery)->sum('commission_amount');
        $pendingCommission = (clone $referredOrdersQuery)->where('commission_status', 'pending')->sum('commission_amount');
        $settledCommission = (clone $referredOrdersQuery)->where('commission_status', 'settled')->sum('commission_amount');

        $recentOrders = (clone $referredOrdersQuery)->latest()->take(10)->get();

        $referralEarnings = (float) PlatformTransaction::query()
            ->where('user_id', $user->id)
            ->where('stream_type', 'agent_referral_reward')
            ->where('status', 'completed')
            ->sum('net_amount');
        $recruitedAgents = User::where('referred_by_user_id', $user->id)->count();
        $recruitedActiveAgents = User::where('referred_by_user_id', $user->id)
            ->where('agent_subscription_status', 'active')
            ->where('kyc_status', 'approved')
            ->where('is_kyc_verified', true)
            ->count();

        return response()->json([
            'agent' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'agent_code' => $user->agent_code,
                'commission_rate' => $user->commission_rate !== null ? (float) $user->commission_rate : null,
                'commission_car_pct' => \App\Services\AgentService::commissionFor('car', $user->commission_rate !== null ? (float) $user->commission_rate : null),
                'commission_part_pct' => \App\Services\AgentService::commissionFor('part', $user->commission_rate !== null ? (float) $user->commission_rate : null),
                'tagline' => $user->agent_tagline ?? 'Official Garage Parts Sales Specialist',
                'is_agent' => $isActive,
                'is_active' => $isActive,
                'subscription_status' => $user->agent_subscription_status ?? 'inactive',
                'subscription_expires_at' => $user->agent_expires_at?->toISOString(),
                'is_kyc_verified' => $user->isKycVerified(),
                'kyc_status' => $user->kyc_status ?? 'not_submitted',
                'subscription_fee' => AgentService::fee(),
                'referral_reward' => AgentService::referralReward(),
            ],
            'performance' => [
                'total_orders' => $totalOrdersCount,
                'total_sales_volume' => (float) $totalSalesVolume,
                'formatted_sales_volume' => '₱ ' . number_format((float) $totalSalesVolume, 2),
                'total_commission' => (float) $totalCommissionEarned,
                'formatted_total_commission' => '₱ ' . number_format((float) $totalCommissionEarned, 2),
                'pending_commission' => (float) $pendingCommission,
                'formatted_pending_commission' => '₱ ' . number_format((float) $pendingCommission, 2),
                'settled_commission' => (float) $settledCommission,
                'formatted_settled_commission' => '₱ ' . number_format((float) $settledCommission, 2),
                'referral_earnings' => $referralEarnings,
                'formatted_referral_earnings' => '₱ ' . number_format($referralEarnings, 2),
                'recruited_agents' => $recruitedAgents,
                'recruited_active_agents' => $recruitedActiveAgents,
            ],
            'recent_orders' => OrderResource::collection($recentOrders),
        ]);
    }

    /**
     * Update agent profile tagline or custom agent code.
     */
    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! $user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        $validated = $request->validate([
            'agent_code' => ['nullable', 'string', 'min:3', 'max:50', 'alpha_dash', 'unique:users,agent_code,' . $user->id],
            'agent_tagline' => ['nullable', 'string', 'max:255'],
        ]);

        if (!empty($validated['agent_code'])) {
            $user->agent_code = strtoupper($validated['agent_code']);
        }
        if (isset($validated['agent_tagline'])) {
            $user->agent_tagline = $validated['agent_tagline'];
        }

        if (empty($user->agent_code)) {
            $slug = Str::slug($user->name ?: 'AGENT', '');
            $prefix = strtoupper(substr($slug, 0, 4)) ?: 'AGT';
            $user->agent_code = 'AGT-' . $prefix . strtoupper(Str::random(4));
        }
        $user->save();

        return response()->json([
            'message' => 'Agent profile updated successfully.',
            'agent' => [
                'id' => $user->id,
                'name' => $user->name,
                'agent_code' => $user->agent_code,
                'agent_tagline' => $user->agent_tagline,
                'commission_rate' => $user->commission_rate !== null ? (float) $user->commission_rate : null,
                'commission_car_pct' => \App\Services\AgentService::commissionFor('car', $user->commission_rate !== null ? (float) $user->commission_rate : null),
                'commission_part_pct' => \App\Services\AgentService::commissionFor('part', $user->commission_rate !== null ? (float) $user->commission_rate : null),
            ],
        ]);
    }
}
