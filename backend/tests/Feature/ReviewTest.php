<?php

namespace Tests\Feature;

use App\Models\Car;
use App\Models\Part;
use App\Models\Review;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReviewTest extends TestCase
{
    use RefreshDatabase;

    private function makePart(User $seller): Part
    {
        return Part::create([
            'seller_id' => $seller->id,
            'title' => 'Brembo GT Big Brake Kit',
            'category' => 'brakes',
            'brand' => 'Brembo',
            'price' => 42500.00,
            'quantity' => 4,
            'status' => 'active',
            'published_at' => now(),
        ]);
    }

    private function as(User $user): void
    {
        $this->withToken($user->createToken('t')->plainTextToken);
    }

    public function test_buyer_can_review_part_with_stars(): void
    {
        $seller = User::factory()->create(['role' => 'seller']);
        $buyer = User::factory()->create(['role' => 'buyer', 'username' => 'buyer_juan']);
        $part = $this->makePart($seller);

        $this->as($buyer);
        $response = $this->postJson('/api/v1/reviews', [
            'item_type' => 'part',
            'part_id' => $part->id,
            'rating' => 5,
            'title' => 'Superb stopping power',
            'body' => 'Genuine kit, bedded in perfectly.',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.rating', 5)
            // Privacy: username + avatar only, never the real name.
            ->assertJsonPath('data.reviewer.username', 'buyer_juan')
            ->assertJsonMissingPath('data.reviewer.name')
            ->assertJsonMissingPath('data.reviewer.email');

        $this->assertDatabaseHas('parts', [
            'id' => $part->id,
            'rating' => 5.00,
            'reviews_count' => 1,
        ]);
    }

    public function test_duplicate_review_is_rejected(): void
    {
        $seller = User::factory()->create(['role' => 'seller']);
        $buyer = User::factory()->create(['role' => 'buyer']);
        $part = $this->makePart($seller);

        $this->as($buyer);
        $payload = ['item_type' => 'part', 'part_id' => $part->id, 'rating' => 4];
        $this->postJson('/api/v1/reviews', $payload)->assertStatus(201);
        $this->postJson('/api/v1/reviews', $payload)->assertStatus(409);
    }

    public function test_buyer_can_update_own_review_and_rating_recomputes(): void
    {
        $seller = User::factory()->create(['role' => 'seller']);
        $buyer = User::factory()->create(['role' => 'buyer']);
        $part = $this->makePart($seller);

        $review = Review::create([
            'buyer_id' => $buyer->id, 'seller_id' => $seller->id,
            'item_type' => 'part', 'part_id' => $part->id,
            'rating' => 5, 'is_visible' => true,
        ]);
        Review::refreshListingRating('part', $part->id, null);

        $this->as($buyer);
        $this->putJson("/api/v1/reviews/{$review->id}", ['rating' => 3, 'body' => 'Downgraded after fade issues.'])
            ->assertStatus(200)
            ->assertJsonPath('data.rating', 3);

        $this->assertDatabaseHas('parts', ['id' => $part->id, 'rating' => 3.00, 'reviews_count' => 1]);
    }

    public function test_public_index_never_leaks_real_names(): void
    {
        $seller = User::factory()->create(['role' => 'seller']);
        $buyer = User::factory()->create(['role' => 'buyer', 'name' => 'Secret Real Name', 'username' => 'anon_rider']);
        $part = $this->makePart($seller);

        Review::create([
            'buyer_id' => $buyer->id, 'seller_id' => $seller->id,
            'item_type' => 'part', 'part_id' => $part->id,
            'rating' => 5, 'title' => 'Great', 'is_visible' => true,
        ]);

        $response = $this->getJson("/api/v1/reviews?item_type=part&part_id={$part->id}");

        $response->assertStatus(200)
            ->assertJsonPath('data.0.reviewer.username', 'anon_rider');
        $this->assertStringNotContainsString('Secret Real Name', $response->getContent());
    }

    public function test_summary_returns_average_and_distribution(): void
    {
        $seller = User::factory()->create(['role' => 'seller']);
        $part = $this->makePart($seller);

        foreach ([5, 5, 4] as $i => $stars) {
            $buyer = User::factory()->create(['role' => 'buyer']);
            Review::create([
                'buyer_id' => $buyer->id, 'seller_id' => $seller->id,
                'item_type' => 'part', 'part_id' => $part->id,
                'rating' => $stars, 'is_visible' => true,
            ]);
        }

        $this->getJson("/api/v1/reviews/summary?item_type=part&part_id={$part->id}")
            ->assertStatus(200)
            ->assertJsonPath('data.average', 4.7)
            ->assertJsonPath('data.count', 3);
    }

    public function test_car_review_updates_car_rating_and_count(): void
    {
        $seller = User::factory()->create(['role' => 'seller']);
        $buyer = User::factory()->create(['role' => 'buyer']);
        $car = Car::create([
            'seller_id' => $seller->id,
            'title' => '1998 Nissan Silvia S15 Spec-R',
            'brand' => 'Nissan',
            'model' => 'Silvia S15',
            'year' => 1998,
            'price' => 1240000.00,
            'status' => 'active',
            'published_at' => now(),
        ]);

        $this->as($buyer);
        $this->postJson('/api/v1/reviews', [
            'item_type' => 'car',
            'car_id' => $car->id,
            'rating' => 5,
            'body' => 'Exactly as inspected.',
        ])->assertStatus(201);

        $this->assertDatabaseHas('cars', ['id' => $car->id, 'rating' => 5.00, 'reviews_count' => 1]);
    }

    public function test_admin_can_hide_review_and_rating_recomputes(): void
    {
        $seller = User::factory()->create(['role' => 'seller']);
        $buyer = User::factory()->create(['role' => 'buyer']);
        $admin = User::factory()->create(['role' => 'admin']);
        $part = $this->makePart($seller);

        $review = Review::create([
            'buyer_id' => $buyer->id, 'seller_id' => $seller->id,
            'item_type' => 'part', 'part_id' => $part->id,
            'rating' => 1, 'body' => 'spam', 'is_visible' => true,
        ]);
        Review::refreshListingRating('part', $part->id, null);

        $this->as($admin);
        $this->postJson("/api/v1/admin/reviews/{$review->id}/visibility", ['is_visible' => false])
            ->assertStatus(200)
            ->assertJsonPath('data.is_visible', false);

        // Hidden review no longer counts: rating resets, count drops.
        $this->assertDatabaseHas('parts', ['id' => $part->id, 'reviews_count' => 0]);
        $this->getJson("/api/v1/reviews?item_type=part&part_id={$part->id}")
            ->assertJsonCount(0, 'data');
    }
}
