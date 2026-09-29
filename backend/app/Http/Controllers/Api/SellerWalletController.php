<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\PayoutAccount;
use App\Models\PayoutWithdrawal;
use App\Models\PlatformTransaction;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Validation\ValidationException;

class SellerWalletController extends Controller
{
    /**
     * Wallet balance math for a seller.
     * Earned = completed seller payouts + settled referral commissions.
     * Locked = open (pending/approved) withdrawals. Available = earned −
     * locked − paid out. Rejected withdrawals and refunds never touch the
     * balance (payouts only exist on completion).
     *
     * @return array{earned: float, locked: float, available: float, withdrawn_paid: float}
     */
    public static function balanceFor(User $user): array
    {
        $earned = (float) PlatformTransaction::query()
            ->where('seller_id', $user->id)
            ->where('stream_type', 'seller_payout')
            ->where('status', 'completed')
            ->sum('net_amount');

        $earned += (float) PlatformTransaction::query()
            ->where('user_id', $user->id)
            ->where('stream_type', 'agent_commission')
            ->where('status', 'completed')
            ->sum('net_amount');

        $locked = (float) PayoutWithdrawal::query()
            ->where('user_id', $user->id)
            ->whereIn('status', [PayoutWithdrawal::STATUS_PENDING, PayoutWithdrawal::STATUS_APPROVED])
            ->sum('net_amount');

        $paidOut = (float) PayoutWithdrawal::query()
            ->where('user_id', $user->id)
            ->where('status', PayoutWithdrawal::STATUS_PAID)
            ->sum('net_amount');

        return [
            'earned' => round($earned, 2),
            'locked' => round($locked, 2),
            'available' => round(max(0, $earned - $locked - $paidOut), 2),
            'withdrawn_paid' => round($paidOut, 2),
        ];
    }

