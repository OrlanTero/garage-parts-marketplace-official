<?php

namespace Tests\Feature;

use App\Models\Offer;
use App\Models\Part;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OfferTest extends TestCase
{
    use RefreshDatabase;

    private function makePart(User $seller, array $overrides = []): Part
    {
        return Part::create(array_merge([
            'seller_id' => $seller->id,
            'title' => 'Brembo GT Big Brake Kit',
            'category' => 'brakes',
            'brand' => 'Brembo',
            'price' => 42500.00,
            'quantity' => 4,
            'status' => 'active',
            'published_at' => now(),
        ], $overrides));
    }

    public function test_buyer_can_make_offer_with_price_and_comment(): void
    {
        $seller = User::factory()->create(['role' => 'seller']);
        $buyer = User::factory()->create(['role' => 'buyer']);
        $part = $this->makePart($seller);

        $this->withToken($buyer->createToken('t')->plainTextToken);

        $response = $this->postJson('/api/v1/offers', [
            'item_type' => 'part',
            'part_id' => $part->id,
            'amount' => 39000,
            'message' => 'Cash buyer from Cebu, can pick up this weekend.',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.amount', 39000)
            ->assertJsonPath('data.status', 'pending')
            ->assertJsonPath('data.message', 'Cash buyer from Cebu, can pick up this weekend.');

        $this->assertDatabaseHas('offers', [
            'buyer_id' => $buyer->id,
            'seller_id' => $seller->id,
            'part_id' => $part->id,
            'status' => 'pending',
        ]);
    }

    public function test_duplicate_pending_offer_is_rejected(): void
    {
        $seller = User::factory()->create(['role' => 'seller']);
        $buyer = User::factory()->create(['role' => 'buyer']);
        $part = $this->makePart($seller);

        $this->withToken($buyer->createToken('t')->plainTextToken);

        $payload = ['item_type' => 'part', 'part_id' => $part->id, 'amount' => 39000];
        $this->postJson('/api/v1/offers', $payload)->assertStatus(201);
        $this->postJson('/api/v1/offers', $payload)->assertStatus(409);
    }

    public function test_buyer_cannot_offer_on_own_listing(): void
    {
        $seller = User::factory()->create(['role' => 'seller']);
        $part = $this->makePart($seller);

        $this->withToken($seller->createToken('t')->plainTextToken);

        $this->postJson('/api/v1/offers', [
            'item_type' => 'part',
            'part_id' => $part->id,
            'amount' => 10000,
        ])->assertStatus(422);
    }

    public function test_offer_requires_live_listing(): void
    {
        $seller = User::factory()->create(['role' => 'seller']);
        $buyer = User::factory()->create(['role' => 'buyer']);
        $part = $this->makePart($seller, ['status' => 'draft', 'published_at' => null]);

        $this->withToken($buyer->createToken('t')->plainTextToken);

        $this->postJson('/api/v1/offers', [
            'item_type' => 'part',
            'part_id' => $part->id,
            'amount' => 10000,
        ])->assertStatus(422);
    }

    public function test_seller_accept_rejects_competing_offers(): void
    {
        $seller = User::factory()->create(['role' => 'seller']);
        $buyerA = User::factory()->create(['role' => 'buyer']);
        $buyerB = User::factory()->create(['role' => 'buyer']);
        $part = $this->makePart($seller);

        $offerA = Offer::create([
            'buyer_id' => $buyerA->id, 'seller_id' => $seller->id,
            'item_type' => 'part', 'part_id' => $part->id,
            'amount' => 39000, 'status' => 'pending',
        ]);
        $offerB = Offer::create([
            'buyer_id' => $buyerB->id, 'seller_id' => $seller->id,
            'item_type' => 'part', 'part_id' => $part->id,
            'amount' => 40000, 'status' => 'pending',
        ]);

        $this->withToken($seller->createToken('t')->plainTextToken);

        $this->postJson("/api/v1/seller/offers/{$offerA->id}/accept", ['seller_note' => 'Deal.'])
            ->assertStatus(200)
            ->assertJsonPath('data.status', 'accepted');

        $this->assertDatabaseHas('offers', ['id' => $offerA->id, 'status' => 'accepted']);
        $this->assertDatabaseHas('offers', ['id' => $offerB->id, 'status' => 'rejected']);
    }

    public function test_buyer_can_withdraw_pending_offer(): void
    {
        $seller = User::factory()->create(['role' => 'seller']);
        $buyer = User::factory()->create(['role' => 'buyer']);
        $part = $this->makePart($seller);

        $offer = Offer::create([
            'buyer_id' => $buyer->id, 'seller_id' => $seller->id,
            'item_type' => 'part', 'part_id' => $part->id,
            'amount' => 39000, 'status' => 'pending',
        ]);

        $this->withToken($buyer->createToken('t')->plainTextToken);

        $this->postJson("/api/v1/offers/{$offer->id}/withdraw")
            ->assertStatus(200)
            ->assertJsonPath('data.status', 'withdrawn');
    }

    public function test_stranger_cannot_accept_others_offer(): void
    {
        $seller = User::factory()->create(['role' => 'seller']);
        $buyer = User::factory()->create(['role' => 'buyer']);
        $stranger = User::factory()->create(['role' => 'seller']);
        $part = $this->makePart($seller);

        $offer = Offer::create([
            'buyer_id' => $buyer->id, 'seller_id' => $seller->id,
            'item_type' => 'part', 'part_id' => $part->id,
            'amount' => 39000, 'status' => 'pending',
        ]);

        $this->withToken($stranger->createToken('t')->plainTextToken);

        $this->postJson("/api/v1/seller/offers/{$offer->id}/accept")->assertStatus(403);
    }
}
