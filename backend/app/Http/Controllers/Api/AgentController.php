<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AgentController extends Controller
{
    /**
     * Public verification of an agent referral code.
     */
    public function verify(string $code): JsonResponse
    {
        $code = trim($code);
        $agent = User::where('agent_code', $code)->first();

        if (!$agent) {
            return response()->json([
                'valid' => false,
                'message' => 'Agent referral code is not recognized.',
                'agent' => null,
            ], 404);
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
                'commission_rate' => (float) ($agent->commission_rate ?? 5.00),
            ],
        ]);
    }

    /**
     * Agent statistics and earnings summary for authenticated user.
     */
    public function stats(Request $request): JsonResponse
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Unauthenticated'], 401);
        }

        // Ensure user has an agent_code
        if (empty($user->agent_code)) {
            $slug = Str::slug($user->name ?: 'AGENT', '');
            $prefix = strtoupper(substr($slug, 0, 4)) ?: 'AGT';
            $user->agent_code = 'AGT-' . $prefix . strtoupper(Str::random(4));
            $user->commission_rate = 5.00;
            $user->is_agent = true;
            $user->save();
        }

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

        return response()->json([
            'agent' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'agent_code' => $user->agent_code,
                'commission_rate' => (float) ($user->commission_rate ?? 5.00),
                'tagline' => $user->agent_tagline ?? 'Official Garage Parts Sales Specialist',
                'is_agent' => true,
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

        if (!$user) {
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

        $user->is_agent = true;
        $user->save();

        return response()->json([
            'message' => 'Agent profile updated successfully.',
            'agent' => [
                'id' => $user->id,
                'name' => $user->name,
                'agent_code' => $user->agent_code,
                'agent_tagline' => $user->agent_tagline,
                'commission_rate' => (float) ($user->commission_rate ?? 5.00),
            ],
        ]);
    }
}
