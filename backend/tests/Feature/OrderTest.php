<?php

namespace Tests\Feature;

use App\Models\Car;
use App\Models\Order;
use App\Models\Part;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrderTest extends TestCase
{
    use RefreshDatabase;

    public function test_customer_can_checkout_with_chassis_number_and_vin(): void
    {
        $seller = User::factory()->create(['role' => 'seller']);
        $part = Part::create([
            'seller_id' => $seller->id,
            'title' => 'Garrett G30-770 Dual Ball Bearing Turbocharger',
            'category' => 'engine',
            'brand' => 'Garrett',
            'part_number' => 'GAR-G30-770-V',
            'price' => 2450.00,
            'status' => 'active',
            'published_at' => now(),
        ]);

        $payload = [
            'buyer_name' => 'Kenji Takahashi',
            'buyer_email' => 'kenji@tokyogarage.jp',
            'buyer_phone' => '+81 90-1234-5678',
            'shipping_address' => '3-14-2 Minatomirai, Nishi-ku',
            'shipping_city' => 'Yokohama',
            'shipping_postal_code' => '220-0012',
            'chassis_number' => 'JZA80-0012948',
            'vin' => '1N4AL3AP8JC123456',
            'vehicle_make_model' => '1998 Toyota Supra RZ (JZA80)',
            'part_id' => $part->id,
            'quantity' => 1,
            'payment_method' => 'bank_transfer',
            'notes' => 'Please verify 0.83 A/R fitment with chassis JZA80.',
        ];

        $response = $this->postJson('/api/v1/orders', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('data.buyer.name', 'Kenji Takahashi')
            ->assertJsonPath('data.buyer.email', 'kenji@tokyogarage.jp')
            ->assertJsonPath('data.vehicle.chassis_number', 'JZA80-0012948')
            ->assertJsonPath('data.vehicle.vin', '1N4AL3AP8JC123456')
            ->assertJsonPath('data.vehicle.make_model', '1998 Toyota Supra RZ (JZA80)')
            ->assertJsonPath('data.chassis_number', 'JZA80-0012948')
            ->assertJsonPath('data.vin', '1N4AL3AP8JC123456')
            ->assertJsonPath('data.item.name', 'Garrett G30-770 Dual Ball Bearing Turbocharger');

        $this->assertDatabaseHas('orders', [
            'buyer_email' => 'kenji@tokyogarage.jp',
            'chassis_number' => 'JZA80-0012948',
            'vin' => '1N4AL3AP8JC123456',
            'part_id' => $part->id,
        ]);
    }

    public function test_checkout_requires_vehicle_chassis_number(): void
    {
        $payload = [
            'buyer_name' => 'Test Buyer',
            'buyer_email' => 'buyer@example.com',
            'shipping_address' => '123 Main Street',
            'vin' => '1N4AL3AP8JC123456',
            // Missing chassis_number
        ];

        $response = $this->postJson('/api/v1/orders', $payload);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['chassis_number']);
    }

    public function test_checkout_requires_vehicle_vin(): void
    {
        $payload = [
            'buyer_name' => 'Test Buyer',
            'buyer_email' => 'buyer@example.com',
            'shipping_address' => '123 Main Street',
            'chassis_number' => 'JZA80-0012948',
            // Missing vin
        ];

        $response = $this->postJson('/api/v1/orders', $payload);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['vin']);
    }

    public function test_sales_order_can_be_retrieved_with_chassis_and_vin_details(): void
    {
        $order = Order::create([
            'order_number' => 'SO-2026-TEST01',
            'buyer_name' => 'Hiroshi Tanaka',
            'buyer_email' => 'hiroshi@gtrgarage.jp',
            'shipping_address' => '4-10-1 Roppongi, Minato-ku, Tokyo',
            'chassis_number' => 'BNR34-005128',
            'vin' => 'JN100BNR34U005128',
            'vehicle_make_model' => '2000 Nissan Skyline GT-R V-Spec II (BNR34)',
            'item_name' => 'Nismo Spec Dual Exhaust System',
            'item_sku' => 'NISMO-BNR34-EX',
            'quantity' => 1,
            'unit_price' => 3200.00,
            'shipping_fee' => 0.00,
            'total_amount' => 3200.00,
            'status' => 'processing',
        ]);

        $response = $this->getJson('/api/v1/orders/' . $order->order_number);

        $response->assertStatus(200)
            ->assertJsonPath('data.order_number', 'SO-2026-TEST01')
            ->assertJsonPath('data.vehicle.chassis_number', 'BNR34-005128')
            ->assertJsonPath('data.vehicle.vin', 'JN100BNR34U005128')
            ->assertJsonPath('data.vehicle.make_model', '2000 Nissan Skyline GT-R V-Spec II (BNR34)')
            ->assertJsonPath('data.chassis_number', 'BNR34-005128')
            ->assertJsonPath('data.vin', 'JN100BNR34U005128')
            ->assertJsonPath('data.financials.total_amount', 3200);
    }

    public function test_authenticated_user_orders_listing(): void
    {
        $buyer = User::factory()->create(['role' => 'buyer', 'email' => 'buyer@garage.test']);

        Order::create([
            'order_number' => 'SO-2026-AUTH01',
            'user_id' => $buyer->id,
            'buyer_name' => $buyer->name,
            'buyer_email' => $buyer->email,
            'shipping_address' => 'Makati City, Metro Manila',
            'chassis_number' => 'FD3S-102948',
            'vin' => 'JM1FD3311P0102948',
            'vehicle_make_model' => '1994 Mazda RX-7 FD3S',
            'item_name' => 'Apex Power FC ECU',
            'quantity' => 1,
            'unit_price' => 1100.00,
            'shipping_fee' => 0.00,
            'total_amount' => 1100.00,
        ]);

        $response = $this->getJson('/api/v1/orders', [
            'Authorization' => 'Bearer ' . $buyer->createToken('t')->plainTextToken,
        ]);

        $response->assertStatus(200)
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.vehicle.chassis_number', 'FD3S-102948')
            ->assertJsonPath('data.0.vehicle.vin', 'JM1FD3311P0102948');
    }
}
