<?php

namespace Tests\Feature;

use App\Models\Car;
use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SellerOrderVerificationTest extends TestCase
{
    use RefreshDatabase;

    private function makeCar(User $seller, array $overrides = []): Car
    {
        return Car::create(array_merge([
            'seller_id' => $seller->id,
            'title' => '1998 Nissan Silvia S15 Spec-R Aero',
            'brand' => 'Nissan',
            'model' => 'Silvia S15 Spec-R',
            'year' => 1998,
            'price' => 1240000.00,
            'quantity' => 2,
            'status' => 'active',
            'published_at' => now(),
        ], $overrides));
    }

    private function makeRequest(Car $car, User $buyer, string $email): Order
    {
        return Order::create([
            'buyer_name' => $buyer->name,
            'buyer_email' => $email,
            'shipping_address' => 'Makati City',
            'item_type' => 'car',
            'car_id' => $car->id,
            'seller_id' => $car->seller_id,
            'item_name' => $car->title,
            'quantity' => 1,
            'unit_price' => $car->price,
            'shipping_fee' => 0,
            'total_amount' => $car->price,
            'status' => 'processing',
            'verification_status' => 'pending',
        ]);
    }

    public function test_new_orders_start_pending_verification(): void
    {
        $seller = User::factory()->create(['role' => 'seller']);
        $car = $this->makeCar($seller);

        $response = $this->postJson('/api/v1/orders', [
            'buyer_name' => 'Anton Valenzuela',
            'buyer_email' => 'anton@garagemarket.ph',
            'shipping_address' => '124 Chino Roces Ave, Makati',
            'car_id' => $car->id,
            'item_type' => 'car',
            'quantity' => 1,
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.verification_status', 'pending');
    }

    public function test_seller_accept_verifies_one_and_rejects_the_rest(): void
    {
        $seller = User::factory()->create(['role' => 'seller']);
        $buyerA = User::factory()->create(['role' => 'buyer']);
        $buyerB = User::factory()->create(['role' => 'buyer']);
        $car = $this->makeCar($seller, ['quantity' => 2]);

        $orderA = $this->makeRequest($car, $buyerA, 'a@garage.test');
        $orderB = $this->makeRequest($car, $buyerB, 'b@garage.test');

        $this->withToken($seller->createToken('t')->plainTextToken);

        $this->postJson("/api/v1/seller/orders/{$orderA->id}/accept", ['verification_note' => 'Unit reserved.'])
            ->assertStatus(200)
            ->assertJsonPath('data.verification_status', 'accepted');

        $this->assertDatabaseHas('orders', ['id' => $orderA->id, 'verification_status' => 'accepted']);
        $this->assertDatabaseHas('orders', ['id' => $orderB->id, 'verification_status' => 'rejected']);

        // Acceptance unlocks payment but never consumes car stock —
        // the car stays listed until the seller marks the order sold.
        $this->assertDatabaseHas('cars', ['id' => $car->id, 'quantity' => 2, 'status' => 'active']);
    }

    public function test_sold_step_flips_status_while_payment_reserves_stock(): void
    {
        $seller = User::factory()->create(['role' => 'seller']);
        $buyer = User::factory()->create(['role' => 'buyer']);
        $car = $this->makeCar($seller, ['quantity' => 1]);

        $order = $this->makeRequest($car, $buyer, 'solo@garage.test');

        $this->withToken($seller->createToken('t')->plainTextToken);

        $this->postJson("/api/v1/seller/orders/{$order->id}/accept")->assertStatus(200);

        // Accepted, payment unlocked — still listed, stock intact.
        $this->assertDatabaseHas('cars', ['id' => $car->id, 'quantity' => 1, 'status' => 'active']);

        $this->patchJson("/api/v1/seller/orders/{$order->id}/status", ['status' => 'negotiating'])
            ->assertOk();
        $this->assertDatabaseHas('cars', ['id' => $car->id, 'quantity' => 1, 'status' => 'active']);

        // The seller committing the unit flips status only — stock was
        // already reserved (or is untouched when unpaid); never double.
        $this->patchJson("/api/v1/seller/orders/{$order->id}/status", ['status' => 'sold'])
            ->assertOk()
            ->assertJsonPath('data.status', 'sold');
        $this->assertDatabaseHas('cars', ['id' => $car->id, 'quantity' => 1, 'status' => 'sold']);
    }

    public function test_prepaid_car_checkout_reserves_stock_and_flags_paid(): void
    {
        $seller = User::factory()->create(['role' => 'seller']);
        $car = $this->makeCar($seller, ['quantity' => 1]);

        $orderNumber = $this->postJson('/api/v1/orders', [
            'buyer_name' => 'Deal Buyer',
            'buyer_email' => 'deal@garage.test',
            'shipping_address' => 'Makati',
            'car_id' => $car->id,
            'item_type' => 'car',
            'quantity' => 1,
            'payment_method' => 'bank_transfer',
            'payment_reference' => 'HELD-REF-9',
            'mock_paid' => true,
        ])->assertCreated()->json('data.order_number');

        // Funds held on the last unit — auto-SOLD to this buyer, never
        // left open in processing.
        $this->assertDatabaseHas('orders', [
            'order_number' => $orderNumber,
            'payment_status' => 'paid',
            'verification_status' => 'accepted',
            'status' => 'sold',
        ]);
        $this->assertDatabaseHas('cars', ['id' => $car->id, 'quantity' => 0, 'status' => 'sold']);

        // Listing reads as payment-secured to the seller…
        $this->getJson("/api/v1/marketplace/cars/{$car->id}", $this->sellerToken($seller))
            ->assertOk()
            ->assertJsonPath('data.payment_secured', true);

        // …but the sold unit is no longer public.
        $this->getJson("/api/v1/marketplace/cars/{$car->id}")->assertStatus(403);

        // …and sold, it leaves the public marketplace…
        $grid = $this->getJson('/api/v1/marketplace/cars')->assertOk()->json('data');
        $this->assertNotContains($car->id, collect($grid)->pluck('id')->all());

        // …while the seller still sees the paid order in incoming requests.
        $incoming = $this->getJson('/api/v1/seller/orders', $this->sellerToken($seller))->assertOk();
        $numbers = collect($incoming->json('data'))->pluck('order_number')->all();
        $this->assertContains($orderNumber, $numbers);
    }

    public function test_confirm_payment_reserves_once_and_refund_restores(): void
    {
        $seller = User::factory()->create(['role' => 'seller']);
        $buyer = User::factory()->create(['role' => 'buyer', 'email' => 'pay@garage.test']);
        $car = $this->makeCar($seller, ['quantity' => 2]);

        $order = $this->makeRequest($car, $buyer, 'pay@garage.test');
        $this->postJson("/api/v1/seller/orders/{$order->id}/accept", [], $this->sellerToken($seller))->assertOk();

        // First payment secures one unit…
        $this->postJson("/api/v1/orders/{$order->order_number}/confirm-payment", [
            'payment_reference' => 'PAY-1',
        ], $this->sellerToken($buyer))
            ->assertOk()
            ->assertJsonPath('data.financials.payment_status', 'paid');
        $this->assertDatabaseHas('cars', ['id' => $car->id, 'quantity' => 1, 'status' => 'active']);

        // …re-posting the reference never consumes twice…
        $this->postJson("/api/v1/orders/{$order->order_number}/confirm-payment", [
            'payment_reference' => 'PAY-1-DUP',
        ], $this->sellerToken($buyer))->assertOk();
        $this->assertDatabaseHas('cars', ['id' => $car->id, 'quantity' => 1, 'status' => 'active']);

        // …and a dispute refund returns the unit.
        $this->patchJson("/api/v1/seller/orders/{$order->id}/status", ['status' => 'delivered'], $this->sellerToken($seller))->assertOk();
        $this->postJson("/api/v1/orders/{$order->order_number}/reject-inspection", ['reason' => 'scratch'], $this->sellerToken($buyer))->assertOk();
        $this->postJson("/api/v1/seller/orders/{$order->id}/refund", [], $this->sellerToken($seller))
            ->assertOk()
            ->assertJsonPath('data.financials.payment_status', 'refunded');
        $this->assertDatabaseHas('cars', ['id' => $car->id, 'quantity' => 2, 'status' => 'active']);
    }

    private function sellerToken(User $seller): array
    {
        return ['Authorization' => 'Bearer ' . $seller->createToken('t2')->plainTextToken];
    }

    public function test_second_buyer_blocked_once_car_stock_reserved(): void
    {
        $seller = User::factory()->create(['role' => 'seller']);
        $car = $this->makeCar($seller, ['quantity' => 1]);

        // First buyer pays → unit reserved.
        $this->postJson('/api/v1/orders', [
            'buyer_name' => 'First Buyer',
            'buyer_email' => 'first@garage.test',
            'shipping_address' => 'Makati',
            'car_id' => $car->id,
            'item_type' => 'car',
            'quantity' => 1,
            'payment_method' => 'bank_transfer',
            'payment_reference' => 'FIRST-1',
            'mock_paid' => true,
        ])->assertCreated();

        // Second buyer cannot even start a transaction on it.
        $this->postJson('/api/v1/orders', [
            'buyer_name' => 'Second Buyer',
            'buyer_email' => 'second@garage.test',
            'shipping_address' => 'Makati',
            'car_id' => $car->id,
            'item_type' => 'car',
            'quantity' => 1,
            'payment_method' => 'bank_transfer',
            'payment_reference' => 'SECOND-1',
            'mock_paid' => true,
        ])->assertStatus(422);
    }

    public function test_late_payment_refused_when_stock_reserved_by_other(): void
    {
        $seller = User::factory()->create(['role' => 'seller']);
        $buyerA = User::factory()->create(['role' => 'buyer', 'email' => 'a@garage.test']);
        $buyerB = User::factory()->create(['role' => 'buyer', 'email' => 'b@garage.test']);
        $car = $this->makeCar($seller, ['quantity' => 1]);

        // B requests first (unpaid — stock untouched).
        $orderB = $this->makeRequest($car, $buyerB, 'b@garage.test');

        // A pays → reserves the last unit.
        $this->postJson('/api/v1/orders', [
            'buyer_name' => 'A Buyer',
            'buyer_email' => 'a@garage.test',
            'shipping_address' => 'Makati',
            'car_id' => $car->id,
            'item_type' => 'car',
            'quantity' => 1,
            'payment_method' => 'bank_transfer',
            'payment_reference' => 'A-PAID-1',
            'mock_paid' => true,
        ])->assertCreated();

        // B's late payment is refused — nothing left to secure.
        $this->postJson("/api/v1/orders/{$orderB->order_number}/confirm-payment", [
            'payment_reference' => 'B-LATE-1',
        ], $this->sellerToken($buyerB))->assertStatus(422);
    }

    public function test_paid_order_posts_receipt_to_seller_chat(): void
    {
        $seller = User::factory()->create(['role' => 'seller']);
        $buyer = User::factory()->create(['role' => 'buyer', 'email' => 'chatbuyer@garage.test']);
        $car = $this->makeCar($seller, ['quantity' => 1]);

        $orderNumber = $this->postJson('/api/v1/orders', [
            'buyer_name' => $buyer->name,
            'buyer_email' => 'chatbuyer@garage.test',
            'shipping_address' => 'Makati',
            'car_id' => $car->id,
            'item_type' => 'car',
            'quantity' => 1,
            'payment_method' => 'bank_transfer',
            'payment_reference' => 'CHAT-1',
            'mock_paid' => true,
        ], $this->sellerToken($buyer))->assertCreated()->json('data.order_number');

        $key = "car:{$car->id}";
        $this->assertDatabaseHas('conversations', [
            'listing_key' => $key,
        ]);
        $convId = \App\Models\Conversation::where('listing_key', $key)->firstOrFail()->id;
        $this->assertDatabaseHas('messages', [
            'conversation_id' => $convId,
            'sender_id' => $buyer->id,
        ]);
        $msg = \App\Models\Message::where('conversation_id', $convId)->firstOrFail();
        $this->assertStringContainsString($orderNumber, $msg->body);
        $this->assertEquals($orderNumber, $msg->metadata['sales_order_number'] ?? null);
    }

    public function test_order_lifecycle_moves_broadcast_to_buyer_and_seller(): void
    {
        \Illuminate\Support\Facades\Event::fake([\App\Events\OrderStatusChanged::class]);

        $seller = User::factory()->create(['role' => 'seller']);
        $buyer = User::factory()->create(['role' => 'buyer']);
        $car = $this->makeCar($seller);
        $order = $this->makeRequest($car, $buyer, 'live@garage.test');
        $order->forceFill(['user_id' => $buyer->id])->save();

        $this->postJson("/api/v1/seller/orders/{$order->id}/accept", [], $this->sellerToken($seller))->assertOk();
        $this->patchJson("/api/v1/seller/orders/{$order->id}/status", ['status' => 'negotiating'], $this->sellerToken($seller))->assertOk();

        \Illuminate\Support\Facades\Event::assertDispatched(
            \App\Events\OrderStatusChanged::class,
            fn (\App\Events\OrderStatusChanged $event) =>
                (int) $event->order->id === (int) $order->id && $event->order->status === 'negotiating'
        );
    }

    public function test_seller_can_filter_incoming_orders_by_listing(): void
    {
        $seller = User::factory()->create(['role' => 'seller']);
        $carA = $this->makeCar($seller);
        $carB = $this->makeCar($seller);
        $buyer = User::factory()->create(['role' => 'buyer']);

        $orderA = $this->makeRequest($carA, $buyer, 'a@garage.test');
        $this->makeRequest($carB, $buyer, 'b@garage.test');

        $res = $this->getJson("/api/v1/seller/orders?car_id={$carA->id}", $this->sellerToken($seller))->assertOk();
        $ids = collect($res->json('data'))->pluck('id')->all();
        $this->assertEquals([$orderA->id], $ids);
    }

    public function test_seller_can_reject_with_note(): void
    {
        $seller = User::factory()->create(['role' => 'seller']);
        $buyer = User::factory()->create(['role' => 'buyer']);
        $car = $this->makeCar($seller);

        $order = $this->makeRequest($car, $buyer, 'rej@garage.test');

        $this->withToken($seller->createToken('t')->plainTextToken);

        $this->postJson("/api/v1/seller/orders/{$order->id}/reject", ['verification_note' => 'Already reserved offline.'])
            ->assertStatus(200)
            ->assertJsonPath('data.verification_status', 'rejected')
            ->assertJsonPath('data.verification_note', 'Already reserved offline.');
    }

    public function test_stranger_cannot_verify_others_orders(): void
    {
        $seller = User::factory()->create(['role' => 'seller']);
        $buyer = User::factory()->create(['role' => 'buyer']);
        $stranger = User::factory()->create(['role' => 'seller']);
        $car = $this->makeCar($seller);

        $order = $this->makeRequest($car, $buyer, 'x@garage.test');

        $this->withToken($stranger->createToken('t')->plainTextToken);

        $this->postJson("/api/v1/seller/orders/{$order->id}/accept")->assertStatus(403);
    }

    public function test_buyer_can_change_payment_method_before_fulfillment(): void
    {
        $seller = User::factory()->create(['role' => 'seller']);
        $buyer = User::factory()->create(['role' => 'buyer', 'email' => 'pay@garage.test']);
        $car = $this->makeCar($seller);

        $order = $this->makeRequest($car, $buyer, 'pay@garage.test');

        $this->withToken($buyer->createToken('t')->plainTextToken);

        $this->patchJson("/api/v1/orders/{$order->order_number}/payment-method", ['payment_method' => 'ewallet'])
            ->assertStatus(200)
            ->assertJsonPath('data.financials.payment_method', 'ewallet');
    }

    public function test_buyer_can_pin_delivery_location(): void
    {
        $seller = User::factory()->create(['role' => 'seller']);
        $buyer = User::factory()->create(['role' => 'buyer', 'email' => 'pin@garage.test']);
        $car = $this->makeCar($seller);

        $order = $this->makeRequest($car, $buyer, 'pin@garage.test');

        $this->withToken($buyer->createToken('t')->plainTextToken);

        $this->patchJson("/api/v1/orders/{$order->order_number}/delivery-location", [
            'latitude' => 14.5547,
            'longitude' => 121.0244,
            'label' => 'Makati Showroom, Chino Roces Ave',
        ])
            ->assertStatus(200)
            ->assertJsonPath('data.delivery.has_pin', true)
            ->assertJsonPath('data.delivery.label', 'Makati Showroom, Chino Roces Ave');

        $this->assertDatabaseHas('orders', [
            'id' => $order->id,
            'delivery_latitude' => 14.5547,
            'delivery_longitude' => 121.0244,
        ]);
    }

    public function test_delivery_pin_rejects_bad_coordinates_and_strangers(): void
    {
        $seller = User::factory()->create(['role' => 'seller']);
        $buyer = User::factory()->create(['role' => 'buyer', 'email' => 'pin2@garage.test']);
        $stranger = User::factory()->create(['role' => 'buyer']);
        $car = $this->makeCar($seller);

        $order = $this->makeRequest($car, $buyer, 'pin2@garage.test');

        $this->withToken($buyer->createToken('t')->plainTextToken);
        $this->patchJson("/api/v1/orders/{$order->order_number}/delivery-location", [
            'latitude' => 91,
            'longitude' => 121,
        ])->assertStatus(422);

        $this->withToken($stranger->createToken('t')->plainTextToken);
        $this->patchJson("/api/v1/orders/{$order->order_number}/delivery-location", [
            'latitude' => 14.5,
            'longitude' => 121.0,
        ])->assertStatus(403);
    }
}
