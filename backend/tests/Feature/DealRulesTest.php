<?php

namespace Tests\Feature;

use App\Models\Car;
use App\Models\Conversation;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DealRulesTest extends TestCase
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
            'title' => '1998 Nissan Silvia S15 Spec-R Aero',
            'brand' => 'Nissan',
            'model' => 'Silvia S15 Spec-R',
            'year' => 1998,
            'price' => 1240000.00,
            'quantity' => 1,
            'status' => 'active',
            'is_approved' => true,
            'published_at' => now(),
        ], $overrides));
    }

    private function buyerOffer(int $convId, int $carId, User $buyer, int $amount = 1150000): int
    {
        return $this->postJson("/api/v1/chat/conversations/{$convId}/offers", [
            'amount' => $amount,
            'item_type' => 'car',
            'car_id' => $carId,
        ], $this->token($buyer))->assertCreated()->json('data.id');
    }

    public function test_originator_can_only_withdraw_own_offer(): void
    {
        $seller = User::factory()->create(['role' => 'seller']);
        $buyer = User::factory()->create(['role' => 'buyer']);
        $car = $this->makeCar($seller);
        $conv = Conversation::findOrCreateBetween($buyer->id, $seller->id, 'car', $car->id);

        $offerId = $this->buyerOffer($conv->id, $car->id, $buyer);

        // Sender cannot accept, reject, or counter their own offer.
        $this->postJson("/api/v1/chat/offers/{$offerId}/accept", [], $this->token($buyer))->assertStatus(422);
        $this->postJson("/api/v1/chat/offers/{$offerId}/reject", [], $this->token($buyer))->assertStatus(422);
        $this->postJson("/api/v1/chat/conversations/{$conv->id}/offers", [
            'amount' => 1100000,
            'item_type' => 'car',
            'car_id' => $car->id,
            'parent_id' => $offerId,
        ], $this->token($buyer))->assertStatus(422);

        // …but can withdraw it.
        $this->postJson("/api/v1/chat/offers/{$offerId}/withdraw", [], $this->token($buyer))
            ->assertOk()->assertJsonPath('data.status', 'withdrawn');

        // Counterparty cannot withdraw it.
        $offerId2 = $this->buyerOffer($conv->id, $car->id, $buyer);
        $this->postJson("/api/v1/chat/offers/{$offerId2}/withdraw", [], $this->token($seller))
            ->assertStatus(403);
    }

    public function test_seller_cannot_purchase_own_listing(): void
    {
        $seller = User::factory()->create(['role' => 'seller']);
        $car = $this->makeCar($seller);

        $this->postJson('/api/v1/orders', [
            'buyer_name' => $seller->name,
            'buyer_email' => $seller->email,
            'shipping_address' => 'Makati',
            'car_id' => $car->id,
            'item_type' => 'car',
            'quantity' => 1,
        ], $this->token($seller))->assertStatus(422);
    }

    public function test_email_matched_buyer_thread_survives_sellout(): void
    {
        $seller = User::factory()->create(['role' => 'seller']);
        $buyer = User::factory()->create(['role' => 'buyer']);
        $loser = User::factory()->create(['role' => 'buyer']);
        $car = $this->makeCar($seller);

        // Both buyers chatted first; winner then checks out as GUEST with
        // the email of their existing account (no user_id on the order).
        $winnerConv = Conversation::findOrCreateBetween($buyer->id, $seller->id, 'car', $car->id);
        $loserConv = Conversation::findOrCreateBetween($loser->id, $seller->id, 'car', $car->id);

        $this->postJson('/api/v1/orders', [
            'buyer_name' => $buyer->name,
            'buyer_email' => $buyer->email,
            'shipping_address' => 'Makati',
            'car_id' => $car->id,
            'item_type' => 'car',
            'quantity' => 1,
            'payment_method' => 'bank_transfer',
            'payment_reference' => 'GUEST-WIN-1',
            'mock_paid' => true,
        ])->assertCreated();

        // No thread rows are locked — access is judged live instead.
        $this->assertFalse((bool) Conversation::findOrFail($winnerConv->id)->is_locked);
        $this->assertFalse((bool) Conversation::findOrFail($loserConv->id)->is_locked);

        // …but the viewer flags differ: open for the winner, locked for the loser.
        $winnerView = $this->getJson(
            "/api/v1/chat/conversations/{$winnerConv->id}",
            $this->token($buyer)
        )->assertOk()->json('data');
        $this->assertFalse((bool) $winnerView['locked_for_viewer']);
        $loserView = $this->getJson(
            "/api/v1/chat/conversations/{$loserConv->id}",
            $this->token($loser)
        )->assertOk()->json('data');
        $this->assertTrue((bool) $loserView['locked_for_viewer']);

        // Winner can still talk to the seller.
        $this->postJson("/api/v1/chat/conversations/{$winnerConv->id}/messages", [
            'body' => 'When can I pick up the car?',
        ], $this->token($buyer))->assertCreated();
        $this->postJson("/api/v1/chat/conversations/{$winnerConv->id}/messages", [
            'body' => 'Anytime this weekend.',
        ], $this->token($seller))->assertCreated();

        // Loser cannot; seller still can.
        $this->postJson("/api/v1/chat/conversations/{$loserConv->id}/messages", [
            'body' => 'Still available?',
        ], $this->token($loser))->assertStatus(422);
        $this->assertTrue(
            Notification::where('user_id', $loser->id)->where('type', 'listing')->exists()
        );
    }

    public function test_reviews_mine_returns_null_without_404(): void
    {
        $buyer = User::factory()->create(['role' => 'buyer']);
        $seller = User::factory()->create(['role' => 'seller']);
        $car = $this->makeCar($seller);

        $this->getJson("/api/v1/reviews/mine?item_type=car&car_id={$car->id}", $this->token($buyer))
            ->assertOk()
            ->assertJsonPath('data', null);
    }
}
