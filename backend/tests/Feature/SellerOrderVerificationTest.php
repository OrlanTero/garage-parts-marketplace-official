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

        // Stock decremented by one unit.
        $this->assertDatabaseHas('cars', ['id' => $car->id, 'quantity' => 1, 'status' => 'active']);
    }

    public function test_accepting_last_unit_marks_car_sold(): void
    {
        $seller = User::factory()->create(['role' => 'seller']);
        $buyer = User::factory()->create(['role' => 'buyer']);
        $car = $this->makeCar($seller, ['quantity' => 1]);

        $order = $this->makeRequest($car, $buyer, 'solo@garage.test');

        $this->withToken($seller->createToken('t')->plainTextToken);

        $this->postJson("/api/v1/seller/orders/{$order->id}/accept")->assertStatus(200);

        $this->assertDatabaseHas('cars', ['id' => $car->id, 'quantity' => 0, 'status' => 'sold']);
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
