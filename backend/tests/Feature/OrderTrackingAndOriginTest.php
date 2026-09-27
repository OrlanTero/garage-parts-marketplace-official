<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Part;
use App\Models\PlatformSetting;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrderTrackingAndOriginTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        \Illuminate\Support\Facades\Cache::flush();
        $this->seed(\Database\Seeders\PlatformSettingSeeder::class);
    }

    private function token(User $user): array
    {
        return ['Authorization' => 'Bearer ' . $user->createToken('t')->plainTextToken];
    }

    private function checkoutPayload(Part $part, array $extra = []): array
    {
        return array_merge([
            'buyer_name' => 'Kenji Takahashi',
            'buyer_email' => 'kenji@tokyogarage.jp',
            'shipping_address' => 'Unit 4B Chino Roces Ave',
            'shipping_city' => 'Makati',
            'chassis_number' => 'JZA80-0012948',
            'vin' => '1N4AL3AP8JC123456',
            'part_id' => $part->id,
            'quantity' => 1,
            'payment_method' => 'bank_transfer',
            'payment_reference' => 'MOCK-BT-1',
            'mock_paid' => true,
        ], $extra);
    }

    public function test_admin_can_read_and_update_variables(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $this->getJson('/api/v1/admin/config?group=variables', $this->token($admin))
            ->assertOk()
            ->assertJsonPath('data.free_freight_threshold.value', '10000');

        $this->putJson('/api/v1/admin/config', [
            'settings' => ['free_freight_threshold' => 5000],
        ], $this->token($admin))
            ->assertOk()
            ->assertJsonPath('data.free_freight_threshold.value', '5000');

        $this->assertSame('5000', PlatformSetting::get('free_freight_threshold'));
    }

    public function test_config_rejects_unknown_keys_and_non_admins(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $buyer = User::factory()->create(['role' => 'buyer']);

        $this->putJson('/api/v1/admin/config', [
            'settings' => ['nope_not_real' => 1],
        ], $this->token($admin))->assertUnprocessable();

        $this->getJson('/api/v1/admin/config', $this->token($buyer))->assertForbidden();
    }

    public function test_tracking_url_prefers_stored_then_template(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $seller = User::factory()->create(['role' => 'seller']);
        $part = Part::create([
            'seller_id' => $seller->id,
            'title' => 'Test Rotor',
            'category' => 'brakes',
            'brand' => 'Brembo',
            'price' => 1000,
            'status' => 'active',
            'published_at' => now(),
        ]);

        PlatformSetting::set('delivery_services', [
            ['code' => 'lbc', 'name' => 'LBC Express', 'tracking_url_template' => 'https://track.example/lbc/{tracking}', 'active' => true],
        ]);

        $orderNumber = $this->postJson('/api/v1/orders', $this->checkoutPayload($part))
            ->assertCreated()->json('data.order_number');
        $order = Order::where('order_number', $orderNumber)->firstOrFail();

        // Template resolution from carrier + tracking number.
        $this->patchJson("/api/v1/admin/orders/{$order->id}/status", [
            'status' => 'shipped',
            'carrier' => 'LBC Express',
            'tracking_number' => 'LBC-001',
        ], $this->token($admin))
            ->assertOk()
            ->assertJsonPath('data.tracking_url', 'https://track.example/lbc/LBC-001');

        // Explicit URL wins over the template.
        $this->patchJson("/api/v1/admin/orders/{$order->id}/status", [
            'status' => 'shipped',
            'tracking_url' => 'https://courier.example/custom/abc',
        ], $this->token($admin))
            ->assertOk()
            ->assertJsonPath('data.tracking_url', 'https://courier.example/custom/abc');
    }

    public function test_delivery_fee_origin_follows_pinned_warehouse(): void
    {
        $house = User::factory()->create([
            'role' => 'dealer',
            'username' => \App\Models\User::HOUSE_USERNAME,
            'email' => \App\Models\User::HOUSE_EMAIL,
        ]);
        $part = Part::create([
            'seller_id' => $house->id,
            'title' => 'Cebu Depot Rotor',
            'category' => 'brakes',
            'brand' => 'Brembo',
            'price' => 1000,
            'status' => 'active',
            'published_at' => now(),
        ]);

        // Dispatch depot pinned in Cebu City (~570km from the Makati buyer).
        $warehouse = Warehouse::create([
            'owner_id' => $house->id,
            'name' => 'GAP Cebu Depot',
            'code' => 'CEB-01',
            'city' => 'Cebu City',
            'latitude' => 10.3157,
            'longitude' => 123.8854,
            'is_default' => true,
            'is_active' => true,
        ]);

        $response = $this->postJson('/api/v1/orders', $this->checkoutPayload($part, [
            'delivery_latitude' => 14.5547,
            'delivery_longitude' => 121.0244,
        ]))->assertCreated();

        $response
            ->assertJsonPath('data.financials.shipping_fee', 1200)
            ->assertJsonPath('data.delivery.zone', 'Inter-island Freight')
            ->assertJsonPath('data.delivery.origin', 'GAP Cebu Depot')
            ->assertJsonPath('data.warehouse.name', 'GAP Cebu Depot');

        $this->assertDatabaseHas('orders', [
            'buyer_email' => 'kenji@tokyogarage.jp',
            'warehouse_id' => $warehouse->id,
        ]);
    }

    public function test_warehouse_accepts_and_returns_coordinates(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $created = $this->postJson('/api/v1/seller/warehouses', [
            'name' => 'GAP Valenzuela Main Depot',
            'code' => 'VLL-01',
            'address' => 'GAP Valenzuela Main, Valenzuela City, Metro Manila',
            'city' => 'Valenzuela',
            'latitude' => 14.7008,
            'longitude' => 120.9830,
        ], $this->token($admin))
            ->assertCreated()
            ->assertJsonPath('data.has_pin', true)
            ->assertJsonPath('data.latitude', 14.7008);

        $id = $created->json('data.id');

        $this->patchJson("/api/v1/seller/warehouses/{$id}", [
            'latitude' => 14.71,
        ], $this->token($admin))
            ->assertOk()
            ->assertJsonPath('data.latitude', 14.71);

        $this->postJson('/api/v1/seller/warehouses', [
            'name' => 'Bad Coords',
            'code' => 'BAD-01',
            'latitude' => 95,
        ], $this->token($admin))->assertUnprocessable();
    }
}
