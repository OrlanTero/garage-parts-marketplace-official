<?php

namespace Tests\Feature;

use App\Models\Car;
use App\Models\ShowroomSlot;
use App\Models\User;
use Database\Seeders\ShowroomSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ShowroomFlagTest extends TestCase
{
    use RefreshDatabase;

    private function token(User $user): array
    {
        return ['Authorization' => 'Bearer ' . $user->createToken('t')->plainTextToken];
    }

    private function makeCar(User $seller): Car
    {
        return Car::create([
            'seller_id' => $seller->id,
            'title' => 'Test Build',
            'brand' => 'Toyota',
            'model' => 'AE86',
            'year' => 1986,
            'price' => 1000000.00,
            'quantity' => 1,
            'status' => 'active',
            'is_approved' => true,
            'published_at' => now(),
        ]);
    }

    private function makeSlot(User $seller, Car $car, string $status = 'approved'): ShowroomSlot
    {
        return ShowroomSlot::create([
            'seller_id' => $seller->id,
            'car_id' => $car->id,
            'car_price' => $car->price,
            'fee_percentage' => 5.00,
            'calculated_fee' => 50000.00,
            'payment_method' => 'gcash',
            'payment_reference' => 'TEST-1',
            'status' => $status,
        ]);
    }

    public function test_seeder_repair_activates_sellers_with_floor_slots(): void
    {
        $seller = User::factory()->create(['role' => 'seller']);
        $car = $this->makeCar($seller);
        $this->makeSlot($seller, $car);

        $this->assertFalse((bool) $seller->refresh()->is_showroom_active);

        ShowroomSeeder::refreshSellerFlags();

        $this->assertTrue((bool) $seller->refresh()->is_showroom_active);
        $this->assertNotNull($seller->refresh()->showroom_activated_at);
    }

    public function test_status_read_reflects_floor_slot_despite_flag(): void
    {
        $seller = User::factory()->create(['role' => 'seller']);
        $car = $this->makeCar($seller);
        $this->makeSlot($seller, $car);

        $res = $this->getJson('/api/v1/seller/showroom/status', $this->token($seller))->assertOk();
        $this->assertTrue((bool) $res->json('data.is_showroom_active'));
    }

    public function test_revoke_last_slot_deactivates_but_keeps_active_with_others(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $seller = User::factory()->create(['role' => 'seller', 'is_showroom_active' => true]);
        $carA = $this->makeCar($seller);
        $carB = $this->makeCar($seller);
        $slotA = $this->makeSlot($seller, $carA);
        $slotB = $this->makeSlot($seller, $carB);

        $this->postJson("/api/v1/admin/showroom/slots/{$slotA->id}/revoke", [], $this->token($admin))->assertOk();
        $this->assertTrue((bool) $seller->refresh()->is_showroom_active);

        $this->postJson("/api/v1/admin/showroom/slots/{$slotB->id}/revoke", [], $this->token($admin))->assertOk();
        $this->assertFalse((bool) $seller->refresh()->is_showroom_active);
    }

    public function test_approve_sets_flag_and_unplace_clears_it(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $seller = User::factory()->create(['role' => 'seller']);
        $car = $this->makeCar($seller);
        $slot = $this->makeSlot($seller, $car, 'pending');

        $this->postJson("/api/v1/admin/showroom/slots/{$slot->id}/approve", [], $this->token($admin))->assertOk();
        $this->assertTrue((bool) $seller->refresh()->is_showroom_active);

        $this->postJson("/api/v1/admin/showroom/cars/{$car->id}/toggle", [
            'is_in_showroom' => false,
        ], $this->token($admin))->assertOk();
        $this->assertFalse((bool) $seller->refresh()->is_showroom_active);
    }
}
