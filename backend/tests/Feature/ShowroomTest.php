<?php

namespace Tests\Feature;

use App\Enums\CarStatus;
use App\Enums\UserRole;
use App\Models\Car;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ShowroomTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_list_showroom_sellers_and_garage_highlights(): void
    {
        $seller = User::factory()->create([
            'role' => UserRole::Seller->value,
            'username' => 'jdm_builder_ph',
            'is_kyc_verified' => true,
            'kyc_status' => 'approved',
            'is_showroom_active' => true,
        ]);

        Car::factory()->create([
            'seller_id' => $seller->id,
            'status' => CarStatus::Active->value,
            'is_approved' => true,
            'is_in_showroom' => true,
            'published_at' => now(),
            'brand' => 'Toyota',
            'model' => 'Supra',
        ]);

        $response = $this->getJson('/api/v1/showroom');
        $response->assertStatus(200)
            ->assertJsonStructure([
                'status',
                'garage_highlights',
                'data' => [
                    '*' => [
                        'id',
                        'username',
                        'avatar_url',
                        'role',
                        'is_official_garage',
                        'is_kyc_verified',
                        'location',
                        'stats' => [
                            'active_cars',
                            'total_listings',
                        ],
                        'preview_cars',
                    ],
                ],
                'meta',
            ]);

        $response->assertJsonFragment(['username' => 'jdm_builder_ph']);
    }

    public function test_can_get_single_seller_showroom_with_cars_inventory(): void
    {
        $seller = User::factory()->create([
            'role' => UserRole::Dealer->value,
            'username' => 'tokyo_auto_direct',
            'is_kyc_verified' => true,
            'kyc_status' => 'approved',
            'is_showroom_active' => true,
        ]);

        Car::factory()->create([
            'seller_id' => $seller->id,
            'status' => CarStatus::Active->value,
            'is_approved' => true,
            'is_in_showroom' => true,
            'published_at' => now(),
            'title' => '1999 Nissan Skyline GT-R V-Spec',
        ]);

        $response = $this->getJson('/api/v1/showroom/sellers/tokyo_auto_direct');
        $response->assertStatus(200)
            ->assertJsonPath('data.seller.username', 'tokyo_auto_direct')
            ->assertJsonPath('data.seller.stats.active_cars', 1)
            ->assertJsonStructure([
                'status',
                'data' => [
                    'seller',
                    'cars',
                    'reviews',
                ],
            ]);
    }

    public function test_can_get_showroom_overview_stats(): void
    {
        $response = $this->getJson('/api/v1/showroom/stats');
        $response->assertStatus(200)
            ->assertJsonStructure([
                'status',
                'data' => [
                    'total_builders',
                    'verified_builders',
                    'active_cars',
                    'total_inventory',
                ],
            ]);
    }
}
