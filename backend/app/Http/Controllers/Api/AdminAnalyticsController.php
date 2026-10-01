<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Car;
use App\Models\Order;
use App\Models\Part;
use App\Models\PlatformTransaction;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminAnalyticsController extends Controller
{
    /**
     * GET /admin/analytics/overview?range=7d|30d|90d|ytd|all — platform-wide
     * marketplace intelligence: GMV, take-rate, AOV, orders by status/type,
     * parts category performance, car brand share, 6-month trend, users,
     * listings snapshot, payouts, and previous-window growth.
     *
     * Flow metrics honor the range window; point-in-time snapshots
     * (pipeline, holds, inventory, users) are always current.
     */
    public function overview(Request $request): JsonResponse
    {
        $range = strtolower((string) $request->input('range', '30d'));
        if (! in_array($range, ['7d', '30d', '90d', 'ytd', 'all'], true)) {
            $range = '30d';
        }

        $now = Carbon::now();
        $start = match ($range) {
            '7d' => $now->copy()->subDays(7)->startOfDay(),
            '90d' => $now->copy()->subDays(90)->startOfDay(),
            'ytd' => $now->copy()->startOfYear(),
            'all' => null,
            default => $now->copy()->subDays(30)->startOfDay(),
        };

        $windowed = fn () => $start
            ? Order::query()->where('created_at', '>=', $start)
            : Order::query();

        $completedIn = (clone $windowed())->where('status', 'completed');
        $gmv = (float) (clone $completedIn)->sum('total_amount');
        $gmvCars = (float) (clone $completedIn)->where('item_type', 'car')->sum('total_amount');
        $gmvParts = $gmv - $gmvCars;
        $completedCount = (int) (clone $completedIn)->count();
        $totalCount = (int) (clone $windowed())->count();

        $platformFees = (float) (clone $completedIn)
            ->selectRaw('COALESCE(SUM(total_amount * COALESCE(commission_rate, 5.00) / 100), 0) as fees')
            ->value('fees');

        // Growth vs the previous equal-length window (not for ytd/all).
        $growth = null;
        if ($start && $range !== 'ytd') {
            $days = $range === '7d' ? 7 : ($range === '90d' ? 90 : 30);
            $prevStart = $start->copy()->subDays($days);
            $prevGmv = (float) Order::query()
                ->where('status', 'completed')
                ->whereBetween('created_at', [$prevStart, $start])
                ->sum('total_amount');
            $prevCount = (int) Order::query()
                ->whereBetween('created_at', [$prevStart, $start])
                ->count();
            $growth = [
                'gmv_pct' => $prevGmv > 0 ? round(($gmv - $prevGmv) / $prevGmv * 100, 1) : ($gmv > 0 ? 100.0 : 0.0),
                'orders_pct' => $prevCount > 0 ? round(($totalCount - $prevCount) / $prevCount * 100, 1) : ($totalCount > 0 ? 100.0 : 0.0),
            ];
        }

        $ordersByStatus = (clone $windowed())
            ->selectRaw('status, COUNT(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status')
            ->all();

        $ordersByType = (clone $windowed())
            ->selectRaw('item_type, COUNT(*) as total, COALESCE(SUM(CASE WHEN status = \'completed\' THEN total_amount ELSE 0 END), 0) as revenue')
            ->groupBy('item_type')
            ->get();

        // Parts category performance (completed, in window) via listing join.
        $partCategories = Order::query()
            ->join('parts', 'parts.id', '=', 'orders.part_id')
            ->when($start, fn ($q) => $q->where('orders.created_at', '>=', $start))
            ->where('orders.status', 'completed')
            ->where('orders.item_type', 'part')
            ->selectRaw('parts.category as category, COUNT(*) as orders, COALESCE(SUM(orders.total_amount), 0) as revenue')
            ->groupBy('parts.category')
            ->orderByDesc('revenue')
            ->get();

        $carRow = [
            'category' => 'Vehicle Builds',
            'orders' => (int) (clone $completedIn)->where('item_type', 'car')->count(),
            'revenue' => round($gmvCars, 2),
        ];

        // Car brand share (completed, in window) via listing join.
        $brandRows = Order::query()
            ->join('cars', 'cars.id', '=', 'orders.car_id')
            ->when($start, fn ($q) => $q->where('orders.created_at', '>=', $start))
            ->where('orders.status', 'completed')
            ->where('orders.item_type', 'car')
            ->selectRaw('cars.brand as brand, COUNT(*) as orders, COALESCE(SUM(orders.total_amount), 0) as revenue')
            ->groupBy('cars.brand')
            ->orderByDesc('revenue')
            ->get();

        $topCarPerBrand = Order::query()
            ->join('cars', 'cars.id', '=', 'orders.car_id')
            ->when($start, fn ($q) => $q->where('orders.created_at', '>=', $start))
            ->where('orders.status', 'completed')
            ->where('orders.item_type', 'car')
            ->selectRaw('cars.brand as brand, orders.item_name as item_name, COALESCE(SUM(orders.total_amount), 0) as revenue')
            ->groupBy('cars.brand', 'orders.item_name')
            ->orderByDesc('revenue')
            ->get()
            ->groupBy('brand')
            ->map(fn ($rows) => $rows->first()['item_name'] ?? null);

        // Trailing 6-month GMV trend (fixed window, car/part split).
        $trend = [];
        for ($i = 5; $i >= 0; $i--) {
            $month = $now->copy()->subMonths($i);
            $monthCars = (float) Order::query()
                ->where('status', 'completed')
                ->where('item_type', 'car')
                ->whereYear('created_at', $month->year)
                ->whereMonth('created_at', $month->month)
                ->sum('total_amount');
            $monthTotal = (float) Order::query()
                ->where('status', 'completed')
                ->whereYear('created_at', $month->year)
                ->whereMonth('created_at', $month->month)
                ->sum('total_amount');
            $trend[] = [
                'month' => $month->format('M Y'),
                'cars' => round($monthCars, 2),
                'parts' => round($monthTotal - $monthCars, 2),
                'total' => round($monthTotal, 2),
            ];
        }

        // Point-in-time snapshots (always current, never windowed).
        $openPipeline = (float) Order::query()
            ->whereNotIn('status', ['completed', 'refunded', 'cancelled'])
            ->whereIn('payment_status', ['paid', 'confirmed'])
            ->sum('total_amount');

        $heldEscrow = (float) Order::query()
            ->where('item_type', 'car')
            ->whereIn('payment_status', ['paid', 'confirmed'])
            ->whereNotIn('status', ['completed', 'refunded', 'cancelled'])
            ->sum('total_amount');

        $pendingProofs = (int) Order::query()
            ->where('item_type', 'car')
            ->where('proof_status', 'pending')
            ->count();

        $usersByRole = User::query()
            ->selectRaw('role, COUNT(*) as total')
            ->groupBy('role')
            ->pluck('total', 'role')
            ->all();

        $newUsers = $start
            ? (int) User::query()->where('created_at', '>=', $start)->count()
            : (int) User::query()->count();

        $carsByStatus = Car::query()
            ->selectRaw('status, COUNT(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status')
            ->all();

        $partsByStatus = Part::query()
            ->selectRaw('status, COUNT(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status')
            ->all();

        $payoutQuery = PlatformTransaction::query()
            ->where('stream_type', 'seller_payout')
            ->where('status', 'completed');
        $releasedTotal = (float) (clone $payoutQuery)->sum('net_amount');
        $agentTotal = (float) PlatformTransaction::query()
            ->where('stream_type', 'agent_commission')
            ->where('status', 'completed')
            ->sum('net_amount');
        $recentPayouts = (clone $payoutQuery)
            ->with(['order:id,order_number,item_name,item_type,status'])
            ->latest()
            ->take(6)
            ->get(['id', 'order_id', 'gross_amount', 'net_amount', 'status', 'created_at']);

        return response()->json([
            'status' => 'success',
            'data' => [
                'range' => $range,
                'kpis' => [
                    'gmv' => round($gmv, 2),
                    'gmv_cars' => round($gmvCars, 2),
                    'gmv_parts' => round($gmvParts, 2),
                    'platform_fees' => round($platformFees, 2),
                    'take_rate' => $gmv > 0 ? round($platformFees / $gmv * 100, 2) : 0,
                    'avg_order_value' => $completedCount > 0 ? round($gmv / $completedCount, 2) : 0,
                    'completed_orders' => $completedCount,
                    'total_orders' => $totalCount,
                    'completion_rate' => $totalCount > 0 ? round($completedCount / $totalCount * 100, 1) : 0,
                    'open_pipeline' => round($openPipeline, 2),
                    'held_escrow' => round($heldEscrow, 2),
                    'pending_proofs' => $pendingProofs,
                    'released_payouts' => round($releasedTotal, 2),
                    'agent_payouts' => round($agentTotal, 2),
                    'new_users' => $newUsers,
                    'currency' => 'PHP',
                ],
                'growth' => $growth,
                'orders_by_status' => $ordersByStatus,
                'orders_by_type' => $ordersByType,
                'categories' => $partCategories->concat([$carRow])->values(),
                'brands' => $brandRows->map(fn ($row) => [
                    'brand' => $row->brand ?: 'Unspecified',
                    'orders' => (int) $row->orders,
                    'revenue' => round((float) $row->revenue, 2),
                    'share' => $gmvCars > 0 ? round((float) $row->revenue / $gmvCars * 100, 1) : 0,
                    'top_item' => $topCarPerBrand[$row->brand] ?? null,
                ])->values(),
                'monthly_trend' => $trend,
                'users_by_role' => $usersByRole,
                'inventory' => [
                    'cars_by_status' => $carsByStatus,
                    'parts_by_status' => $partsByStatus,
                    'cars_total' => array_sum(array_map('intval', $carsByStatus)),
                    'parts_total' => array_sum(array_map('intval', $partsByStatus)),
                ],
                'recent_payouts' => $recentPayouts,
            ],
        ]);
    }
}
