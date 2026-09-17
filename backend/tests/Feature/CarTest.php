<?php

namespace Tests\Feature;

use App\Models\Car;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CarTest extends TestCase
{
    use RefreshDatabase;

    private function sellerToken(User $seller): array
    {
        return ['Authorization' => 'Bearer '.$seller->createToken('t')->plainTextToken];
    }

    private function carPayload(): array
    {
        return [
            'title' => '2019 Toyota Vios 1.3 E CVT',
            'brand' => 'Toyota',
            'model' => 'Vios',
            'year' => 2019,
            'price' => 528000,
            'mileage_km' => 42000,
            'body_style' => 'sedan',
            'fuel_type' => 'petrol',
            'transmission' => 'automatic',
            'condition' => 'used',
            'city' => 'Cebu City',
        ];
    }

    public function test_seller_can_create_draft_and_publish_to_marketplace(): void
    {
        $seller = User::factory()->create(['role' => 'seller']);
        $headers = $this->sellerToken($seller);

        $create = $this->postJson('/api/v1/seller/cars', $this->carPayload(), $headers)
            ->assertCreated()
            ->assertJsonPath('data.status', 'draft');

        $carId = $create->json('data.id');

        // Draft is NOT on the public marketplace.
        $this->getJson('/api/v1/marketplace/cars')->assertOk()->assertJsonCount(0, 'data');

        $this->postJson("/api/v1/seller/cars/{$carId}/publish", [], $headers)
            ->assertOk()
            ->assertJsonPath('data.status', 'active');

        // Now publicly listed.
        $this->getJson('/api/v1/marketplace/cars')->assertOk()->assertJsonCount(1, 'data');
        $this->getJson("/api/v1/marketplace/cars/{$carId}")->assertOk();
    }

    public function test_buyer_cannot_create_cars(): void
    {
        $buyer = User::factory()->create(['role' => 'buyer']);

        $this->postJson('/api/v1/seller/cars', $this->carPayload(), $this->sellerToken($buyer))
            ->assertForbidden();
    }

    public function test_guest_cannot_access_seller_inventory(): void
    {
        $this->getJson('/api/v1/seller/cars')->assertUnauthorized();
    }

    public function test_marketplace_filters_and_sort(): void
    {
        $seller = User::factory()->create(['role' => 'seller']);
        Car::factory()->for($seller, 'seller')->active()->create([
            'brand' => 'Honda', 'price' => 700000, 'year' => 2020,
        ]);
        Car::factory()->for($seller, 'seller')->active()->create([
            'brand' => 'Toyota', 'price' => 500000, 'year' => 2018,
        ]);

        $this->getJson('/api/v1/marketplace/cars?brand=Toyota')
            ->assertOk()->assertJsonCount(1, 'data');

        $this->getJson('/api/v1/marketplace/cars?sort=price_asc')
            ->assertOk()
            ->assertJsonPath('data.0.brand', 'Toyota');
    }

    public function test_owner_only_update_and_sold_flow(): void
    {
        $owner = User::factory()->create(['role' => 'seller']);
        $other = User::factory()->create(['role' => 'seller']);
        $car = Car::factory()->for($owner, 'seller')->active()->create();

        // Non-owner cannot update.
        $this->patchJson("/api/v1/seller/cars/{$car->id}", ['price' => 100],
            $this->sellerToken($other))->assertForbidden();

        // Owner updates + marks sold → disappears from marketplace.
        $this->patchJson("/api/v1/seller/cars/{$car->id}", ['price' => 450000],
            $this->sellerToken($owner))->assertOk()->assertJsonPath('data.price', '450000.00');

        $this->postJson("/api/v1/seller/cars/{$car->id}/sold", [], $this->sellerToken($owner))
            ->assertOk()->assertJsonPath('data.status', 'sold');

        $this->getJson("/api/v1/marketplace/cars/{$car->id}")->assertForbidden();
    }

    public function test_car_supports_multiple_images_and_marketplace_serialization(): void
    {
        $seller = User::factory()->create(['role' => 'seller']);
        $headers = $this->sellerToken($seller);

        $payload = array_merge($this->carPayload(), [
            'original_price' => 580000,
            'tag' => 'Restored Classic',
            'location' => 'Makati Showroom Floor',
            'images' => [
                'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7',
                'https://images.unsplash.com/photo-1503376780353-7e6692767b70',
            ],
        ]);

        $create = $this->postJson('/api/v1/seller/cars', $payload, $headers)
            ->assertCreated()
            ->assertJsonPath('data.origPrice', '580000.00')
            ->assertJsonPath('data.tag', 'Restored Classic')
            ->assertJsonCount(2, 'data.images');

        $carId = $create->json('data.id');
        $this->postJson("/api/v1/seller/cars/{$carId}/publish", [], $headers)->assertOk();

        $get = $this->getJson("/api/v1/marketplace/cars/{$carId}")
            ->assertOk()
            ->assertJsonPath('data.title', $payload['title'])
            ->assertJsonPath('data.tag', 'Restored Classic')
            ->assertJsonCount(2, 'data.images')
            ->assertJsonCount(2, 'data.image_urls')
            ->assertJsonPath('data.primary_image_url', 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7');
    }
}
