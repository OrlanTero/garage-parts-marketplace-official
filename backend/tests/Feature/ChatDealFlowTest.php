<?php

namespace Tests\Feature;

use App\Models\Car;
use App\Models\Conversation;
use App\Models\Order;
use App\Models\PlatformSetting;
use App\Models\PlatformTransaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ChatDealFlowTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        \Illuminate\Support\Facades\Cache::flush();
        $this->seed(\Database\Seeders\PlatformSettingSeeder::class);
    }

    private function token(User $user): array
    {
        return ['Authorization' => 'Bearer ' . $user->createToken('t')->plainTextToken];
    }

    private function makeCar(User $seller, float $price = 1240000.00): Car
    {
        return Car::create([
            'seller_id' => $seller->id,
            'title' => '1998 Nissan Silvia S15 Spec-R Aero',
            'brand' => 'Nissan',
            'model' => 'Silvia S15 Spec-R',
            'year' => 1998,
            'price' => $price,
            'vin' => 'JN100S15A01239845',
            'status' => 'active',
            'published_at' => now(),
        ]);
    }

    private function thread(User $buyer, User $seller): Conversation
    {
        return Conversation::findOrCreateBetween($buyer->id, $seller->id);
    }

    public function test_full_deal_negotiation_to_checkout_link_and_order(): void
    {
        $seller = User::factory()->create(['role' => 'seller']);
        $buyer = User::factory()->create(['role' => 'buyer']);
        $car = $this->makeCar($seller);
        $conv = $this->thread($buyer, $seller);

        // Buyer opens at ₱1.15M.
        $offerId = $this->postJson("/api/v1/chat/conversations/{$conv->id}/offers", [
            'amount' => 1150000,
            'item_type' => 'car',
            'car_id' => $car->id,
            'message' => 'Cash ready this weekend.',
        ], $this->token($buyer))
            ->assertCreated()
            ->assertJsonPath('data.status', 'pending')
            ->json('data.id');

        // Seller counters at ₱1.19M (parent superseded).
        $counterId = $this->postJson("/api/v1/chat/conversations/{$conv->id}/offers", [
            'amount' => 1190000,
            'item_type' => 'car',
            'car_id' => $car->id,
            'parent_id' => $offerId,
        ], $this->token($seller))
            ->assertCreated()
            ->assertJsonPath('data.status', 'pending')
            ->json('data.id');

        $this->assertDatabaseHas('offers', ['id' => $offerId, 'status' => 'superseded']);

        // Buyer accepts the counter; seller (originator) confirms → token minted.
        $this->postJson("/api/v1/chat/offers/{$counterId}/accept", [], $this->token($buyer))->assertOk();

        $token = $this->postJson("/api/v1/chat/offers/{$counterId}/confirm", [], $this->token($seller))
            ->assertOk()
            ->json('data.checkout_token');
        $this->assertNotEmpty($token);

        // Seller issues the checkout link.
        $link = $this->postJson("/api/v1/chat/offers/{$counterId}/checkout-link", [], $this->token($seller))
            ->assertOk()
            ->json('data.checkout_url');
        $this->assertStringContainsString('offer_token=', $link);

        // Buyer checks out at the AGREED price (not the ₱1.24M list price).
        $orderNumber = $this->postJson('/api/v1/orders', [
            'buyer_name' => 'Deal Buyer',
            'buyer_email' => 'deal@buyer.test',
            'shipping_address' => '124 Chino Roces Ave, Makati',
            'car_id' => $car->id,
            'item_type' => 'car',
            'quantity' => 1,
            'payment_method' => 'bank_transfer',
            'payment_reference' => 'MOCK-DEAL-1',
            'mock_paid' => true,
            'offer_token' => $token,
        ])->assertCreated()->json('data.order_number');

        $order = Order::where('order_number', $orderNumber)->firstOrFail();
        $this->assertEquals(1190000.00, (float) $order->unit_price);
        $this->assertEquals('accepted', $order->verification_status);

        // Token is single-use; the offer is marked ordered.
        $this->assertDatabaseHas('offers', ['id' => $counterId, 'status' => 'ordered']);
        $this->postJson('/api/v1/orders', [
            'buyer_name' => 'Second Buyer',
            'buyer_email' => 'second@buyer.test',
            'shipping_address' => 'Makati',
            'car_id' => $car->id,
            'item_type' => 'car',
            'quantity' => 1,
            'payment_method' => 'bank_transfer',
            'payment_reference' => 'MOCK-DEAL-2',
            'mock_paid' => true,
            'offer_token' => $token,
        ])->assertStatus(410);

        // Platform commission recorded on the deal price.
        $this->assertDatabaseHas('platform_transactions', [
            'stream_type' => 'car_sale_commission',
            'order_id' => $order->id,
            'gross_amount' => 1190000.00,
            'net_amount' => 59500.00,
        ]);
    }

    public function test_cannot_counter_own_offer_or_confirm_unaccepted(): void
    {
        $seller = User::factory()->create(['role' => 'seller']);
        $buyer = User::factory()->create(['role' => 'buyer']);
        $car = $this->makeCar($seller);
        $conv = $this->thread($buyer, $seller);

        $offerId = $this->postJson("/api/v1/chat/conversations/{$conv->id}/offers", [
            'amount' => 1100000,
            'item_type' => 'car',
            'car_id' => $car->id,
        ], $this->token($buyer))->assertCreated()->json('data.id');

        // Buyer cannot counter their own offer…
        $this->postJson("/api/v1/chat/conversations/{$conv->id}/offers", [
            'amount' => 1110000,
            'item_type' => 'car',
            'car_id' => $car->id,
            'parent_id' => $offerId,
        ], $this->token($buyer))->assertStatus(422);

        // …cannot accept their own offer…
        $this->postJson("/api/v1/chat/offers/{$offerId}/accept", [], $this->token($buyer))->assertStatus(422);

        // …and the seller cannot confirm before accepting.
        $this->postJson("/api/v1/chat/offers/{$offerId}/confirm", [], $this->token($seller))->assertStatus(403);
    }

    public function test_reservation_flow_with_scheduled_seller_acceptance(): void
    {
        $seller = User::factory()->create(['role' => 'seller']);
        $buyer = User::factory()->create(['role' => 'buyer']);
        $car = $this->makeCar($seller, 2000000.00);
        $conv = $this->thread($buyer, $seller);

        // Seller issues a reservation (default 5% of ₱2M = ₱100k), scheduled.
        $resId = $this->postJson("/api/v1/chat/conversations/{$conv->id}/reservations", [
            'item_type' => 'car',
            'car_id' => $car->id,
            'scheduled_for' => now()->addDays(3)->toIso8601String(),
        ], $this->token($seller))
            ->assertCreated()
            ->assertJsonPath('data.status', 'pending')
            ->assertJsonPath('data.amount', 100000)
            ->assertJsonPath('data.is_scheduled', true)
            ->json('data.id');

        // Buyer pays → stays paid (not confirmed) because it is scheduled.
        $this->postJson("/api/v1/chat/reservations/{$resId}/pay", [
            'payment_reference' => 'MOCK-RSV-1',
        ], $this->token($buyer))
            ->assertOk()
            ->assertJsonPath('data.status', 'paid');

        // Seller accepts the scheduled payment → confirmed.
        $this->postJson("/api/v1/chat/reservations/{$resId}/accept", [], $this->token($seller))
            ->assertOk()
            ->assertJsonPath('data.status', 'confirmed');

        $this->assertDatabaseHas('platform_transactions', [
            'stream_type' => 'reservation_fee',
            'reference_number' => 'RSV-' . $resId,
            'status' => 'completed',
            'net_amount' => 100000,
        ]);
    }

    public function test_immediate_reservation_confirms_at_once(): void
    {
        $seller = User::factory()->create(['role' => 'seller']);
        $buyer = User::factory()->create(['role' => 'buyer']);
        $car = $this->makeCar($seller, 1000000.00);
        $conv = $this->thread($buyer, $seller);

        $resId = $this->postJson("/api/v1/chat/conversations/{$conv->id}/reservations", [
            'item_type' => 'car',
            'car_id' => $car->id,
        ], $this->token($seller))->assertCreated()->json('data.id');

        $this->postJson("/api/v1/chat/reservations/{$resId}/pay", [
            'payment_reference' => 'MOCK-RSV-2',
        ], $this->token($buyer))
            ->assertOk()
            ->assertJsonPath('data.status', 'confirmed');
    }

    public function test_seller_can_advance_car_build_status_to_completed(): void
    {
        $seller = User::factory()->create(['role' => 'seller']);
        $buyer = User::factory()->create(['role' => 'buyer', 'email' => 'status@buyer.test']);
        $car = $this->makeCar($seller);

        $orderNumber = $this->postJson('/api/v1/orders', [
            'buyer_name' => 'Status Buyer',
            'buyer_email' => 'status@buyer.test',
            'shipping_address' => 'Makati',
            'car_id' => $car->id,
            'item_type' => 'car',
            'quantity' => 1,
            'payment_method' => 'bank_transfer',
            'payment_reference' => 'MOCK-ST-1',
            'mock_paid' => true,
        ])->assertCreated()->json('data.order_number');
        $order = Order::where('order_number', $orderNumber)->firstOrFail();

        // Prepaid car checkout auto-accepts; seller walks it to completion.
        foreach (['reserved', 'preparing', 'shipped', 'delivered', 'completed'] as $status) {
            $this->patchJson("/api/v1/seller/orders/{$order->id}/status", [
                'status' => $status,
            ], $this->token($seller))->assertOk()->assertJsonPath('data.status', $status);
        }

        // A stranger cannot move someone else's build.
        $stranger = User::factory()->create(['role' => 'seller']);
        $this->patchJson("/api/v1/seller/orders/{$order->id}/status", [
            'status' => 'processing',
        ], $this->token($stranger))->assertForbidden();
    }
}
