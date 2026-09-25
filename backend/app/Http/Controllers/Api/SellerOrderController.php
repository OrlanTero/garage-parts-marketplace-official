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
 * the rest are auto-rejected and stock is decremented on acceptance.
 */
class SellerOrderController extends Controller
{
    /** GET /seller/orders — incoming requests for my listings. */
    public function index(Request $request)
    {
        $validated = $request->validate([
            'verification_status' => ['sometimes', 'in:pending,accepted,rejected'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:50'],
        ]);

        $query = Order::query()
            ->where('seller_id', $request->user()->id)
            ->with(['part:id,title,price', 'car:id,title,price'])
            ->when($validated['verification_status'] ?? null, fn ($q, $s) => $q->where('verification_status', $s))
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

        $this->rejectCompetingRequests($order, $data['verification_note'] ?? null);
        $this->decrementStock($order);

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
            $part->decrement('quantity', max(1, (int) $order->quantity));
            $part->refresh();
            if ((int) $part->quantity <= 0) {
                $part->forceFill(['quantity' => 0, 'status' => PartStatus::Sold->value])->save();
            }
        }
    }
}
