<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PayoutWithdrawal;
use App\Models\PlatformTransaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class AdminPayoutController extends Controller
{
    /** GET /admin/payout-withdrawals — review queue for seller cash-outs. */
    public function index(Request $request): JsonResponse
    {
        $query = PayoutWithdrawal::query()
            ->with(['user:id,name,username,email', 'payoutAccount:id,label,channel,account_name,account_number,bank_name'])
            ->when($request->input('status'), fn ($q, $s) => $q->where('status', $s))
            ->latest();

        $withdrawals = $query->paginate(min(max((int) $request->input('per_page', 20), 1), 50));

        $pendingTotal = (float) PayoutWithdrawal::where('status', PayoutWithdrawal::STATUS_PENDING)->sum('net_amount');

        return response()->json([
            'status' => 'success',
            'data' => $withdrawals->items(),
            'meta' => [
                'current_page' => $withdrawals->currentPage(),
                'per_page' => $withdrawals->perPage(),
                'total' => $withdrawals->total(),
                'last_page' => $withdrawals->lastPage(),
            ],
            'pending_total' => round($pendingTotal, 2),
        ]);
    }

    /** POST /admin/payout-withdrawals/{withdrawal}/approve. */
    public function approve(Request $request, PayoutWithdrawal $withdrawal): JsonResponse
    {
        if ($withdrawal->status !== PayoutWithdrawal::STATUS_PENDING) {
            throw ValidationException::withMessages([
                'status' => ['Only pending withdrawals can be approved.'],
            ]);
        }

        $withdrawal->forceFill([
            'status' => PayoutWithdrawal::STATUS_APPROVED,
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ])->save();

        return response()->json(['status' => 'success', 'data' => $withdrawal->refresh()]);
    }

    /** POST /admin/payout-withdrawals/{withdrawal}/reject {admin_note?}. */
    public function reject(Request $request, PayoutWithdrawal $withdrawal): JsonResponse
    {
        if ($withdrawal->status !== PayoutWithdrawal::STATUS_PENDING) {
            throw ValidationException::withMessages([
                'status' => ['Only pending withdrawals can be rejected.'],
            ]);
        }

        $data = $request->validate([
            'admin_note' => ['sometimes', 'nullable', 'string', 'max:1000'],
        ]);

        $withdrawal->forceFill([
            'status' => PayoutWithdrawal::STATUS_REJECTED,
            'admin_note' => $data['admin_note'] ?? null,
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ])->save();

        try {
            app(\App\Services\NotificationService::class)->send(
                (int) $withdrawal->user_id,
                'payout',
                'Cash-out rejected',
                'Your ₱' . number_format((float) $withdrawal->net_amount, 2) . ' cash-out was rejected.'
                    . ($withdrawal->admin_note ? " Reason: {$withdrawal->admin_note}" : '')
                    . ' Funds are unlocked.',
                ['withdrawal_id' => $withdrawal->id, 'amount' => (float) $withdrawal->net_amount],
                '/wallet',
                $request->user(),
            );
        } catch (\Throwable $e) {
            report($e);
        }

        return response()->json(['status' => 'success', 'data' => $withdrawal->refresh()]);
    }

    /**
     * POST /admin/payout-withdrawals/{withdrawal}/mark-paid {reference_number?}.
     * Mirrors the cash-out into the treasury ledger so platform funds stay
     * consistent. Idempotent — an already-paid withdrawal returns as-is.
     */
    public function markPaid(Request $request, PayoutWithdrawal $withdrawal): JsonResponse
    {
        if ($withdrawal->status === PayoutWithdrawal::STATUS_PAID) {
            return response()->json(['status' => 'success', 'data' => $withdrawal]);
        }

        if (!in_array($withdrawal->status, [
            PayoutWithdrawal::STATUS_PENDING, PayoutWithdrawal::STATUS_APPROVED,
        ], true)) {
            throw ValidationException::withMessages([
                'status' => ['Only pending or approved withdrawals can be marked paid.'],
            ]);
        }

        $data = $request->validate([
            'reference_number' => ['sometimes', 'nullable', 'string', 'max:100'],
        ]);

        $withdrawal->forceFill([
            'status' => PayoutWithdrawal::STATUS_PAID,
            'reference_number' => $data['reference_number'] ?? $withdrawal->reference_number ?? ('WDL-' . strtoupper(substr($withdrawal->uuid, 0, 8))),
            'reviewed_by' => $withdrawal->reviewed_by ?? $request->user()->id,
            'reviewed_at' => $withdrawal->reviewed_at ?? now(),
            'paid_at' => now(),
        ])->save();

        try {
            app(\App\Services\NotificationService::class)->send(
                (int) $withdrawal->user_id,
                'payout',
                'Cash-out paid ₱' . number_format((float) $withdrawal->net_amount, 2),
                "Sent to your {$withdrawal->payoutAccount?->channel} {$withdrawal->payoutAccount?->maskedNumber()}"
                    . " (ref: {$withdrawal->reference_number}).",
                ['withdrawal_id' => $withdrawal->id, 'amount' => (float) $withdrawal->net_amount],
                '/wallet',
                $request->user(),
            );
        } catch (\Throwable $e) {
            report($e);
        }

        try {
            PlatformTransaction::create([
                'stream_type' => 'payout_withdrawal',
                'direction' => 'debit',
                'gross_amount' => (float) $withdrawal->amount,
                'fee_rate' => 0,
                'net_amount' => (float) $withdrawal->net_amount,
                'currency' => 'PHP',
                'payment_method' => $withdrawal->payoutAccount?->channel ?? 'bank_transfer',
                'payment_reference' => $withdrawal->reference_number,
                'reference_number' => $withdrawal->reference_number,
                'status' => 'completed',
                'user_id' => $withdrawal->user_id,
                'seller_id' => $withdrawal->user_id,
                'order_id' => null,
                'title' => 'Seller Cash-out — ' . ($withdrawal->payoutAccount?->label ?? ucfirst((string) $withdrawal->payoutAccount?->channel)),
                'description' => 'Seller withdrawal of ₱' . number_format((float) $withdrawal->net_amount, 2) . ' to '
                    . ($withdrawal->payoutAccount?->channel ?? 'payout account')
                    . ' ' . ($withdrawal->payoutAccount?->maskedNumber() ?? ''),
                'metadata' => [
                    'withdrawal_uuid' => $withdrawal->uuid,
                    'withdrawal_id' => $withdrawal->id,
                    'payout_account_id' => $withdrawal->payout_account_id,
                ],
                'settled_at' => now(),
            ]);
        } catch (\Throwable $e) {
            report($e);
        }

        return response()->json(['status' => 'success', 'data' => $withdrawal->refresh()]);
    }
}
