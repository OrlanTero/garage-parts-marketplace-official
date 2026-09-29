<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Models\PlatformTransaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class AdminCarTransactionController extends Controller
{
    /**
     * GET /admin/car-transactions — every car build transaction: order +
     * payment hold state, proof state, and whether the payout left.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Order::query()
            ->where('item_type', 'car')
            ->with(['warehouse:id,name,city'])
            ->when($request->input('status'), fn ($q, $s) => $q->where('status', $s))
            ->when($request->input('payment_status'), fn ($q, $s) => $q->where('payment_status', $s))
            ->when($request->input('proof_status'), fn ($q, $s) => $q->where('proof_status', $s))
            ->when($request->input('search'), function ($q, $s) {
                $like = "%{$s}%";
                $q->where(fn ($inner) => $inner
                    ->where('order_number', 'like', $like)
                    ->orWhere('buyer_name', 'like', $like)
                    ->orWhere('buyer_email', 'like', $like)
                    ->orWhere('item_name', 'like', $like));
            })
            ->latest();

        $orders = $query->paginate(min(max((int) $request->input('per_page', 20), 1), 50));
        $ids = collect($orders->items())->pluck('id')->all();

        $paidOut = PlatformTransaction::query()
            ->whereIn('order_id', $ids)
            ->where('stream_type', 'seller_payout')
            ->pluck('order_id')
            ->flip();

        $heldTotal = (float) Order::query()
            ->where('item_type', 'car')
            ->whereIn('payment_status', ['paid', 'confirmed'])
            ->whereNotIn('status', ['completed', 'refunded', 'cancelled'])
            ->sum('total_amount');

        $data = collect($orders->items())->map(function (Order $order) use ($paidOut) {
            $row = (new OrderResource($order))->toArray(request());
            $row['payout_released'] = isset($paidOut[$order->id]);
            return $row;
        })->all();

        return response()->json([
            'status' => 'success',
            'data' => $data,
            'meta' => [
                'current_page' => $orders->currentPage(),
                'per_page' => $orders->perPage(),
                'total' => $orders->total(),
                'last_page' => $orders->lastPage(),
            ],
            'summary' => [
                'held_funds' => round($heldTotal, 2),
                'pending_proofs' => Order::where('item_type', 'car')->where('proof_status', 'pending')->count(),
                'released_total' => round((float) PlatformTransaction::query()
                    ->where('stream_type', 'seller_payout')
                    ->whereIn('order_id', Order::where('item_type', 'car')->select('id'))
                    ->where('status', 'completed')
                    ->sum('net_amount'), 2),
            ],
        ]);
    }

    /**
     * POST /admin/car-transactions/{order}/approve-proof — accept the
     * seller's handover proof: release held funds to the seller wallet
     * (idempotent) and complete the order.
     */
    public function approveProof(Request $request, Order $order): JsonResponse
    {
        $this->ensureCarOrder($order);

        if (($order->proof_status ?? 'none') !== 'pending') {
            throw ValidationException::withMessages([
                'proof_status' => ['Only proofs awaiting review can be approved.'],
            ]);
        }
        if (!in_array($order->payment_status, ['paid', 'confirmed', 'released'], true)) {
            throw ValidationException::withMessages([
                'payment_status' => ['No held or submitted funds to release on this order.'],
            ]);
        }

        $order->forceFill([
            'proof_status' => 'approved',
            'proof_reviewed_by' => $request->user()->id,
            'proof_reviewed_at' => now(),
            'proof_rejection_reason' => null,
            'payment_status' => 'released',
            'status' => 'completed',
        ])->save();

        try {
            PlatformTransaction::recordPayoutOnce($order->refresh());
            PlatformTransaction::recordAgentCommission($order->refresh());
        } catch (\Throwable $e) {
            report($e);
        }

        $this->notifyParties($order, true, null);

        return (new OrderResource($order->refresh()))->response();
    }

    /**
     * POST /admin/car-transactions/{order}/reject-proof {reason} — return
     * the proof with feedback; funds stay held.
     */
    public function rejectProof(Request $request, Order $order): JsonResponse
    {
        $this->ensureCarOrder($order);

        if (($order->proof_status ?? 'none') !== 'pending') {
            throw ValidationException::withMessages([
                'proof_status' => ['Only proofs awaiting review can be rejected.'],
            ]);
        }

        $data = $request->validate([
            'reason' => ['required', 'string', 'max:1000'],
        ]);

        $order->forceFill([
            'proof_status' => 'rejected',
            'proof_rejection_reason' => $data['reason'],
            'proof_reviewed_by' => $request->user()->id,
            'proof_reviewed_at' => now(),
        ])->save();

        $this->notifyParties($order, false, $data['reason']);

        return (new OrderResource($order->refresh()))->response();
    }

    private function ensureCarOrder(Order $order): void
    {
        if (($order->item_type ?? 'part') !== 'car') {
            abort(422, 'Handover proof review applies to vehicle orders only.');
        }
    }

    private function notifyParties(Order $order, bool $approved, ?string $reason): void
    {
        try {
            $notify = app(\App\Services\NotificationService::class);
            $link = '/sales-order/' . ($order->order_number ?: $order->id);
            foreach (array_filter([$order->user_id, $order->seller_id]) as $recipientId) {
                $notify->send(
                    (int) $recipientId,
                    'payment',
                    $approved
                        ? "Funds released: {$order->order_number}"
                        : "Handover proof returned: {$order->order_number}",
                    $approved
                        ? 'Admin approved the delivery proof — held funds released to the seller wallet.'
                        : "Proof needs rework: {$reason}",
                    ['order_id' => $order->id, 'order_number' => $order->order_number],
                    $link,
                );
            }
        } catch (\Throwable $e) {
            report($e);
        }
    }
}
