<?php

namespace App\Http\Controllers\Api;

use App\Enums\CarStatus;
use App\Enums\PartStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\OrderResource;
use App\Models\Car;
use App\Models\Order;
use App\Models\Part;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/**
 * Seller incoming sales-order requests.
 * Many buyers may request the same listing; the seller accepts exactly one —
 * the rest are auto-rejected. Parts reserve stock on acceptance; cars
 * consume a unit only when the seller marks the order `sold` — checkout,
 * payment, and acceptance never mark a car sold by themselves.
 */
class SellerOrderController extends Controller
{
    public function __construct(private \App\Services\InventoryService $inventory) {}

    /** GET /seller/orders — incoming requests for my listings. */
    public function index(Request $request)
    {
        $validated = $request->validate([
            'verification_status' => ['sometimes', 'in:pending,accepted,rejected'],
            'car_id' => ['sometimes', 'integer'],
            'part_id' => ['sometimes', 'integer'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:50'],
        ]);

        $query = Order::query()
            ->where('seller_id', $request->user()->id)
            ->with(['part:id,title,price', 'car:id,title,price', 'warehouse:id,name,city'])
            ->when($validated['verification_status'] ?? null, fn ($q, $s) => $q->where('verification_status', $s))
            // Powers the chat "sale orders on this listing" shortcut.
            ->when($validated['car_id'] ?? null, fn ($q, $id) => $q->where('car_id', $id))
            ->when($validated['part_id'] ?? null, fn ($q, $id) => $q->where('part_id', $id))
            ->orderByDesc('created_at');

        return OrderResource::collection($query->paginate((int) ($validated['per_page'] ?? 15)));
    }

    /** POST /seller/orders/{order}/accept — verify one request, reject the rest. */
    public function accept(Request $request, Order $order): OrderResource
    {
        $this->ensureOwner($request, $order);

        if ($order->verification_status !== 'pending') {
            throw ValidationException::withMessages([
                'verification_status' => ['Only pending requests can be accepted.'],
            ]);
        }

        $data = $request->validate([
            'verification_note' => ['sometimes', 'nullable', 'string', 'max:500'],
        ]);

        $order->forceFill([
            'verification_status' => 'accepted',
            'verification_note' => $data['verification_note'] ?? null,
        ])->save();

        try {
            app(\App\Services\OrderStatusMessenger::class)->announceVerification($order->refresh());
        } catch (\Throwable $e) {
            report($e);
        }

        $this->rejectCompetingRequests($order, $data['verification_note'] ?? null);
        // Parts reserve units on acceptance. Cars do NOT consume here —
        // acceptance only unlocks payment; the unit is consumed when the
        // seller marks the order `sold`.
        if ($order->item_type !== 'car') {
            $this->decrementStock($order);
        }

        return new OrderResource($order->refresh());
    }

    /** POST /seller/orders/{order}/reject — decline one request. */
    public function reject(Request $request, Order $order): OrderResource
    {
        $this->ensureOwner($request, $order);

        if ($order->verification_status !== 'pending') {
            throw ValidationException::withMessages([
                'verification_status' => ['Only pending requests can be rejected.'],
            ]);
        }

        $data = $request->validate([
            'verification_note' => ['sometimes', 'nullable', 'string', 'max:500'],
        ]);

        $order->forceFill([
            'verification_status' => 'rejected',
            'verification_note' => $data['verification_note'] ?? null,
        ])->save();

        return new OrderResource($order->refresh());
    }

    /** POST /seller/orders/{order}/confirm-funds — verify the buyer's payment. */
    public function confirmFunds(Request $request, Order $order): OrderResource
    {
        $this->ensureOwner($request, $order);

        if ($order->verification_status !== 'accepted') {
            throw ValidationException::withMessages([
                'verification_status' => ['Only accepted orders can have funds confirmed.'],
            ]);
        }

        if ($order->payment_status !== 'paid') {
            throw ValidationException::withMessages([
                'payment_status' => ['Funds cannot be confirmed before the buyer submits payment.'],
            ]);
        }

        $order->forceFill(['payment_status' => 'confirmed'])->save();

        try {
            app(\App\Services\OrderStatusMessenger::class)->announceFundsConfirmed($order->refresh());
        } catch (\Throwable $e) {
            report($e);
        }

        return new OrderResource($order->refresh());
    }

    /**
     * POST /seller/orders/{order}/status — seller advances their own order.
     *
     * Cars use the escrow lifecycle: processing → negotiating → sold →
     * shipped → delivered → (buyer accepts → completed + payout) or
     * (buyer rejects → disputed → refunded). Payment info is visible to
     * the seller from acceptance; funds release only on buyer inspection
     * acceptance. Parts use direct capture: processing → preparing →
     * shipped → delivered → completed (payout recorded on completion,
     * no inspection gate).
     */
    public function updateStatus(Request $request, Order $order): OrderResource
    {
        $this->ensureOwner($request, $order);

        $validated = $request->validate([
            'status' => ['required', 'string', 'in:processing,negotiating,reserved,preparing,sold,shipped,delivered,completed,disputed'],
            'tracking_number' => ['nullable', 'string', 'max:100'],
            'tracking_url' => ['nullable', 'url', 'max:500'],
            'carrier' => ['nullable', 'string', 'max:100'],
            'estimated_arrival' => ['nullable', 'date'],
        ]);

        if (in_array($order->status, ['completed', 'refunded', 'cancelled'], true)) {
            throw ValidationException::withMessages([
                'status' => ['This order is already closed.'],
            ]);
        }

        if (in_array($validated['status'], ['negotiating', 'sold', 'shipped', 'delivered', 'completed'], true)
            && $order->verification_status !== 'accepted') {
            throw ValidationException::withMessages([
                'status' => ['Only accepted orders can move into fulfillment.'],
            ]);
        }

        // Proof-first delivery (car builds): the seller submits handover
        // proof at shipped, then marks delivered. No proof → no delivery.
        if (($validated['status'] ?? null) === 'delivered'
            && ($order->item_type ?? 'part') === 'car'
            && !in_array($order->proof_status ?? 'none', ['pending', 'approved'], true)) {
            throw ValidationException::withMessages([
                'status' => ['Submit handover proof before marking this build delivered.'],
            ]);
        }

        if ($validated['status'] === 'completed'
            && !in_array($order->payment_status, ['paid', 'confirmed', 'released'], true)) {
            throw ValidationException::withMessages([
                'status' => ['Funds must be submitted before an order can be completed.'],
            ]);
        }

        $this->ensureForwardTransition($order, $validated['status']);

        // Marking sold is the seller committing the unit: flip the
        // listing so no new buyer can start checkout on it. Stock was
        // already reserved when payment was secured, so this flips
        // status only — it never consumes twice. Nothing before this
        // step marks the car sold.
        if ($validated['status'] === 'sold' && $order->item_type === 'car' && $order->car_id) {
            $this->markListingSold($order);
        }

        $fromStatus = $order->status;
        $order->update($validated);

        // Every seller move messages the buyer in-thread.
        try {
            app(\App\Services\OrderStatusMessenger::class)->announce($order->refresh(), $fromStatus);
        } catch (\Throwable $e) {
            report($e);
        }

        // Completion releases money exactly once, both flows (see admin
        // path): held escrow or captured payment settles to the seller
        // wallet so completed orders never leave it empty.
        if (($validated['status'] ?? null) === 'completed') {
            $fresh = $order->refresh();
            if (in_array($fresh->payment_status, ['paid', 'confirmed', 'released'], true)) {
                try {
                    \App\Models\PlatformTransaction::recordPayoutOnce($fresh);
                } catch (\Throwable $e) {
                    report($e);
                }
            }
            try {
                \App\Models\PlatformTransaction::recordAgentCommission($fresh->refresh());
            } catch (\Throwable $e) {
                report($e);
            }
        }

        return new OrderResource($order->refresh());
    }

    /**
     * Reject backwards lifecycle moves (same rules as the admin path):
     * closed orders stay closed; committed orders never rewind into
     * negotiation or re-sell.
     */
    private function ensureForwardTransition(Order $order, string $next): void
    {
        $current = $order->status ?? 'processing';
        if ($next === $current) {
            return;
        }
        if ($next === 'negotiating'
            && !in_array($current, ['processing', 'negotiating', 'reserved'], true)) {
            throw ValidationException::withMessages([
                'status' => ['Only an open order can move into negotiation — this order is already committed.'],
            ]);
        }
        if ($next === 'sold'
            && !in_array($current, ['processing', 'negotiating', 'reserved', 'preparing'], true)) {
            throw ValidationException::withMessages([
                'status' => ['This order has already moved past the sold step.'],
            ]);
        }
    }

    /**
     * POST /seller/orders/{order}/refund — resolve a dispute by refunding
     * the buyer. The payment (held escrow for cars, captured payment for
     * parts) is returned, the order closes as refunded, and car stock is
     * restored.
     */
    public function refund(Request $request, Order $order): OrderResource
    {
        $this->ensureOwner($request, $order);

        if ($order->status !== 'disputed') {
            throw ValidationException::withMessages([
                'status' => ['Only disputed orders can be refunded.'],
            ]);
        }

        if (in_array($order->payment_status, ['refunded', 'released'], true)) {
            throw ValidationException::withMessages([
                'payment_status' => ['Funds are no longer available for refund on this order.'],
            ]);
        }

        $data = $request->validate([
            'verification_note' => ['sometimes', 'nullable', 'string', 'max:500'],
        ]);

        $order->forceFill([
            'status' => 'refunded',
            'payment_status' => 'refunded',
            'verification_note' => $data['verification_note']
                ?? ($order->item_type === 'car' ? 'Refunded after inspection dispute.' : 'Refunded after dispute resolution.'),
        ])->save();

        $this->restoreStock($order);

        try {
            \App\Models\PlatformTransaction::recordOrderRefund($order);
        } catch (\Throwable $e) {
            report($e);
        }

        try {
            app(\App\Services\OrderStatusMessenger::class)->announceRefund($order->refresh());
        } catch (\Throwable $e) {
            report($e);
        }

        return new OrderResource($order->refresh());
    }

    /**
     * POST /seller/orders/{order}/proof — seller submits handover proof
     * (photos + note) on a delivered car build. An admin reviews it;
     * approval releases the held funds to the seller wallet.
     */
    public function submitProof(Request $request, Order $order): OrderResource
    {
        $this->ensureOwner($request, $order);

        if (($order->item_type ?? 'part') !== 'car') {
            throw ValidationException::withMessages([
                'item_type' => ['Handover proof applies to vehicle orders only.'],
            ]);
        }
        if (($order->verification_status ?? 'pending') !== 'accepted') {
            throw ValidationException::withMessages([
                'verification_status' => ['Only accepted orders can submit handover proof.'],
            ]);
        }
        if (!in_array($order->status, ['shipped', 'delivered'], true)) {
            throw ValidationException::withMessages([
                'status' => ['Proof can be submitted once the vehicle is shipped or delivered.'],
            ]);
        }

        $data = $request->validate([
            'images' => ['sometimes', 'array', 'max:10'],
            'images.*' => ['string', 'max:2000'],
            'note' => ['sometimes', 'nullable', 'string', 'max:2000'],
        ]);

        $order->forceFill([
            'proof_images' => array_values($data['images'] ?? []),
            'proof_note' => $data['note'] ?? null,
            'proof_status' => 'pending',
            'proof_submitted_at' => now(),
            'proof_reviewed_by' => null,
            'proof_reviewed_at' => null,
            'proof_rejection_reason' => null,
        ])->save();

        try {
            $adminIds = \App\Models\User::query()->whereIn('role', ['admin', 'super_admin'])->pluck('id')->all();
            app(\App\Services\NotificationService::class)->sendMany(
                $adminIds,
                'order',
                "Handover proof: {$order->order_number}",
                "Seller submitted delivery proof on {$order->item_name} — review to release held funds.",
                ['order_id' => $order->id, 'order_number' => $order->order_number],
                '/admin/car-transactions',
            );
        } catch (\Throwable $e) {
            report($e);
        }

        return new OrderResource($order->refresh());
    }

    private function carStatusValue(?Car $car): ?string
    {
        if (!$car || $car->status === null) {
            return null;
        }

        return $car->status instanceof CarStatus ? $car->status->value : (string) $car->status;
    }

    /** Flip the purchased car listing to sold once the seller commits it. */
    private function markListingSold(Order $order): void
    {
        if (($car = Car::find($order->car_id)) && $this->carStatusValue($car) !== CarStatus::Sold->value) {
            $car->forceFill(['status' => CarStatus::Sold->value])->save();
        }
    }

    /** Return refunded car units to sellable stock (NULL-safe). */
    private function restoreStock(Order $order): void
    {
        if ($order->item_type === 'car' && $order->car_id && ($car = Car::find($order->car_id))) {
            $onHand = $car->quantity === null ? 0 : (int) $car->quantity;
            $car->forceFill(['quantity' => $onHand + max(1, (int) $order->quantity)])->save();
            $car->refresh();
            if ((int) $car->quantity > 0 && $this->carStatusValue($car) === CarStatus::Sold->value) {
                $car->forceFill(['status' => CarStatus::Active->value])->save();
            }
        }
    }

    private function ensureOwner(Request $request, Order $order): void
    {
        $user = $request->user();
        if ((int) $order->seller_id !== (int) $user->id && !$user->isAdmin()) {
            abort(403, 'You can only verify requests for your own listings.');
        }
    }

    /** Auto-reject every other pending request on the same listing. */
    private function rejectCompetingRequests(Order $accepted, ?string $note): void
    {
        if (!$accepted->part_id && !$accepted->car_id) {
            return;
        }

        Order::query()
            ->where('id', '!=', $accepted->id)
            ->where('verification_status', 'pending')
            ->when($accepted->part_id, fn ($q) => $q->where('part_id', $accepted->part_id))
            ->when($accepted->car_id, fn ($q) => $q->where('car_id', $accepted->car_id))
            ->update([
                'verification_status' => 'rejected',
                'verification_note' => 'Another buyer request was accepted for this listing.',
                'updated_at' => now(),
            ]);
    }

    /** Reserve stock on acceptance; mark sold out at zero. */
    private function decrementStock(Order $order): void
    {
        if ($order->item_type === 'car' && $order->car_id && ($car = Car::find($order->car_id))) {
            $car->decrement('quantity', 1);
            $car->refresh();
            if ((int) $car->quantity <= 0) {
                $car->forceFill(['quantity' => 0, 'status' => CarStatus::Sold->value])->save();
            }
        }

        if ($order->item_type === 'part' && $order->part_id && ($part = Part::find($order->part_id))) {
            // Ledger-first: records a consumption movement and syncs quantity.
            $owner = $part->seller()->first() ?? $order->seller;
            try {
                $this->inventory->move($owner, $part, [
                    'type' => 'consumption',
                    'quantity' => max(1, (int) $order->quantity),
                    'reference' => $order->order_number,
                    'reason' => "Sale {$order->order_number} accepted",
                ]);
            } catch (\Throwable) {
                // Fall back to the legacy direct decrement (e.g. ledger guard).
                $part->decrement('quantity', max(1, (int) $order->quantity));
            }
            $part->refresh();
            if ((int) $part->quantity <= 0) {
                $part->forceFill(['quantity' => 0, 'status' => PartStatus::Sold->value])->save();
            }
        }
    }
}
