<?php

namespace Tests\Feature;

use App\Models\Car;
use App\Models\Notification;
use App\Models\Order;
use App\Models\PlatformTransaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CarTransactionTest extends TestCase
{
    use RefreshDatabase;

    private function token(User $user): array
    {
        return ['Authorization' => 'Bearer ' . $user->createToken('t')->plainTextToken];
    }

    private function makeCar(User $seller): Car
    {
        return Car::create([
            'seller_id' => $seller->id,
            'title' => '1999 Nissan Skyline GT-R V-Spec',
            'brand' => 'Nissan',
            'model' => 'Skyline GT-R',
            'year' => 1999,
            'price' => 8500000.00,
            'quantity' => 1,
            'status' => 'active',
            'is_approved' => true,
            'published_at' => now(),
        ]);
    }

    private function makePaidCarOrder(User $seller, Car $car, array $overrides = []): Order
    {
        return Order::create(array_merge([
            'order_number' => 'SO-2026-' . strtoupper(substr(md5(uniqid()), 0, 6)),
            'buyer_name' => 'Buyer One',
            'buyer_email' => 'buyer1@garage.test',
            'shipping_address' => 'Makati',
            'item_type' => 'car',
            'car_id' => $car->id,
            'seller_id' => $seller->id,
            'item_name' => $car->title,
            'quantity' => 1,
            'unit_price' => $car->price,
            'shipping_fee' => 0,
            'total_amount' => $car->price,
            'commission_rate' => 5.00,
            'commission_amount' => round($car->price * 0.05, 2),
            'payment_method' => 'bank_transfer',
            'payment_reference' => 'BANK-1',
            'payment_status' => 'paid',
            'status' => 'delivered',
            'verification_status' => 'accepted',
        ], $overrides));
    }

    public function test_completed_car_order_always_records_seller_payout(): void
    {
        $seller = User::factory()->create(['role' => 'seller']);
        $admin = User::factory()->create(['role' => 'admin']);
        $car = $this->makeCar($seller);
        $order = $this->makePaidCarOrder($seller, $car);

        // Completion via status update (no inspection accept) still pays.
        $this->patchJson("/api/v1/admin/orders/{$order->id}/status", [
            'status' => 'completed',
        ], $this->token($admin))->assertOk();

        $this->assertDatabaseHas('platform_transactions', [
            'stream_type' => 'seller_payout',
            'order_id' => $order->id,
            'status' => 'completed',
        ]);

        // Wallet reflects it.
        $wallet = $this->getJson('/api/v1/wallet', $this->token($seller))->assertOk();
        $this->assertEquals((float) $car->price * 0.95, (float) $wallet->json('data.balance.available'));
    }

    public function test_proof_submit_approve_releases_funds_to_wallet(): void
    {
        $seller = User::factory()->create(['role' => 'seller']);
        $admin = User::factory()->create(['role' => 'admin']);
        $car = $this->makeCar($seller);
        $order = $this->makePaidCarOrder($seller, $car);

        // Seller submits handover proof.
        $this->postJson("/api/v1/seller/orders/{$order->id}/proof", [
            'images' => ['https://example.test/handover-1.jpg'],
            'note' => 'Keys + OR/CR handed over at Makati showroom.',
        ], $this->token($seller))
            ->assertOk()
            ->assertJsonPath('data.proof.status', 'pending');

        // Admin sees it in the car transactions queue.
        $queue = $this->getJson('/api/v1/admin/car-transactions?proof_status=pending', $this->token($admin))
            ->assertOk();
        $this->assertEquals(1, $queue->json('meta.total'));
        $this->assertFalse((bool) $queue->json('data.0.payout_released'));

        // Approval releases funds + completes + notifies seller.
        $this->postJson("/api/v1/admin/car-transactions/{$order->id}/approve-proof", [], $this->token($admin))
            ->assertOk()
            ->assertJsonPath('data.status', 'completed')
            ->assertJsonPath('data.financials.payment_status', 'released')
            ->assertJsonPath('data.proof.status', 'approved');

        $this->assertDatabaseHas('platform_transactions', [
            'stream_type' => 'seller_payout',
            'order_id' => $order->id,
        ]);
        $this->assertTrue(
            Notification::where('user_id', $seller->id)->where('type', 'payment')->exists()
        );

        // Approving twice is refused (no double pay).
        $this->postJson("/api/v1/admin/car-transactions/{$order->id}/approve-proof", [], $this->token($admin))
            ->assertStatus(422);
        $this->assertEquals(1, PlatformTransaction::where('order_id', $order->id)
            ->where('stream_type', 'seller_payout')->count());
    }

    public function test_proof_reject_returns_reason_and_keeps_hold(): void
    {
        $seller = User::factory()->create(['role' => 'seller']);
        $admin = User::factory()->create(['role' => 'admin']);
        $car = $this->makeCar($seller);
        $order = $this->makePaidCarOrder($seller, $car);

        $this->postJson("/api/v1/seller/orders/{$order->id}/proof", [
            'note' => 'Delivered.',
        ], $this->token($seller))->assertOk();

        $this->postJson("/api/v1/admin/car-transactions/{$order->id}/reject-proof", [
            'reason' => 'Odometer photo unreadable.',
        ], $this->token($admin))
            ->assertOk()
            ->assertJsonPath('data.proof.status', 'rejected');

        // Hold untouched, no payout.
        $this->assertEquals('paid', $order->refresh()->payment_status);
        $this->assertEquals(0, PlatformTransaction::where('order_id', $order->id)
            ->where('stream_type', 'seller_payout')->count());
    }

    public function test_proof_guards_reject_non_cars_and_strangers(): void
    {
        $seller = User::factory()->create(['role' => 'seller']);
        $buyer = User::factory()->create(['role' => 'buyer']);
        $car = $this->makeCar($seller);
        $order = $this->makePaidCarOrder($seller, $car);

        // Buyer cannot submit proof for the seller's order.
        $this->postJson("/api/v1/seller/orders/{$order->id}/proof", [
            'note' => 'Fake.',
        ], $this->token($buyer))->assertStatus(403);

        // Approving without submitted proof is refused.
        $admin = User::factory()->create(['role' => 'admin']);
        $this->postJson("/api/v1/admin/car-transactions/{$order->id}/approve-proof", [], $this->token($admin))
            ->assertStatus(422);
    }

    public function test_admin_orders_supports_item_type_filter(): void
    {
        $seller = User::factory()->create(['role' => 'seller']);
        $admin = User::factory()->create(['role' => 'admin']);
        $car = $this->makeCar($seller);
        $this->makePaidCarOrder($seller, $car);

        $all = $this->getJson('/api/v1/admin/orders', $this->token($admin))->assertOk();
        $this->assertEquals(1, $all->json('meta.total'));

        $parts = $this->getJson('/api/v1/admin/orders?item_type=part', $this->token($admin))->assertOk();
        $this->assertEquals(0, $parts->json('meta.total'));

        $cars = $this->getJson('/api/v1/admin/car-transactions', $this->token($admin))->assertOk();
        $this->assertEquals(1, $cars->json('meta.total'));
        $this->assertGreaterThan(0, (float) $cars->json('summary.held_funds'));
    }
}
