<?php

namespace Tests\Feature;

use App\Models\Part;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PartTest extends TestCase
{
    use RefreshDatabase;

    private function sellerToken(User $seller): array
    {
        return ['Authorization' => 'Bearer '.$seller->createToken('t')->plainTextToken];
    }

    private function partPayload(): array
    {
        return [
            'title' => 'Bosch Front Brake Pads Set',
            'category' => 'brakes',
            'brand' => 'Bosch',
            'part_number' => 'BP-0986-AB1',
            'compatibility' => 'Toyota Vios 2019+',
            'condition' => 'new',
            'quantity' => 4,
            'price' => 3850,
            'city' => 'Cebu City',
        ];
    }

    public function test_seller_can_create_draft_and_publish_to_marketplace(): void
    {
        $seller = User::factory()->create(['role' => 'seller']);
        $headers = $this->sellerToken($seller);

        $create = $this->postJson('/api/v1/seller/parts', $this->partPayload(), $headers)
            ->assertCreated()
            ->assertJsonPath('data.status', 'draft');

        $partId = $create->json('data.id');

        // Draft is NOT on the public marketplace.
        $this->getJson('/api/v1/marketplace/parts')->assertOk()->assertJsonCount(0, 'data');

        $this->postJson("/api/v1/seller/parts/{$partId}/publish", [], $headers)
            ->assertOk()
            ->assertJsonPath('data.status', 'active');

        // Now publicly listed.
        $this->getJson('/api/v1/marketplace/parts')->assertOk()->assertJsonCount(1, 'data');
        $this->getJson("/api/v1/marketplace/parts/{$partId}")->assertOk();
    }

    public function test_parts_seller_can_create_and_publish_parts(): void
    {
        $partsSeller = User::factory()->create(['role' => 'parts_seller']);
        $headers = $this->sellerToken($partsSeller);

        $create = $this->postJson('/api/v1/seller/parts', $this->partPayload(), $headers)
            ->assertCreated()
            ->assertJsonPath('data.status', 'draft');

        $partId = $create->json('data.id');
        $this->postJson("/api/v1/seller/parts/{$partId}/publish", [], $headers)
            ->assertOk()
            ->assertJsonPath('data.status', 'active');
    }

    public function test_buyer_cannot_create_parts(): void
    {
        $buyer = User::factory()->create(['role' => 'buyer']);

        $this->postJson('/api/v1/seller/parts', $this->partPayload(), $this->sellerToken($buyer))
            ->assertForbidden();
    }

    public function test_guest_cannot_access_seller_inventory(): void
    {
        $this->getJson('/api/v1/seller/parts')->assertUnauthorized();
    }

    public function test_marketplace_filters_and_sort(): void
    {
        $seller = User::factory()->create(['role' => 'seller']);
        Part::factory()->for($seller, 'seller')->active()->create([
            'category' => 'brakes', 'price' => 5000, 'condition' => 'new',
        ]);
        Part::factory()->for($seller, 'seller')->active()->create([
            'category' => 'engine', 'price' => 1200, 'condition' => 'used',
        ]);

        $this->getJson('/api/v1/marketplace/parts?category=engine')
            ->assertOk()->assertJsonCount(1, 'data');

        $this->getJson('/api/v1/marketplace/parts?sort=price_asc')
            ->assertOk()
            ->assertJsonPath('data.0.category', 'engine');

        $this->getJson('/api/v1/marketplace/parts?condition=new')
            ->assertOk()->assertJsonCount(1, 'data');
    }

    public function test_owner_only_update_and_sold_flow(): void
    {
        $owner = User::factory()->create(['role' => 'seller']);
        $other = User::factory()->create(['role' => 'seller']);
        $part = Part::factory()->for($owner, 'seller')->active()->create();

        // Non-owner cannot update.
        $this->patchJson("/api/v1/seller/parts/{$part->id}", ['price' => 100],
            $this->sellerToken($other))->assertForbidden();

        // Owner updates + marks sold → disappears from marketplace.
        $this->patchJson("/api/v1/seller/parts/{$part->id}", ['price' => 2999],
            $this->sellerToken($owner))->assertOk()->assertJsonPath('data.price', '2999.00');

        $this->postJson("/api/v1/seller/parts/{$part->id}/sold", [], $this->sellerToken($owner))
            ->assertOk()->assertJsonPath('data.status', 'sold');

        $this->getJson("/api/v1/marketplace/parts/{$part->id}")->assertForbidden();
    }

    public function test_part_supports_multiple_images_and_marketplace_serialization(): void
    {
        $seller = User::factory()->create(['role' => 'seller']);
        $headers = $this->sellerToken($seller);

        $payload = array_merge($this->partPayload(), [
            'original_price' => 4500,
            'tag' => 'Brand New OEM',
            'free_shipping' => true,
            'location' => 'Makati Showroom Hub',
            'images' => [
                'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3',
                'https://images.unsplash.com/photo-1613214149922-f1809c99b414',
            ],
        ]);

        $create = $this->postJson('/api/v1/seller/parts', $payload, $headers)
            ->assertCreated()
            ->assertJsonPath('data.origPrice', '4500.00')
            ->assertJsonPath('data.freeShip', true)
            ->assertJsonPath('data.tag', 'Brand New OEM')
            ->assertJsonCount(2, 'data.images');

        $partId = $create->json('data.id');
        $this->postJson("/api/v1/seller/parts/{$partId}/publish", [], $headers)->assertOk();

        $get = $this->getJson("/api/v1/marketplace/parts/{$partId}")
            ->assertOk()
            ->assertJsonPath('data.title', $payload['title'])
            ->assertJsonPath('data.freeShip', true)
            ->assertJsonCount(2, 'data.images')
            ->assertJsonCount(2, 'data.image_urls')
            ->assertJsonPath('data.primary_image_url', 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3');
    }
}
