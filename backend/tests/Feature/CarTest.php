<?php

namespace Tests\Feature;

use App\Models\Car;
use App\Models\Conversation;
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

    public function test_seller_can_create_draft_but_cannot_self_publish(): void
    {
        $seller = User::factory()->kycVerified()->create(['role' => 'seller']);
        $headers = $this->sellerToken($seller);

        $create = $this->postJson('/api/v1/seller/cars', $this->carPayload(), $headers)
            ->assertCreated()
            ->assertJsonPath('data.status', 'draft');

        $carId = $create->json('data.id');

        // Draft is NOT on the public marketplace.
        $this->getJson('/api/v1/marketplace/cars')->assertOk()->assertJsonCount(0, 'data');

        // Self-publish is closed — inspection first.
        $this->postJson("/api/v1/seller/cars/{$carId}/publish", [], $headers)
            ->assertStatus(422);

        // …but an inspected build may go live by the seller's own hand.
        Car::findOrFail($carId)->forceFill([
            'status' => 'inspected',
            'inspection_status' => 'passed',
            'inspection_score' => '96/100',
        ])->save();
        $this->postJson("/api/v1/seller/cars/{$carId}/publish", [], $headers)
            ->assertOk()
            ->assertJsonPath('data.status', 'active');

        // Now publicly listed.
        $this->getJson('/api/v1/marketplace/cars')->assertOk()->assertJsonCount(1, 'data');
        $this->getJson("/api/v1/marketplace/cars/{$carId}")->assertOk();
    }

    public function test_dealer_can_create_but_cannot_skip_inspection(): void
    {
        $dealer = User::factory()->kycVerified()->create(['role' => 'dealer']);
        $headers = $this->sellerToken($dealer);

        $create = $this->postJson('/api/v1/seller/cars', $this->carPayload(), $headers)
            ->assertCreated()
            ->assertJsonPath('data.status', 'draft');

        $carId = $create->json('data.id');
        $this->postJson("/api/v1/seller/cars/{$carId}/publish", [], $headers)
            ->assertStatus(422);
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

    public function test_seller_set_status_covers_full_manageable_list(): void
    {
        $seller = User::factory()->kycVerified()->create(['role' => 'seller']);
        $headers = $this->sellerToken($seller);
        $car = Car::factory()->for($seller, 'seller')->create(['status' => 'draft']);

        // draft → active is closed: listings go live only via inspection.
        $this->postJson("/api/v1/seller/cars/{$car->id}/status", ['status' => 'active'], $headers)
            ->assertStatus(422);

        // active → archived is a direct set.
        $this->postJson("/api/v1/seller/cars/{$car->id}/status", ['status' => 'archived'], $headers)
            ->assertOk()->assertJsonPath('data.status', 'archived');

        // archived → draft is a direct set.
        $this->postJson("/api/v1/seller/cars/{$car->id}/status", ['status' => 'draft'], $headers)
            ->assertOk()->assertJsonPath('data.status', 'draft');

        // System/moderation states are not seller-settable.
        $this->postJson("/api/v1/seller/cars/{$car->id}/status", ['status' => 'rejected'], $headers)
            ->assertStatus(422);

        // House-managed inspection states cannot be escaped by the seller.
        $car->forceFill(['status' => 'pending_inspection'])->save();
        $this->postJson("/api/v1/seller/cars/{$car->id}/status", ['status' => 'draft'], $headers)
            ->assertStatus(422);

        // Strangers cannot change another seller's listing (ownership enforced).
        $other = User::factory()->create(['role' => 'seller']);
        $this->postJson("/api/v1/seller/cars/{$car->id}/status", ['status' => 'draft'], $this->sellerToken($other))
            ->assertForbidden();
    }

    public function test_buyer_with_listing_thread_keeps_access_to_sold_car(): void
    {
        $owner = User::factory()->create(['role' => 'seller']);
        $buyer = User::factory()->create(['role' => 'buyer']);
        $stranger = User::factory()->create(['role' => 'buyer']);
        $car = Car::factory()->for($owner, 'seller')->active()->create();

        Conversation::findOrCreateBetween($buyer->id, $owner->id, 'car', $car->id);

        $this->postJson("/api/v1/seller/cars/{$car->id}/sold", [], $this->sellerToken($owner))->assertOk();

        // Buyer negotiating this listing can still open it.
        $this->getJson("/api/v1/marketplace/cars/{$car->id}", $this->sellerToken($buyer))->assertOk();

        // Unrelated users and guests stay locked out.
        $this->getJson("/api/v1/marketplace/cars/{$car->id}", $this->sellerToken($stranger))->assertForbidden();
        $this->getJson("/api/v1/marketplace/cars/{$car->id}")->assertForbidden();
    }

    public function test_buyer_with_order_but_no_thread_keeps_access_to_sold_car(): void
    {
        $owner = User::factory()->create(['role' => 'seller']);
        $buyer = User::factory()->create(['role' => 'buyer']);
        $car = Car::factory()->for($owner, 'seller')->active()->create();

        \App\Models\Order::create([
            'user_id' => $buyer->id,
            'buyer_name' => 'Direct Buyer',
            'buyer_email' => $buyer->email,
            'shipping_address' => 'Makati',
            'item_type' => 'car',
            'car_id' => $car->id,
            'seller_id' => $owner->id,
            'item_name' => $car->title,
            'quantity' => 1,
            'unit_price' => $car->price,
            'total_amount' => $car->price,
            'payment_status' => 'paid',
            'status' => 'processing',
            'verification_status' => 'accepted',
        ]);

        $this->postJson("/api/v1/seller/cars/{$car->id}/sold", [], $this->sellerToken($owner))->assertOk();

        $this->getJson("/api/v1/marketplace/cars/{$car->id}", $this->sellerToken($buyer))->assertOk();
    }

    public function test_car_supports_multiple_images_and_marketplace_serialization(): void
    {
        $seller = User::factory()->kycVerified()->create(['role' => 'seller']);
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
        // Media test needs a live car: simulate a passed inspection, then publish.
        Car::findOrFail($carId)->forceFill([
            'status' => 'inspected',
            'inspection_status' => 'passed',
            'inspection_score' => '96/100',
        ])->save();
        $this->postJson("/api/v1/seller/cars/{$carId}/publish", [], $headers)->assertOk();

        $get = $this->getJson("/api/v1/marketplace/cars/{$carId}")
            ->assertOk()
            ->assertJsonPath('data.title', $payload['title'])
            ->assertJsonPath('data.tag', 'Restored Classic')
            ->assertJsonCount(2, 'data.images')
            ->assertJsonCount(2, 'data.image_urls')
            ->assertJsonPath('data.primary_image_url', 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7');
    }

    public function test_car_is_accessible_via_uuid_in_marketplace_and_seller_routes(): void
    {
        $seller = User::factory()->kycVerified()->create(['role' => 'seller']);
        $headers = $this->sellerToken($seller);

        $create = $this->postJson('/api/v1/seller/cars', $this->carPayload(), $headers)
            ->assertCreated();

        $uuid = $create->json('data.uuid');
        $this->assertNotEmpty($uuid);
        $this->assertMatchesRegularExpression('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $uuid);

        // Publish using UUID (inspected builds only)
        Car::where('uuid', $uuid)->firstOrFail()->forceFill([
            'status' => 'inspected',
            'inspection_status' => 'passed',
            'inspection_score' => '96/100',
        ])->save();
        $this->postJson("/api/v1/seller/cars/{$uuid}/publish", [], $headers)
            ->assertOk()
            ->assertJsonPath('data.status', 'active');

        // Fetch via UUID on public marketplace
        $this->getJson("/api/v1/marketplace/cars/{$uuid}")
            ->assertOk()
            ->assertJsonPath('data.uuid', $uuid)
            ->assertJsonPath('data.title', '2019 Toyota Vios 1.3 E CVT');
    }
}
