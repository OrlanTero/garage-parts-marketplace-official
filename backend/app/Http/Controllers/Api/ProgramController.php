<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AgentService;
use App\Services\PerksService;
use Illuminate\Http\JsonResponse;

/**
 * Public program economics: agent commissions, subscriptions, referral
 * rewards, and perks membership — one call so the storefront never
 * hardcodes program numbers.
 */
class ProgramController extends Controller
{
    public function show(): JsonResponse
    {
        return response()->json([
            'status' => 'success',
            'data' => [
                'agent' => [
                    'commission_car_pct' => AgentService::commissionFor('car'),
                    'commission_part_pct' => AgentService::commissionFor('part'),
                    'subscription_fee' => AgentService::fee(),
                    'subscription_days' => AgentService::durationDays(),
                    'referral_reward' => AgentService::referralReward(),
                ],
                'perks' => [
                    'subscription_fee' => PerksService::fee(),
                    'subscription_days' => PerksService::durationDays(),
                    'max_part_discount_pct' => PerksService::maxPartDiscountPct(),
                ],
            ],
        ]);
    }
}
