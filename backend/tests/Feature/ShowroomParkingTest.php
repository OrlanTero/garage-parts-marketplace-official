<?php

namespace Tests\Feature;

use App\Enums\CarStatus;
use App\Enums\UserRole;
use App\Models\Car;
use App\Models\ShowroomSetting;
use App\Models\ShowroomSlot;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ShowroomParkingTest extends TestCase
{
    use RefreshDatabase;

    public function test_unactivated_seller_does_not_appear_in_showroom(): void
    {
        $seller = User::factory()->create([
            'role' => UserRole::Seller->value,
            'username' => 'fresh_unactivated_seller',
            'is_showroom_active' => false,
        ]);

        Car::factory()->create([
            'seller_id' => $seller->id,
            'status' => CarStatus::Active->value,
            'is_approved' => true,
            'is_in_showroom' => false,
        ]);

        $response = $this->getJson('/api/v1/showroom');
        $response->assertStatus(200);
        $response->assertJsonMissing(['username' => 'fresh_unactivated_seller']);
    }

    public function test_parking_fee_is_calculated_correctly_based_on_percentage(): void
    {
        $seller = User::factory()->create(['role' => UserRole::Seller->value]);
        Sanctum::actingAs($seller);

        // Default 5% on 500,000 = 25,000
        $response = $this->postJson('/api/v1/seller/showroom/calculate-fee', [
            'price' => 500000,
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.car_price', 500000)
            ->assertJsonPath('data.fee_percentage', 5)
            ->assertJsonPath('data.calculated_fee', 25000);
    }

    public function test_seller_can_apply_for_showroom_parking_slot(): void
    {
        $seller = User::factory()->create([
            'role' => UserRole::Seller->value,
            'is_showroom_active' => false,
        ]);
        Sanctum::actingAs($seller);

        $car = Car::factory()->create([
            'seller_id' => $seller->id,
            'status' => CarStatus::Active->value,
            'price' => 800000,
        ]);

        $response = $this->postJson('/api/v1/seller/showroom/apply', [
            'car_id' => $car->id,
            'payment_method' => 'gcash',
            'payment_reference' => 'GCASH-REF-998877',
            'seller_notes' => 'Please place in Showroom Bay #1',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.status', 'pending')
            ->assertJsonPath('data.calculated_fee', 40000); // 5% of 800k = 40k

        $this->assertDatabaseHas('showroom_slots', [
            'seller_id' => $seller->id,
            'car_id' => $car->id,
            'payment_reference' => 'GCASH-REF-998877',
            'status' => 'pending',
        ]);
    }

    public function test_admin_can_update_parking_fee_percentage(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin->value]);
        Sanctum::actingAs($admin);

        $response = $this->putJson('/api/v1/admin/showroom/settings', [
            'parking_fee_percentage' => 7.5,
            'min_parking_fee' => 7500,
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('data.parking_fee_percentage', 7.5);

        $this->assertEquals(7.5, ShowroomSetting::getParkingFeePercentage());
    }

    public function test_admin_approving_slot_activates_seller_showroom_and_places_car(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin->value]);
        $seller = User::factory()->create([
            'role' => UserRole::Seller->value,
            'username' => 'activated_legend_tuner',
            'is_showroom_active' => false,
        ]);

        $car = Car::factory()->create([
            'seller_id' => $seller->id,
            'status' => CarStatus::Active->value,
            'is_approved' => true,
            'is_in_showroom' => false,
            'price' => 500000,
        ]);

        $slot = ShowroomSlot::create([
            'seller_id' => $seller->id,
            'car_id' => $car->id,
            'car_price' => 500000,
            'fee_percentage' => 5.0,
            'calculated_fee' => 25000,
            'payment_method' => 'gcash',
            'payment_reference' => 'GCASH-PAY-500K-5PERCENT',
            'status' => 'pending',
        ]);

        Sanctum::actingAs($admin);
        $response = $this->postJson("/api/v1/admin/showroom/slots/{$slot->id}/approve", [
            'admin_notes' => 'Payment verified. Approved for Bay #2.',
        ]);

        $response->assertStatus(200);

        // Assert seller showroom is activated and car is in showroom
        $seller->refresh();
        $car->refresh();
        $slot->refresh();

        $this->assertTrue($seller->is_showroom_active);
        $this->assertTrue($car->is_in_showroom);
        $this->assertEquals('approved', $slot->status);

        // Verify public showroom now includes this seller and vehicle
        $publicRes = $this->getJson('/api/v1/showroom');
        $publicRes->assertStatus(200)
            ->assertJsonFragment(['username' => 'activated_legend_tuner']);
    }
}
