<?php

namespace App\Http\Controllers\Api;

use App\Events\MessageSent;
use App\Http\Controllers\Controller;
use App\Http\Requests\Order\StoreOrderRequest;
use App\Http\Resources\OrderResource;
use App\Models\Car;
use App\Models\Conversation;
use App\Models\Order;
use App\Models\Part;
use App\Models\PlatformTransaction;
use App\Models\Warehouse;
use App\Services\DeliveryFeeService;
use App\Services\InventoryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Str;

class OrderController extends Controller
{
    public function __construct(
        private DeliveryFeeService $delivery,
        private InventoryService $inventory,
    ) {}
    /**
     * Display a listing of orders (authenticated user or admin).
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $user = $request->user();

        $query = Order::query()->with('warehouse')->latest();

        if ($user && !$user->isAdmin()) {
            $query->where(function ($q) use ($user) {
                $q->where('user_id', $user->id)
                  ->orWhere('buyer_email', $user->email);
            });
        }

        $orders = $query->paginate($request->integer('per_page', 20));

        return OrderResource::collection($orders);
    }

    /**
     * Update order status, delivery info, and tracking (Admin / Staff).
     * Escrow chain: processing → negotiating → sold → shipped → delivered
     * → completed (buyer inspection accepted, payout released) or
     * disputed → refunded. Completion requires submitted (held) funds.
     */
    public function updateStatus(Request $request, Order $order): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['required', 'string', 'in:processing,negotiating,reserved,preparing,sold,shipped,delivered,completed,cancelled,disputed,refunded'],
            'tracking_number' => ['nullable', 'string', 'max:100'],
            'tracking_url' => ['nullable', 'url', 'max:500'],
            'carrier' => ['nullable', 'string', 'max:100'],
            'estimated_arrival' => ['nullable', 'date'],
        ]);

        if (in_array($validated['status'], ['preparing', 'sold', 'shipped', 'delivered', 'completed'], true)
            && $order->verification_status !== 'accepted') {
            abort(422, 'Only accepted orders can move into fulfillment.');
        }

        if ($validated['status'] === 'completed' && !in_array($order->payment_status, ['paid', 'confirmed', 'released'], true)) {
            abort(422, 'Funds must be submitted before an order can be completed.');
        }

        $hadHeldPayment = in_array($order->payment_status, ['paid', 'confirmed'], true);

        $order->update($validated);

        // Cancelling a payment-secured car order frees the reserved units.
        if (($validated['status'] ?? null) === 'cancelled' && $hadHeldPayment
            && $order->item_type === 'car' && $order->car_id && ($car = Car::find($order->car_id))) {
            $onHand = $car->quantity === null ? 0 : (int) $car->quantity;
            $car->forceFill(['quantity' => $onHand + max(1, (int) $order->quantity)])->save();
        }

        return (new OrderResource($order->refresh()))->response();
    }

    /**
     * Public delivery-fee quote from the GAP Valenzuela Main Depot.
     * GET /delivery-quote?latitude=&longitude=&city=&part_id=&quantity=
     */
    public function deliveryQuote(Request $request): JsonResponse
    {
        $data = $request->validate([
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'city' => ['nullable', 'string', 'max:120'],
            'part_id' => ['nullable', 'integer', 'exists:parts,id'],
            'car_id' => ['nullable', 'integer', 'exists:cars,id'],
            'item_type' => ['nullable', 'string', 'in:part,car,general'],
            'quantity' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $part = !empty($data['part_id']) ? Part::find($data['part_id']) : null;
        $car = !empty($data['car_id']) ? Car::find($data['car_id']) : null;
        $itemType = $data['item_type'] ?? ($part ? 'part' : ($car ? 'car' : 'part'));
        $quantity = (int) ($data['quantity'] ?? 1);
        $unitPrice = $part ? (float) $part->price : ($car ? (float) $car->price : 0.00);

        [$originLat, $originLng, $originName] = $this->delivery->originFor($this->dispatchOrigin());
        $quote = $this->delivery->quote(
            isset($data['latitude']) ? (float) $data['latitude'] : null,
            isset($data['longitude']) ? (float) $data['longitude'] : null,
            $data['city'] ?? null,
            $unitPrice * $quantity,
            (bool) ($part->free_shipping ?? false),
            $itemType,
            $originLat,
            $originLng,
            $originName,
        );

        return response()->json(['status' => 'success', 'data' => $quote]);
    }

    /** House dispatch warehouse: active default first, else oldest active. */
    private function dispatchOrigin(): ?Warehouse
    {
        $house = \App\Models\User::house();
        if (!$house) {
            return null;
        }

        return Warehouse::where('owner_id', $house->id)
            ->where('is_active', true)
            ->orderByDesc('is_default')
            ->orderBy('id')
            ->first();
    }

    /**
     * Place a checkout order and generate an official sales order.
     * Captures vehicle chassis number and VIN for fitment guarantee.
     *
     * Escrow flow: the buyer settles (currently a mock step on the
     * storefront; real gateway later) BEFORE the order is created. The
     * settled payment is HELD and secured by the platform — the order is
     * NOT complete at this point (status stays `processing`). It only
     * completes after seller delivery + buyer inspection acceptance, at
     * which point funds are released to the seller. A rejected
     * inspection opens a dispute → refund path instead.
     * Prepaid orders skip the seller verification queue — the house
     * auto-accepts and moves to prep.
     */
    public function store(StoreOrderRequest $request): JsonResponse
    {
        $data = $request->validated();

        $mockPaid = filter_var($data['mock_paid'] ?? false, FILTER_VALIDATE_BOOLEAN);
        if ($mockPaid) {
            $method = $data['payment_method'] ?? null;
            $reference = trim((string) ($data['payment_reference'] ?? ''));
            if (!in_array($method, ['bank_transfer', 'ewallet', 'credit_card'], true) || $reference === '') {
                abort(422, 'A payment method and transaction reference are required to complete checkout.');
            }
        }

        $part = !empty($data['part_id']) ? Part::with('seller')->find($data['part_id']) : null;
        $car = !empty($data['car_id']) ? Car::with('seller')->find($data['car_id']) : null;

        // Deal checkout: a confirmed chat offer locks the unit price via a
        // single-use token. The token is the capability — whoever holds the
        // seller-issued link checks out at the agreed price, exactly once.
        $dealOffer = null;
        if (!empty($data['offer_token'])) {
            $dealOffer = \App\Models\Offer::where('checkout_token', $data['offer_token'])->first();
            // Accept-first rule: chat offers must be confirmed by both
            // parties; listing offers (no conversation) lock on seller
            // acceptance. Either way the agreed price is pinned to the
            // winning buyer via this single-use token.
            $offerOk = $dealOffer && !$dealOffer->checkout_used_at && (
                $dealOffer->status === 'confirmed'
                || ($dealOffer->status === 'accepted' && empty($dealOffer->conversation_id))
            );
            if (!$offerOk) {
                abort(410, 'This deal checkout link is invalid, expired, or already used.');
            }
            $matchesListing = ($dealOffer->item_type === 'car' && $car && (int) $dealOffer->car_id === (int) $car->id)
                || ($dealOffer->item_type === 'part' && $part && (int) $dealOffer->part_id === (int) $part->id);
            if (!$matchesListing) {
                abort(422, 'Deal token does not match this listing.');
            }
            // Pin the deal to its buyer: a signed-in user who is neither
            // the offer buyer nor the listing seller cannot spend it.
            // (Guest checkout still works — the token is the capability.)
            $caller = $request->user();
            if ($caller && (int) $caller->id !== (int) $dealOffer->buyer_id
                && (int) $caller->id !== (int) $dealOffer->seller_id) {
                abort(403, 'This deal price is pinned to another buyer.');
            }
        }

        $itemType = $data['item_type'] ?? ($part ? 'part' : ($car ? 'car' : 'general'));
        $quantity = (int) ($data['quantity'] ?? 1);

        // Stock lockout: when every unit of a car is reserved by secured
        // payments, no one else can start a transaction on it — paid or
        // not. (NULL legacy stock counts as one implicit unit.)
        if ($car) {
            $onHand = $car->quantity === null ? 1 : (int) $car->quantity;
            if ($onHand < max(1, $quantity)) {
                abort(422, 'This unit is no longer available — another buyer\'s payment is already secured.');
            }
        }

        $itemName = $data['item_name'] ?? ($part ? $part->title : ($car ? $car->title : 'Automotive Performance Component'));
        $itemSku = $data['item_sku'] ?? ($part ? ($part->part_number ?? 'PART-' . $part->id) : ($car ? ($car->vin ?? 'CAR-' . $car->id) : 'GEN-PART'));
        $itemImageUrl = $part ? $part->primary_image_url : ($car ? $car->primary_image_url : null);
        $sellerId = $part ? $part->seller_id : ($car ? $car->seller_id : null);
        $sellerName = $part ? ($part->seller?->name ?? 'HKS & Garage Pro Parts') : ($car ? ($car->seller?->name ?? 'Verified Dealership') : 'Garage Parts Official Depot');

        $unitPrice = $dealOffer
            ? (float) $dealOffer->amount
            : ($part ? (float) $part->price : ($car ? (float) $car->price : 2500.00));

        // Server-computed freight from the dispatch warehouse (house
        // default with a pinned address, else the main-branch point) —
        // client totals are never trusted. Pins/centroids price the zone;
        // free-freight promises (cars, free-shipping parts, threshold+) hold.
        $originWarehouse = $this->dispatchOrigin();
        [$originLat, $originLng, $originName] = $this->delivery->originFor($originWarehouse);
        $quote = $this->delivery->quote(
            isset($data['delivery_latitude']) ? (float) $data['delivery_latitude'] : null,
            isset($data['delivery_longitude']) ? (float) $data['delivery_longitude'] : null,
            $data['shipping_city'] ?? null,
            $unitPrice * $quantity,
            (bool) ($part->free_shipping ?? false),
            $itemType,
            $originLat,
            $originLng,
            $originName,
        );
        $shippingFee = $quote['fee'];

        $totalAmount = ($unitPrice * $quantity) + $shippingFee;

        // Resolve Sales Agent Attribution & Commission
        $agentCodeInput = trim((string) ($data['agent_code'] ?? $data['ref'] ?? ''));
        $agentUser = null;
        $agentId = null;
        $agentCode = null;
        $agentName = null;
        $commissionRate = 5.00;
        $commissionAmount = 0.00;
        $commissionStatus = 'pending';

        if (!empty($agentCodeInput)) {
            $agentUser = \App\Models\User::where('agent_code', $agentCodeInput)
                ->orWhere('id', is_numeric($agentCodeInput) ? (int) $agentCodeInput : 0)
                ->first();

            if ($agentUser) {
                $agentId = $agentUser->id;
                $agentCode = $agentUser->agent_code;
                $agentName = $agentUser->name;
                $commissionRate = (float) ($agentUser->commission_rate ?? 5.00);
                $commissionAmount = round(($unitPrice * $quantity) * ($commissionRate / 100), 2);
            } else {
                $agentCode = $agentCodeInput;
                $commissionAmount = round(($unitPrice * $quantity) * (5.00 / 100), 2);
            }
        }

        $orderNumber = 'SO-' . date('Y') . '-' . strtoupper(Str::random(6));

        // Fitment identity: part orders carry the BUYER's chassis/VIN for
        // compatibility checks; car orders carry the PURCHASED car's own VIN
        // straight from its listing (buyer enters nothing).
        $chassisNumber = isset($data['chassis_number']) ? strtoupper(trim($data['chassis_number'])) : null;
        $vin = isset($data['vin']) ? strtoupper(trim($data['vin'])) : null;
        $vehicleMakeModel = $data['vehicle_make_model'] ?? null;

        if ($itemType === 'car' && $car) {
            $vin = $car->vin ? strtoupper(trim($car->vin)) : null;
            $chassisNumber = null;
            $vehicleMakeModel = $vehicleMakeModel
                ?? trim(implode(' ', array_filter([$car->year, $car->brand, $car->model]))) ?: null;
        }

        $order = Order::create([
            'order_number' => $orderNumber,
            'user_id' => $request->user()?->id,

            // Buyer Information
            'buyer_name' => $data['buyer_name'],
            'buyer_email' => $data['buyer_email'],
            'buyer_phone' => $data['buyer_phone'] ?? null,
            'shipping_address' => $data['shipping_address'],
            'shipping_city' => $data['shipping_city'] ?? null,
            'shipping_postal_code' => $data['shipping_postal_code'] ?? null,
            'delivery_latitude' => $data['delivery_latitude'] ?? null,
            'delivery_longitude' => $data['delivery_longitude'] ?? null,
            'delivery_label' => $data['delivery_label'] ?? null,

            // Vehicle Fitment & Identification Details (parts: buyer's vehicle; cars: purchased vehicle's own VIN)
            'chassis_number' => $chassisNumber,
            'vin' => $vin,
            'vehicle_make_model' => $vehicleMakeModel,

            // Item Details
            'item_type' => $itemType,
            'part_id' => $part?->id,
            'car_id' => $car?->id,
            'seller_id' => $sellerId,
            'agent_id' => $agentId,
            'agent_code' => $agentCode,
            'agent_name' => $agentName,
            'item_name' => $itemName,
            'item_sku' => $itemSku,
            'item_image_url' => $itemImageUrl,
            'seller_name' => $sellerName,

            // Financials
            'quantity' => $quantity,
            'unit_price' => $unitPrice,
            'shipping_fee' => $shippingFee,
            'delivery_distance_km' => $quote['distance_km'],
            'delivery_zone' => $quote['zone'],
            'warehouse_id' => $originWarehouse?->id,
            'total_amount' => $totalAmount,
            'commission_rate' => $commissionRate,
            'commission_amount' => $commissionAmount,
            'commission_status' => $commissionStatus,

            'payment_method' => $data['payment_method'] ?? 'bank_transfer',
            'payment_reference' => $mockPaid ? trim((string) ($data['payment_reference'] ?? '')) : null,
            'payment_status' => $mockPaid ? 'paid' : 'pending',
            'status' => 'processing',
            'verification_status' => $mockPaid ? 'accepted' : 'pending',
            'verification_note' => $mockPaid ? 'Auto-verified: prepaid checkout (mock settlement).' : null,
            'notes' => $data['notes'] ?? null,
        ]);

        if ($car) {
            PlatformTransaction::recordCarSaleCommission(
                $car,
                $order,
                $totalAmount,
                5.00,
                $order->payment_method ?? 'bank_transfer',
                $order->order_number,
                $request->user()
            );
        }

        if ($part) {
            PlatformTransaction::recordPartSaleCommission(
                $part,
                $order,
                $unitPrice * $quantity,
                5.00,
                $order->payment_method ?? 'bank_transfer',
                $order->order_number,
                $request->user()
            );
        }

        if ($dealOffer) {
            $dealOffer->forceFill(['status' => 'ordered', 'checkout_used_at' => now()])->save();
        }

        if ($mockPaid) {
            $this->decrementStock($order);
            $this->notifySellerOfPaidOrder($request, $order, $car, $part, $totalAmount);
        }

        return (new OrderResource($order->refresh()))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Drop the paid sales order + receipt straight into the buyer↔seller
     * chat on this listing, so the seller is notified the moment payment
     * is secured. Best-effort: never breaks checkout. Skipped for guest
     * checkouts (no buyer account to send from).
     */
    private function notifySellerOfPaidOrder(Request $request, Order $order, ?Car $car, ?Part $part, float $totalAmount): void
    {
        try {
            // Public checkout carries no auth session, so resolve the
            // buyer account by email as well (guests simply skip this).
            $buyer = $request->user()
                ?? \App\Models\User::where('email', $order->buyer_email)->first();
            $sellerId = (int) ($order->seller_id ?? 0);
            if (!$buyer || $sellerId <= 0 || (int) $buyer->id === $sellerId) {
                return;
            }

            $listingType = $order->item_type === 'car' ? 'car' : 'part';
            $listingId = $listingType === 'car' ? $order->car_id : $order->part_id;
            if (!$listingId || (!$car && !$part)) {
                return;
            }

            $conversation = Conversation::findOrCreateBetween((int) $buyer->id, $sellerId, $listingType, (int) $listingId);

            $message = $conversation->messages()->create([
                'sender_id' => $buyer->id,
                'body' => 'Paid ₱' . number_format($totalAmount, 2)
                    . " — sales order {$order->order_number} generated, payment held in escrow."
                    . " Receipt: /sales-order/{$order->order_number}",
                'is_redacted' => false,
                'listing_type' => $listingType,
                'listing_id' => (int) $listingId,
                'metadata' => [
                    'kind' => 'sales_order',
                    'sales_order_number' => $order->order_number,
                    'total_amount' => $totalAmount,
                ],
            ]);

            $conversation->update([
                'last_message_id' => $message->id,
                'last_message_at' => now(),
            ]);

            try {
                broadcast(new MessageSent($message->load('sender'), $sellerId));
            } catch (\Throwable $broadcastError) {
                report($broadcastError);
            }
        } catch (\Throwable $e) {
            report($e);
        }
    }

    /**
     * Reserve units when payment is secured on a prepaid order.
     *
     * Parts consume immediately (multi-unit catalog). Cars reserve the
     * paid units too — stock drops and zero-stock cars leave the
     * marketplace — but the status is NEVER flipped here: a paid car is
     * "payment secured", not sold. Only the seller marking the order
     * `sold` completes the deal transfer.
     */
    private function decrementStock(Order $order): void
    {
        if ($order->item_type === 'car' && $order->car_id && ($car = Car::find($order->car_id))) {
            $this->reserveCarUnits($car, max(1, (int) $order->quantity));

            return;
        }

        if ($order->item_type === 'part' && $order->part_id && ($part = Part::find($order->part_id))) {
            $owner = $part->seller()->first() ?? $order->seller;
            try {
                $this->inventory->move($owner, $part, [
                    'type' => 'consumption',
                    'quantity' => max(1, (int) $order->quantity),
                    'reference' => $order->order_number,
                    'reason' => "Prepaid sale {$order->order_number}",
                ]);
            } catch (\Throwable) {
                $part->decrement('quantity', max(1, (int) $order->quantity));
            }
            $part->refresh();
            if ((int) $part->quantity <= 0) {
                $part->forceFill(['quantity' => 0, 'status' => \App\Enums\PartStatus::Sold->value])->save();
            }
        }
    }

    /**
     * Buyer updates their settlement method while the order is still
     * open (pending verification or accepted). Payment instructions
     * unlock only after seller acceptance.
     */
    public function updatePaymentMethod(Request $request, string $identifier): JsonResponse
    {
        $order = Order::where('order_number', $identifier)
            ->orWhere('id', is_numeric($identifier) ? (int) $identifier : 0)
            ->firstOrFail();

        $user = $request->user();
        $owns = $user && ((int) $order->user_id === (int) $user->id || $order->buyer_email === $user->email);
        if (!$owns && !($user && $user->isAdmin())) {
            abort(403, 'You can only update your own orders.');
        }

        if (in_array($order->verification_status, ['rejected'], true)
            || in_array($order->status, ['cancelled', 'delivered', 'completed'], true)) {
            abort(422, 'Payment method can no longer be changed for this order.');
        }

        $data = $request->validate([
            'payment_method' => ['required', 'string', 'in:bank_transfer,ewallet,credit_card'],
        ]);

        $order->forceFill(['payment_method' => $data['payment_method']])->save();

        return (new OrderResource($order->refresh()))->response();
    }

    /**
     * Buyer pins (or updates) the precise delivery location for parts
     * freight. Allowed while the order is open — blocked once cancelled
     * or delivered. Intended for use after seller acceptance.
     */
    public function updateDeliveryLocation(Request $request, string $identifier): JsonResponse
    {
        $order = Order::where('order_number', $identifier)
            ->orWhere('id', is_numeric($identifier) ? (int) $identifier : 0)
            ->firstOrFail();

        $user = $request->user();
        $owns = $user && ((int) $order->user_id === (int) $user->id || $order->buyer_email === $user->email);
        if (!$owns && !($user && $user->isAdmin())) {
            abort(403, 'You can only update your own orders.');
        }

        if (in_array($order->status, ['cancelled', 'delivered', 'completed'], true)) {
            abort(422, 'Delivery location can no longer be changed for this order.');
        }

        $data = $request->validate([
            'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
            'label' => ['nullable', 'string', 'max:500'],
        ]);

        $order->forceFill([
            'delivery_latitude' => $data['latitude'],
            'delivery_longitude' => $data['longitude'],
            'delivery_label' => $data['label'] ?? null,
        ])->save();

        return (new OrderResource($order->refresh()))->response();
    }

    /**
     * Buyer confirms the fund transfer after seller acceptance.
     * Moves payment_status pending → paid with the buyer's reference
     * (bank ref / e-wallet transaction id). Funds are only "accepted"
     * once the house/admin verifies them via confirm-funds.
     */
    public function confirmPayment(Request $request, string $identifier): JsonResponse
    {
        $order = Order::where('order_number', $identifier)
            ->orWhere('id', is_numeric($identifier) ? (int) $identifier : 0)
            ->firstOrFail();

        $user = $request->user();
        $owns = $user && ((int) $order->user_id === (int) $user->id || $order->buyer_email === $user->email);
        if (!$owns && !($user && $user->isAdmin())) {
            abort(403, 'You can only confirm payment for your own orders.');
        }

        if ($order->verification_status !== 'accepted') {
            abort(422, 'Payment can only be confirmed after the seller accepts your request.');
        }

        if (in_array($order->status, ['cancelled', 'delivered', 'completed'], true)) {
            abort(422, 'Payment can no longer be confirmed for this order.');
        }

        if ($order->payment_status === 'confirmed') {
            abort(422, 'Funds are already confirmed for this order.');
        }

        $data = $request->validate([
            'payment_method' => ['sometimes', 'string', 'in:bank_transfer,ewallet,credit_card'],
            'payment_reference' => ['required', 'string', 'max:100'],
        ]);

        // First time money lands (pending → paid) on a car order, reserve
        // the units so the listing shows payment-secured stock. Re-posts
        // of an already-paid reference must not consume twice. When every
        // unit is already reserved by another buyer, this payment is refused.
        $freshPayment = $order->payment_status === 'pending';
        $payCar = $freshPayment && $order->item_type === 'car' && $order->car_id
            ? Car::find($order->car_id)
            : null;

        if ($payCar) {
            $onHand = $payCar->quantity === null ? 1 : (int) $payCar->quantity;
            if ($onHand < max(1, (int) $order->quantity)) {
                abort(422, 'This unit is no longer available — another buyer\'s payment is already secured.');
            }
        }

        $order->forceFill([
            'payment_method' => $data['payment_method'] ?? $order->payment_method,
            'payment_reference' => trim($data['payment_reference']),
            'payment_status' => 'paid',
        ])->save();

        if ($payCar) {
            $this->reserveCarUnits($payCar, max(1, (int) $order->quantity));
        }

        return (new OrderResource($order->refresh()))->response();
    }

    /**
     * Reserve car units the moment payment is secured. Quantity floors
     * at zero (NULL legacy stock counts as one implicit unit). Status
     * is intentionally untouched — reserved is not sold.
     */
    private function reserveCarUnits(Car $car, int $qty): void
    {
        $onHand = $car->quantity === null ? 1 : (int) $car->quantity;
        $car->forceFill(['quantity' => max(0, $onHand - max(1, $qty))])->save();
    }

    /**
     * Buyer accepts the delivered car after inspection.
     * Releases the held payment to the seller and completes the order.
     * POST /orders/{identifier}/accept-inspection (auth, buyer owns order).
     */
    public function acceptInspection(Request $request, string $identifier): JsonResponse
    {
        $order = $this->findBuyerOrder($request, $identifier);

        if ($order->status !== 'delivered') {
            abort(422, 'Only a delivered order can be accepted after inspection.');
        }
        if ($order->verification_status !== 'accepted') {
            abort(422, 'Only a seller-accepted order can be completed.');
        }

        $order->forceFill([
            'status' => 'completed',
            'payment_status' => 'released',
        ])->save();

        try {
            \App\Models\PlatformTransaction::recordSellerPayout($order);
        } catch (\Throwable $e) {
            report($e);
        }

        return (new OrderResource($order->refresh()))->response();
    }

    /**
     * Buyer rejects the delivered car after inspection.
     * Opens a dispute — the held payment stays frozen until the
     * dispute resolves into a refund (seller/admin) or release.
     * POST /orders/{identifier}/reject-inspection {reason?} (auth, buyer).
     */
    public function rejectInspection(Request $request, string $identifier): JsonResponse
    {
        $order = $this->findBuyerOrder($request, $identifier);

        if (!in_array($order->status, ['delivered', 'shipped'], true)) {
            abort(422, 'Only a delivered order can be disputed after inspection.');
        }

        $data = $request->validate([
            'reason' => ['sometimes', 'nullable', 'string', 'max:1000'],
        ]);

        $order->forceFill([
            'status' => 'disputed',
            'notes' => trim(implode("\n", array_filter([
                $order->notes,
                'Inspection rejected by buyer: ' . ($data['reason'] ?? 'no reason given'),
            ]))),
        ])->save();

        return (new OrderResource($order->refresh()))->response();
    }

    /** Locate an order the signed-in buyer owns (or admin). */
    private function findBuyerOrder(Request $request, string $identifier): \App\Models\Order
    {
        $order = \App\Models\Order::where('order_number', $identifier)
            ->orWhere('id', is_numeric($identifier) ? (int) $identifier : 0)
            ->firstOrFail();

        $user = $request->user();
        $owns = $user && ((int) $order->user_id === (int) $user->id || $order->buyer_email === $user->email);
        if (!$owns && !($user && $user->isAdmin())) {
            abort(403, 'You can only review your own orders.');
        }

        if (in_array($order->status, ['cancelled', 'completed', 'refunded'], true)) {
            abort(422, 'This order is already closed.');
        }

        return $order;
    }

    /**
     * Public deal-quote lookup for seller-issued checkout links.
     * GET /offer-quote?token= — validates the single-use token and returns
     * the locked listing + agreed price so checkout renders it read-only.
     */
    public function offerQuote(Request $request): JsonResponse
    {
        $data = $request->validate([
            'token' => ['required', 'string', 'max:50'],
        ]);

        $offer = \App\Models\Offer::where('checkout_token', $data['token'])->first();
        $offerOk = $offer && !$offer->checkout_used_at && (
            $offer->status === 'confirmed'
            || ($offer->status === 'accepted' && empty($offer->conversation_id))
        );
        if (!$offerOk) {
            abort(410, 'This deal checkout link is invalid, expired, or already used.');
        }

        $listing = $offer->item_type === 'car'
            ? Car::with('seller:id,username')->find($offer->car_id)
            : Part::with('seller:id,username')->find($offer->part_id);

        return response()->json(['status' => 'success', 'data' => [
            'agreed_amount' => (float) $offer->amount,
            'item_type' => $offer->item_type,
            'car_id' => $offer->car_id,
            'part_id' => $offer->part_id,
            'listing_title' => $listing?->title,
            'listing_image_url' => $listing?->primary_image_url,
            'seller_username' => $listing?->seller?->username,
            'offer_id' => $offer->id,
        ]]);
    }

    /**
     * Public transaction verification for receipt QR codes.
     * GET /orders/verify/{hash} — no auth. Only a genuine per-order
     * security hash returns valid:true; anything else is invalid.
     */
    public function verify(string $hash): JsonResponse
    {
        $order = Order::query()->where('security_hash', $hash)->first();

        if (!$order) {
            return response()->json([
                'status' => 'success',
                'data' => ['valid' => false],
            ]);
        }

        return response()->json(['status' => 'success', 'data' => [
            'valid' => true,
            'order_number' => $order->order_number,
            'item_name' => $order->item_name,
            'item_type' => $order->item_type,
            'total_amount' => (float) $order->total_amount,
            'formatted_total' => '₱ ' . number_format((float) $order->total_amount, 2),
            'status' => $order->status,
            'payment_status' => $order->payment_status,
            'seller_name' => $order->seller_name,
            'placed_at' => $order->created_at?->toIso8601String(),
        ]]);
    }

    /**
     * Retrieve a sales order by ID or order number.
     */
    public function show(string $identifier): JsonResponse
    {
        $order = Order::with('warehouse')
            ->where('order_number', $identifier)
            ->orWhere('id', is_numeric($identifier) ? (int) $identifier : 0)
            ->first();

        if (!$order) {
            return response()->json([
                'message' => 'Sales Order not found with identifier: ' . $identifier,
            ], 404);
        }

        return (new OrderResource($order))->response();
    }
}