    /** GET /seller/wallet — balance + recent activity snapshot. */
    public function wallet(Request $request): JsonResponse
    {
        $user = $request->user();

        $payouts = PlatformTransaction::query()
            ->where(function ($q) use ($user) {
                $q->where(fn ($sq) => $sq->where('seller_id', $user->id)->where('stream_type', 'seller_payout'))
                    ->orWhere(fn ($sq) => $sq->where('user_id', $user->id)->where('stream_type', 'agent_commission'));
            })
            ->where('status', 'completed')
            ->with(['order:id,order_number,item_name,item_type,status'])
            ->latest()
            ->take(5)
            ->get();

        $withdrawals = PayoutWithdrawal::query()
            ->where('user_id', $user->id)
            ->with('payoutAccount:id,label,channel,account_number')
            ->latest()
            ->take(5)
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => [
                'balance' => self::balanceFor($user),
                'currency' => 'PHP',
                'recent_payouts' => $payouts,
                'recent_withdrawals' => $withdrawals,
                'payout_accounts_count' => PayoutAccount::where('user_id', $user->id)->count(),
            ],
        ]);
    }

    /** GET /seller/wallet/statements — unified billing ledger (payouts in, withdrawals out). */
    public function statements(Request $request): JsonResponse
    {
        $user = $request->user();
        $type = $request->input('type', 'all'); // all | payouts | withdrawals
        $perPage = min(max((int) $request->input('per_page', 20), 1), 50);
        $page = max((int) $request->input('page', 1), 1);

        $rows = collect();

        if (in_array($type, ['all', 'payouts'], true)) {
            $payouts = PlatformTransaction::query()
                ->where(function ($q) use ($user) {
                    $q->where(fn ($sq) => $sq->where('seller_id', $user->id)->where('stream_type', 'seller_payout'))
                        ->orWhere(fn ($sq) => $sq->where('user_id', $user->id)->where('stream_type', 'agent_commission'));
                })
                ->with(['order:id,order_number,item_name,item_type'])
                ->latest()
                ->take(200)
                ->get()
                ->map(fn (PlatformTransaction $t) => [
                    'id' => $t->stream_type . '-' . $t->id,
                    'kind' => $t->stream_type === 'agent_commission' ? 'commission' : 'payout',
                    'title' => $t->title ?? (($t->stream_type === 'agent_commission' ? 'Agent Commission — ' : 'Seller Payout — ') . ($t->order?->item_name ?? $t->order?->order_number ?? '')),
                    'detail' => $t->order?->order_number,
                    'item_type' => $t->order?->item_type ?? $t->metadata['item_type'] ?? null,
                    'amount' => (float) $t->net_amount,
                    'direction' => 'credit',
                    'status' => $t->status,
                    'reference' => $t->reference_number,
                    'created_at' => $t->created_at?->toIso8601String(),
                ]);
            $rows = $rows->concat($payouts);
        }

        if (in_array($type, ['all', 'withdrawals'], true)) {
            $withdrawals = PayoutWithdrawal::query()
                ->where('user_id', $user->id)
                ->with('payoutAccount:id,label,channel,account_number')
                ->latest()
                ->take(200)
                ->get()
                ->map(fn (PayoutWithdrawal $w) => [
                    'id' => 'withdrawal-' . $w->id,
                    'kind' => 'withdrawal',
                    'title' => 'Cash-out to ' . ($w->payoutAccount?->label
                        ?? ucfirst((string) $w->payoutAccount?->channel) . ' ' . $w->payoutAccount?->maskedNumber()),
                    'detail' => $w->reference_number ?? ('WDL-' . strtoupper(substr($w->uuid, 0, 8))),
                    'item_type' => null,
                    'amount' => (float) $w->net_amount,
                    'direction' => 'debit',
                    'status' => $w->status,
                    'reference' => $w->reference_number,
                    'created_at' => $w->created_at?->toIso8601String(),
                ]);
            $rows = $rows->concat($withdrawals);
        }

        $sorted = $rows->sortByDesc('created_at')->values();
        $paginator = new LengthAwarePaginator(
            $sorted->forPage($page, $perPage)->values(),
            $sorted->count(),
            $perPage,
            $page,
            ['path' => $request->url(), 'query' => $request->query()]
        );

        return response()->json([
            'status' => 'success',
            'data' => $paginator->items(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'last_page' => $paginator->lastPage(),
            ],
            'balance' => self::balanceFor($user),
        ]);
    }

    /** GET /seller/payout-accounts — seller's cash-out destinations. */
    public function accounts(Request $request): JsonResponse
    {
        $accounts = PayoutAccount::where('user_id', $request->user()->id)
            ->orderByDesc('is_default')
            ->orderBy('id')
            ->get()
            ->map(fn (PayoutAccount $a) => $this->serializeAccount($a));

        return response()->json(['status' => 'success', 'data' => $accounts]);
    }

    /** POST /seller/payout-accounts — add a GCash / Maya / bank destination. */
    public function storeAccount(Request $request): JsonResponse
    {
        $data = $request->validate([
            'label' => ['nullable', 'string', 'max:120'],
            'channel' => ['required', 'string', 'in:bank,gcash,maya'],
            'account_name' => ['required', 'string', 'max:160'],
            'account_number' => ['required', 'string', 'max:80'],
            'bank_name' => ['nullable', 'string', 'max:120'],
            'is_default' => ['sometimes', 'boolean'],
        ]);

        $user = $request->user();

        if (PayoutAccount::where('user_id', $user->id)
            ->where('channel', $data['channel'])
            ->where('account_number', $data['account_number'])
            ->exists()) {
            throw ValidationException::withMessages([
                'account_number' => ['This payout account is already saved.'],
            ]);
        }

        if ($data['channel'] !== 'bank') {
            $data['bank_name'] = null;
        }

        $isFirst = PayoutAccount::where('user_id', $user->id)->count() === 0;
        $makeDefault = $isFirst || ($data['is_default'] ?? false);

        $account = PayoutAccount::create([
            ...$data,
            'user_id' => $user->id,
            'is_default' => $makeDefault,
        ]);

        if ($makeDefault) {
            PayoutAccount::where('user_id', $user->id)
                ->where('id', '!=', $account->id)
                ->update(['is_default' => false]);
        }

        return (response()->json([
            'status' => 'success',
            'data' => $this->serializeAccount($account->refresh()),
        ]))->setStatusCode(201);
    }

    /** PATCH /seller/payout-accounts/{account} — edit or set default. */
    public function updateAccount(Request $request, PayoutAccount $account): JsonResponse
    {
        $this->ensureOwner($request, $account);

        $data = $request->validate([
            'label' => ['sometimes', 'nullable', 'string', 'max:120'],
            'account_name' => ['sometimes', 'string', 'max:160'],
            'bank_name' => ['sometimes', 'nullable', 'string', 'max:120'],
            'is_default' => ['sometimes', 'boolean'],
        ]);

        $account->forceFill($data)->save();

        if ($data['is_default'] ?? false) {
            PayoutAccount::where('user_id', $request->user()->id)
                ->where('id', '!=', $account->id)
                ->update(['is_default' => false]);
        }

        return response()->json([
            'status' => 'success',
            'data' => $this->serializeAccount($account->refresh()),
        ]);
    }

    /** DELETE /seller/payout-accounts/{account}. */
    public function destroyAccount(Request $request, PayoutAccount $account): JsonResponse
    {
        $this->ensureOwner($request, $account);

        if ($account->withdrawals()->whereIn('status', [
            PayoutWithdrawal::STATUS_PENDING, PayoutWithdrawal::STATUS_APPROVED,
        ])->exists()) {
            throw ValidationException::withMessages([
                'account' => ['This account has an open withdrawal and cannot be removed yet.'],
            ]);
        }

        $wasDefault = $account->is_default;
        $account->delete();

        if ($wasDefault) {
            $next = PayoutAccount::where('user_id', $request->user()->id)->orderBy('id')->first();
            $next?->forceFill(['is_default' => true])->save();
        }

        return response()->json(['status' => 'success', 'message' => 'Payout account removed.']);
    }

    /** GET /seller/withdrawals — cash-out request history. */
    public function withdrawals(Request $request): JsonResponse
    {
        $withdrawals = PayoutWithdrawal::query()
            ->where('user_id', $request->user()->id)
            ->with('payoutAccount:id,label,channel,account_name,account_number,bank_name')
            ->latest()
            ->paginate(min(max((int) $request->input('per_page', 15), 1), 50));

        return response()->json([
            'status' => 'success',
            'data' => $withdrawals->items(),
            'meta' => [
                'current_page' => $withdrawals->currentPage(),
                'per_page' => $withdrawals->perPage(),
                'total' => $withdrawals->total(),
                'last_page' => $withdrawals->lastPage(),
            ],
            'balance' => self::balanceFor($request->user()),
        ]);
    }

    /** POST /seller/withdrawals — request a cash-out to a payout account. */
    public function storeWithdrawal(Request $request): JsonResponse
    {
        $data = $request->validate([
            'payout_account_id' => ['required', 'integer', 'exists:payout_accounts,id'],
            'amount' => ['required', 'numeric', 'min:' . PayoutWithdrawal::MIN_AMOUNT],
        ]);

        $user = $request->user();
        $account = PayoutAccount::where('id', $data['payout_account_id'])
            ->where('user_id', $user->id)
            ->firstOrFail();

        $amount = round((float) $data['amount'], 2);
        $available = self::balanceFor($user)['available'];

        if ($amount > $available) {
            throw ValidationException::withMessages([
                'amount' => ['Insufficient available balance. Available: ₱' . number_format($available, 2)],
            ]);
        }

        $withdrawal = PayoutWithdrawal::create([
            'user_id' => $user->id,
            'payout_account_id' => $account->id,
            'amount' => $amount,
            'fee' => 0.00,
            'net_amount' => $amount,
            'status' => PayoutWithdrawal::STATUS_PENDING,
        ]);

        try {
            $adminIds = User::query()->whereIn('role', ['admin', 'super_admin'])->pluck('id')->all();
            app(\App\Services\NotificationService::class)->sendMany(
                $adminIds,
                'payout',
                "Cash-out request ₱{$amount} by @{$user->username}",
                "Seller {$user->name} requested a cash-out to {$account->channel} {$account->maskedNumber()} — review in Payouts.",
                ['withdrawal_id' => $withdrawal->id, 'amount' => $amount, 'seller_id' => $user->id],
                '/admin/payouts',
            );
        } catch (\Throwable $e) {
            report($e);
        }

        return (response()->json([
            'status' => 'success',
            'data' => $withdrawal->load('payoutAccount'),
            'balance' => self::balanceFor($user),
        ]))->setStatusCode(201);
    }

    /**
     * GET /seller/analytics — seller sales dashboard: KPIs, 6-month sales
     * trend (cars vs parts), orders by status, top listings, recent payouts.
     */
    public function analytics(Request $request): JsonResponse
    {
        $userId = (int) $request->user()->id;

        $orderQuery = Order::query()->where('seller_id', $userId);

        $byStatus = (clone $orderQuery)
            ->selectRaw('status, COUNT(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status')
            ->all();

        $completedQuery = (clone $orderQuery)->where('status', 'completed');
        $completedRevenue = (float) (clone $completedQuery)->sum('total_amount');
        $completedCount = (int) (clone $completedQuery)->count();
        $totalCount = (int) (clone $orderQuery)->count();

        $payoutQuery = PlatformTransaction::query()
            ->where('seller_id', $userId)
            ->where('stream_type', 'seller_payout')
            ->where('status', 'completed');
        $netEarnings = (float) (clone $payoutQuery)->sum('net_amount');
        $platformFees = (float) (clone $payoutQuery)->sum('gross_amount') - $netEarnings;

        $openPipeline = (float) (clone $orderQuery)
            ->whereNotIn('status', ['completed', 'refunded', 'cancelled'])
            ->whereIn('payment_status', ['paid', 'confirmed'])
            ->sum('total_amount');

        // 6-month sales trend from settled payouts (order relation carries item_type).
        $trend = [];
        for ($i = 5; $i >= 0; $i--) {
            $month = Carbon::now()->subMonths($i);
            $rows = (clone $payoutQuery)
                ->with('order:id,item_type')
                ->whereYear('platform_transactions.created_at', $month->year)
                ->whereMonth('platform_transactions.created_at', $month->month)
                ->get();
            $cars = $rows->filter(fn ($t) => ($t->order?->item_type ?? $t->metadata['item_type'] ?? null) === 'car')->sum('net_amount');
            $parts = (float) $rows->sum('net_amount') - (float) $cars;
            $trend[] = [
                'month' => $month->format('M Y'),
                'cars' => round((float) $cars, 2),
                'parts' => round($parts, 2),
                'total' => round((float) $rows->sum('net_amount'), 2),
            ];
        }

        $topListings = (clone $orderQuery)
            ->where('status', 'completed')
            ->selectRaw('item_name, item_type, COUNT(*) as orders, SUM(quantity) as units, SUM(total_amount) as revenue')
            ->groupBy('item_name', 'item_type')
            ->orderByDesc('revenue')
            ->take(5)
            ->get();

        $recentPayouts = (clone $payoutQuery)
            ->with(['order:id,order_number,item_name,item_type,status'])
            ->latest()
            ->take(6)
            ->get();

        $closedCount = (int) (clone $orderQuery)->whereIn('status', ['completed', 'refunded', 'cancelled'])->count();

        return response()->json([
            'status' => 'success',
            'data' => [
                'kpis' => [
                    'gross_sales' => round($completedRevenue, 2),
                    'net_earnings' => round($netEarnings, 2),
                    'platform_fees' => round($platformFees, 2),
                    'completed_orders' => $completedCount,
                    'total_orders' => $totalCount,
                    'avg_order_value' => $completedCount > 0 ? round($completedRevenue / $completedCount, 2) : 0,
                    'completion_rate' => $totalCount > 0 ? round($completedCount / $totalCount * 100, 1) : 0,
                    'open_pipeline' => round($openPipeline, 2),
                    'currency' => 'PHP',
                ],
                'orders_by_status' => $byStatus,
                'monthly_trend' => $trend,
                'top_listings' => $topListings,
                'recent_payouts' => $recentPayouts,
                'closed_orders' => $closedCount,
            ],
        ]);
    }

    private function serializeAccount(PayoutAccount $account): array
    {
        return [
            'id' => $account->id,
            'label' => $account->label,
            'channel' => $account->channel,
            'channel_label' => match ($account->channel) {
                'bank' => 'Bank Transfer',
                'gcash' => 'GCash',
                'maya' => 'Maya',
                default => ucfirst((string) $account->channel),
            },
            'account_name' => $account->account_name,
            'account_number' => $account->account_number,
            'masked_number' => $account->maskedNumber(),
            'bank_name' => $account->bank_name,
            'is_default' => (bool) $account->is_default,
            'created_at' => $account->created_at?->toIso8601String(),
        ];
    }

    private function ensureOwner(Request $request, PayoutAccount $account): void
    {
        if ((int) $account->user_id !== (int) $request->user()->id) {
            abort(403, 'This payout account belongs to another user.');
        }
    }
}
