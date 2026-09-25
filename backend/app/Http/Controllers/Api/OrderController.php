<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Order\StoreOrderRequest;
use App\Http\Resources\OrderResource;
use App\Models\Car;
use App\Models\Order;
use App\Models\Part;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Str;

class OrderController extends Controller
{
    /**
     * Display a listing of orders (authenticated user or admin).
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $user = $request->user();

        $query = Order::query()->latest();

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
     * Update order status and shipping tracking (Admin / Staff).
     */
    public function updateStatus(Request $request, Order $order): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['required', 'string', 'in:processing,shipped,delivered,cancelled,disputed'],
            'tracking_number' => ['nullable', 'string', 'max:100'],
            'carrier' => ['nullable', 'string', 'max:100'],
        ]);

        $order->update($validated);

        return (new OrderResource($order))->response();
    }

    /**
     * Place a checkout order and generate an official sales order.
     * Captures vehicle chassis number and VIN for fitment guarantee.
     */
    public function store(StoreOrderRequest $request): JsonResponse
    {
        $data = $request->validated();

        $part = !empty($data['part_id']) ? Part::with('seller')->find($data['part_id']) : null;
        $car = !empty($data['car_id']) ? Car::with('seller')->find($data['car_id']) : null;

        $itemType = $data['item_type'] ?? ($part ? 'part' : ($car ? 'car' : 'general'));
        $quantity = (int) ($data['quantity'] ?? 1);

        $itemName = $data['item_name'] ?? ($part ? $part->title : ($car ? $car->title : 'Automotive Performance Component'));
        $itemSku = $data['item_sku'] ?? ($part ? ($part->part_number ?? 'PART-' . $part->id) : ($car ? ($car->vin ?? 'CAR-' . $car->id) : 'GEN-PART'));
        $itemImageUrl = $part ? $part->primary_image_url : ($car ? $car->primary_image_url : null);
        $sellerId = $part ? $part->seller_id : ($car ? $car->seller_id : null);
        $sellerName = $part ? ($part->seller?->name ?? 'HKS & Garage Pro Parts') : ($car ? ($car->seller?->name ?? 'Verified Dealership') : 'Garage Parts Official Depot');

        $unitPrice = $part ? (float) $part->price : ($car ? (float) $car->price : 2500.00);
        $shippingFee = ($part && !empty($part->free_shipping)) || $car ? 0.00 : 350.00;
        if ($unitPrice * $quantity >= 10000.00) {
            $shippingFee = 0.00; // Free freight for orders >= 10k
        }

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
            'total_amount' => $totalAmount,
            'commission_rate' => $commissionRate,
            'commission_amount' => $commissionAmount,
            'commission_status' => $commissionStatus,

            'payment_method' => $data['payment_method'] ?? 'bank_transfer',
            'payment_status' => 'pending',
            'status' => 'processing',
            'verification_status' => 'pending',
            'notes' => $data['notes'] ?? null,
        ]);

        return (new OrderResource($order))
            ->response()
            ->setStatusCode(201);
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
            || in_array($order->status, ['cancelled', 'delivered'], true)) {
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

        if (in_array($order->status, ['cancelled', 'delivered'], true)) {
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
     * Retrieve a sales order by ID or order number.
     */
    public function show(string $identifier): JsonResponse
    {
        $order = Order::where('order_number', $identifier)
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
