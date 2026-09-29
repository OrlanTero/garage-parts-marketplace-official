<?php

namespace Tests\Feature;

use App\Models\Car;
use App\Models\Conversation;
use App\Models\Notification;
use App\Models\Order;
use App\Models\RestockSubscription;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SelloutFlowTest extends TestCase
{
    use RefreshDatabase;

    private function token(User $user): array
    {
        return ['Authorization' => 'Bearer ' . $user->createToken('t')->plainTextToken];
    }

    private function makeCar(User $seller, array $overrides = []): Car
    {
        return Car::create(array_merge([
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
        ], $overrides));
    }

    private function makeThread(User $buyer, User $seller, Car $car): int
    {
        return $this->postJson('/api/v1/chat/conversations', [
            'recipient_id' => $seller->id,
            'listing_type' => 'car',
            'listing_id' => $car->id,
        ], $this->token($buyer))->assertCreated()->json('data.id');
    }

    private function winnerCheckout(User $winner, Car $car): string
    {
        return $this->postJson('/api/v1/orders', [
            'buyer_name' => $winner->name,
            'buyer_email' => $winner->email,
            'shipping_address' => 'Makati',
            'car_id' => $car->id,
            'item_type' => 'car',
            'quantity' => 1,
            'payment_method' => 'bank_transfer',
            'payment_reference' => 'WIN-REF-1',
            'mock_paid' => true,
        ], $this->token($winner))->assertCreated()->json('data.order_number');
    }

    public function test_last_unit_payment_auto_sells_and_gates_loser_threads(): void
    {
        $seller = User::factory()->create(['role' => 'seller']);
        $winner = User::factory()->create(['role' => 'buyer']);
        $loser = User::factory()->create(['role' => 'buyer']);
        $car = $this->makeCar($seller);

        $winnerConv = $this->makeThread($winner, $seller, $car);
        $loserConv = $this->makeThread($loser, $seller, $car);

        $orderNumber = $this->winnerCheckout($winner, $car);
        $order = Order::where('order_number', $orderNumber)->firstOrFail();

        // Order + listing flipped to sold.
        $this->assertEquals('sold', $order->refresh()->status);
        $this->assertDatabaseHas('cars', ['id' => $car->id, 'quantity' => 0, 'status' => 'sold']);

        // No thread rows are locked — access is judged live instead, so
        // the winner can never be misidentified and silenced.
        $this->assertFalse((bool) Conversation::findOrFail($loserConv)->is_locked);
        $this->assertFalse((bool) Conversation::findOrFail($winnerConv)->is_locked);

        // Loser is notified about the sellout.
        $this->assertTrue(
            Notification::where('user_id', $loser->id)->where('type', 'listing')->exists()
        );

        // Loser side blocked (listing-level gate), seller side still works.
        $this->postJson("/api/v1/chat/conversations/{$loserConv}/messages", [
            'body' => 'Still available?',
        ], $this->token($loser))->assertStatus(422);
        $this->postJson("/api/v1/chat/conversations/{$loserConv}/messages", [
            'body' => 'Sorry, just sold — I can source another unit.',
        ], $this->token($seller))->assertCreated();
        $this->postJson("/api/v1/chat/conversations/{$loserConv}/offers", [
            'amount' => 8000000,
            'item_type' => 'car',
            'car_id' => $car->id,
        ], $this->token($loser))->assertStatus(422);

        // Winner thread reports open for the winner…
        $winnerThread = $this->getJson(
            "/api/v1/chat/conversations/{$winnerConv}",
            $this->token($winner)
        )->assertOk()->json('data');
        $this->assertFalse((bool) $winnerThread['locked_for_viewer']);

        // …and locked for the loser.
        $loserThread = $this->getJson(
            "/api/v1/chat/conversations/{$loserConv}",
            $this->token($loser)
        )->assertOk()->json('data');
        $this->assertTrue((bool) $loserThread['locked_for_viewer']);

        // Sold car leaves the public marketplace.
        $grid = $this->getJson('/api/v1/marketplace/cars')->assertOk()->json('data');
        $this->assertNotContains($car->id, collect($grid)->pluck('id')->all());
    }

    public function test_stale_winner_lock_self_heals_on_send(): void
    {
        $seller = User::factory()->create(['role' => 'seller']);
        $winner = User::factory()->create(['role' => 'buyer']);
        $car = $this->makeCar($seller);

        $winnerConv = $this->makeThread($winner, $seller, $car);
        $orderNumber = $this->winnerCheckout($winner, $car);
        $order = Order::where('order_number', $orderNumber)->firstOrFail();
        $this->assertEquals('sold', $order->refresh()->status);

        // Simulate a stale/bad lock from the old design.
        Conversation::findOrFail($winnerConv)->forceFill([
            'is_locked' => true,
            'locked_exempt_user_id' => $seller->id,
        ])->save();

        // Winner sending lifts the stale lock and goes through.
        $this->postJson("/api/v1/chat/conversations/{$winnerConv}/messages", [
            'body' => 'Confirming pickup Saturday.',
        ], $this->token($winner))->assertCreated();
        $this->assertFalse((bool) Conversation::findOrFail($winnerConv)->refresh()->is_locked);
    }

    public function test_multi_unit_payment_does_not_sell_or_lock(): void
    {
        $seller = User::factory()->create(['role' => 'seller']);
        $winner = User::factory()->create(['role' => 'buyer']);
        $loser = User::factory()->create(['role' => 'buyer']);
        $car = $this->makeCar($seller, ['quantity' => 2]);

        $this->makeThread($loser, $seller, $car);
        $orderNumber = $this->winnerCheckout($winner, $car);
        $order = Order::where('order_number', $orderNumber)->firstOrFail();

        $this->assertEquals('processing', $order->refresh()->status);
        $this->assertDatabaseHas('cars', ['id' => $car->id, 'quantity' => 1, 'status' => 'active']);
        $this->assertFalse(
            Conversation::where('listing_key', "car:{$car->id}")->where('is_locked', true)->exists()
        );
    }

    public function test_restock_subscription_fires_once_on_restock(): void
    {
        $seller = User::factory()->create(['role' => 'seller']);
        $loser = User::factory()->create(['role' => 'buyer']);
        $car = $this->makeCar($seller, ['quantity' => 0, 'status' => 'sold']);

        // Subscribe + unsubscribe round-trip.
        $subId = $this->postJson('/api/v1/restocks', [
            'listing_type' => 'car',
            'listing_id' => $car->id,
        ], $this->token($loser))->assertCreated()->json('data.id');
        $this->postJson('/api/v1/restocks', [
            'listing_type' => 'car',
            'listing_id' => $car->id,
        ], $this->token($loser))->assertCreated(); // idempotent
        $this->assertEquals(1, RestockSubscription::where('user_id', $loser->id)->count());

        // Quantity-only bump while still sold → no alert.
        $car->forceFill(['quantity' => 3])->save();
        $this->assertFalse(
            Notification::where('user_id', $loser->id)->where('type', 'listing')->exists()
        );

        // Back to active with stock → alert fires, subscription consumed.
        $car->forceFill(['status' => 'active'])->save();
        $row = Notification::where('user_id', $loser->id)->where('type', 'listing')->firstOrFail();
        $this->assertStringContainsString('/marketplace/', $row->link);
        $this->assertEquals(0, RestockSubscription::where('user_id', $loser->id)->count());

        // Owner can delete; strangers cannot touch it.
        $other = User::factory()->create(['role' => 'buyer']);
        $sub2 = $this->postJson('/api/v1/restocks', [
            'listing_type' => 'car',
            'listing_id' => $car->id,
        ], $this->token($loser))->assertCreated()->json('data.id');
        $this->deleteJson("/api/v1/restocks/{$sub2}", [], $this->token($other))->assertStatus(403);
        $this->deleteJson("/api/v1/restocks/{$sub2}", [], $this->token($loser))->assertOk();
    }

    public function test_admin_cannot_rewind_sold_order_to_negotiating(): void
    {
        $seller = User::factory()->create(['role' => 'seller']);
        $winner = User::factory()->create(['role' => 'buyer']);
        $admin = User::factory()->create(['role' => 'admin']);
        $car = $this->makeCar($seller);

        $orderNumber = $this->winnerCheckout($winner, $car);
        $order = Order::where('order_number', $orderNumber)->firstOrFail();
        $this->assertEquals('sold', $order->refresh()->status);

        $this->patchJson("/api/v1/admin/orders/{$order->id}/status", [
            'status' => 'negotiating',
        ], $this->token($admin))->assertStatus(422);

        // Forward motion still works.
        $this->patchJson("/api/v1/admin/orders/{$order->id}/status", [
            'status' => 'delivered',
        ], $this->token($admin))->assertOk();
    }
}
