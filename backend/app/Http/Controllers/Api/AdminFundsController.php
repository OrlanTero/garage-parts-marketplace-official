<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Car;
use App\Models\PlatformTransaction;
use App\Models\ShowroomSlot;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AdminFundsController extends Controller
{
    /**
     * Get platform treasury & wallet overview metrics.
     */
    public function overview(): JsonResponse
    {
        $completedTxns = PlatformTransaction::query()->completed();

        $totalRevenue = (float) (clone $completedTxns)->sum('net_amount');
        $totalGrossVolume = (float) (clone $completedTxns)->sum('gross_amount');

        $carCommissionsTotal = (float) (clone $completedTxns)->where('stream_type', 'car_sale_commission')->sum('net_amount');
        $carDealsCount = (int) (clone $completedTxns)->where('stream_type', 'car_sale_commission')->count();

        $parkingFeesTotal = (float) (clone $completedTxns)->where('stream_type', 'parking_fee')->sum('net_amount');
        $parkingBaysCount = (int) (clone $completedTxns)->where('stream_type', 'parking_fee')->count();

        $partCommissionsTotal = (float) (clone $completedTxns)->where('stream_type', 'part_sale_commission')->sum('net_amount');

        $pendingFunds = (float) PlatformTransaction::query()->where('status', 'pending')->sum('net_amount');

        // Recent 6 Months Trend
        $monthlyTrend = [];
        for ($i = 5; $i >= 0; $i--) {
            $monthDate = Carbon::now()->subMonths($i);
            $year = $monthDate->year;
            $month = $monthDate->month;
            $monthLabel = $monthDate->format('M Y');

            $carComm = (float) PlatformTransaction::query()
                ->completed()
                ->where('stream_type', 'car_sale_commission')
                ->whereYear('created_at', $year)
                ->whereMonth('created_at', $month)
                ->sum('net_amount');

            $parkFee = (float) PlatformTransaction::query()
                ->completed()
                ->where('stream_type', 'parking_fee')
                ->whereYear('created_at', $year)
                ->whereMonth('created_at', $month)
                ->sum('net_amount');

            $monthlyTrend[] = [
                'month' => $monthLabel,
                'car_commissions' => $carComm,
                'parking_fees' => $parkFee,
                'total' => $carComm + $parkFee,
            ];
        }

        // Top contributing vehicle builds and sellers
        $topDeals = PlatformTransaction::query()
            ->completed()
            ->where('stream_type', 'car_sale_commission')
            ->with(['car:id,title,brand,model,year,price', 'seller:id,username,name,avatar_url'])
            ->latest('net_amount')
            ->take(5)
            ->get();

        $recentTransactions = PlatformTransaction::query()
            ->with(['seller:id,username,name,avatar_url,role', 'user:id,username,name,email', 'car:id,title,brand,model,year,price'])
            ->latest()
            ->take(8)
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => [
                'wallet' => [
                    'total_revenue' => $totalRevenue,
                    'total_gross_volume' => $totalGrossVolume,
                    'car_commissions_total' => $carCommissionsTotal,
                    'car_deals_count' => $carDealsCount,
                    'parking_fees_total' => $parkingFeesTotal,
                    'parking_bays_count' => $parkingBaysCount,
                    'part_commissions_total' => $partCommissionsTotal,
                    'pending_funds' => $pendingFunds,
                    'commission_rate' => 5.0,
                    'currency' => 'PHP',
                ],
                'monthly_trend' => $monthlyTrend,
                'top_deals' => $topDeals,
                'recent_transactions' => $recentTransactions,
            ],
        ]);
    }

    /**
     * List all ledger transactions with filtering and search.
     */
    public function transactions(Request $request): JsonResponse
    {
        $streamType = $request->input('stream_type') ?: $request->input('type', 'all');
        $status = $request->input('status', 'all');
        $paymentMethod = $request->input('payment_method', 'all');
        $search = $request->input('search') ?: $request->input('q');
        $dateFrom = $request->input('date_from');
        $dateTo = $request->input('date_to');
        $perPage = (int) $request->input('per_page', 25);

        $query = PlatformTransaction::query()
            ->with([
                'seller:id,username,name,avatar_url,email',
                'user:id,username,name,email',
                'car:id,uuid,title,brand,model,year,price',
                'order:id,order_number,total_amount,status',
                'showroomSlot:id,uuid,calculated_fee,status',
            ]);

        if (!empty($streamType) && $streamType !== 'all') {
            $query->where('stream_type', $streamType);
        }

        if (!empty($status) && $status !== 'all') {
            $query->where('status', $status);
        }

        if (!empty($paymentMethod) && $paymentMethod !== 'all') {
            $query->where('payment_method', $paymentMethod);
        }

        if (!empty($dateFrom)) {
            $query->whereDate('created_at', '>=', Carbon::parse($dateFrom));
        }

        if (!empty($dateTo)) {
            $query->whereDate('created_at', '<=', Carbon::parse($dateTo));
        }

        if (!empty($search)) {
            $like = "%{$search}%";
            $query->where(function (Builder $inner) use ($like) {
                $inner->where('transaction_number', 'like', $like)
                    ->orWhere('reference_number', 'like', $like)
                    ->orWhere('payment_reference', 'like', $like)
                    ->orWhere('title', 'like', $like)
                    ->orWhere('description', 'like', $like)
                    ->orWhereHas('seller', fn ($s) => $s->where('username', 'like', $like)->orWhere('name', 'like', $like))
                    ->orWhereHas('user', fn ($u) => $u->where('username', 'like', $like)->orWhere('name', 'like', $like))
                    ->orWhereHas('car', fn ($c) => $c->where('title', 'like', $like)->orWhere('brand', 'like', $like)->orWhere('model', 'like', $like));
            });
        }

        $paginated = $query->latest()->paginate($perPage);

        return response()->json([
            'status' => 'success',
            'data' => $paginated->items(),
            'meta' => [
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'per_page' => $paginated->perPage(),
                'total' => $paginated->total(),
            ],
        ]);
    }

    /**
     * Show single transaction receipt & breakdown.
     */
    public function show(PlatformTransaction $transaction): JsonResponse
    {
        $transaction->load([
            'seller:id,username,name,avatar_url,email,phone_number',
            'user:id,username,name,email,phone_number',
            'car:id,uuid,title,brand,model,year,price,vin,city',
            'order',
            'showroomSlot',
        ]);

        return response()->json([
            'status' => 'success',
            'data' => $transaction,
        ]);
    }

    /**
     * Generate financial & commission reports (JSON or downloadable CSV).
     */
    public function generateReport(Request $request): JsonResponse|StreamedResponse
    {
        $period = $request->input('period', 'this_month');
        $format = $request->input('format', 'json');
        $streamType = $request->input('stream_type', 'all');

        $query = PlatformTransaction::query()->with(['seller', 'user', 'car']);

        // Period filter
        match ($period) {
            'today' => $query->whereDate('created_at', Carbon::today()),
            'last_7_days' => $query->where('created_at', '>=', Carbon::now()->subDays(7)),
            'this_month' => $query->whereMonth('created_at', Carbon::now()->month)->whereYear('created_at', Carbon::now()->year),
            'last_month' => $query->whereMonth('created_at', Carbon::now()->subMonth()->month)->whereYear('created_at', Carbon::now()->subMonth()->year),
            'this_year' => $query->whereYear('created_at', Carbon::now()->year),
            'custom' => (function () use ($query, $request) {
                if ($request->filled('date_from')) {
                    $query->whereDate('created_at', '>=', Carbon::parse($request->input('date_from')));
                }
                if ($request->filled('date_to')) {
                    $query->whereDate('created_at', '<=', Carbon::parse($request->input('date_to')));
                }
            })(),
            default => null, // all_time
        };

        if (!empty($streamType) && $streamType !== 'all') {
            $query->where('stream_type', $streamType);
        }

        $transactions = $query->latest()->get();

        // If CSV requested
        if ($format === 'csv') {
            $fileName = 'garage_treasury_report_' . date('Ymd_His') . '.csv';

            $headers = [
                'Content-Type' => 'text/csv; charset=UTF-8',
                'Content-Disposition' => "attachment; filename=\"{$fileName}\"",
                'Pragma' => 'no-cache',
                'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
                'Expires' => '0',
            ];

            $callback = function () use ($transactions) {
                $file = fopen('php://output', 'w');
                // UTF-8 BOM for Excel
                fputs($file, "\xEF\xBB\xBF");

                // Header row
                fputcsv($file, [
                    'Transaction Number',
                    'Date & Time',
                    'Stream Type',
                    'Vehicle Build / Listing',
                    'Gross Deal Amount (PHP)',
                    'Commission Rate (%)',
                    'Net Platform Revenue (PHP)',
                    'Seller / Builder',
                    'Buyer / Payer',
                    'Payment Method',
                    'Payment Reference',
                    'Status',
                ]);

                foreach ($transactions as $txn) {
                    fputcsv($file, [
                        $txn->transaction_number,
                        $txn->created_at?->format('Y-m-d H:i:s'),
                        str_replace('_', ' ', strtoupper($txn->stream_type)),
                        $txn->car?->title ?? $txn->title,
                        number_format((float) $txn->gross_amount, 2, '.', ''),
                        number_format((float) $txn->fee_rate, 2, '.', '') . '%',
                        number_format((float) $txn->net_amount, 2, '.', ''),
                        $txn->seller?->username ?? 'N/A',
                        $txn->user?->name ?? 'N/A',
                        strtoupper($txn->payment_method),
                        $txn->payment_reference ?? 'N/A',
                        strtoupper($txn->status),
                    ]);
                }

                fclose($file);
            };

            return response()->stream($callback, 200, $headers);
        }

        // Summary calculations
        $totalGross = (float) $transactions->sum('gross_amount');
        $totalNetRevenue = (float) $transactions->sum('net_amount');
        $carCommissions = (float) $transactions->where('stream_type', 'car_sale_commission')->sum('net_amount');
        $parkingFees = (float) $transactions->where('stream_type', 'parking_fee')->sum('net_amount');
        $carDealsCount = $transactions->where('stream_type', 'car_sale_commission')->count();

        return response()->json([
            'status' => 'success',
            'data' => [
                'period' => $period,
                'generated_at' => now()->toIso8601String(),
                'summary' => [
                    'total_transactions' => $transactions->count(),
                    'total_gross_volume' => $totalGross,
                    'total_net_revenue' => $totalNetRevenue,
                    'car_commissions_total' => $carCommissions,
                    'car_deals_count' => $carDealsCount,
                    'parking_fees_total' => $parkingFees,
                    'commission_rate' => 5.0,
                ],
                'transactions' => $transactions,
            ],
        ]);
    }
}
