<?php

namespace Tests\Feature;

use App\Models\Car;
use App\Models\Order;
use App\Models\Part;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrderFulfillmentTest extends TestCase
{
    use RefreshDatabase;

    private function token(User $user): array
    {
        return ['Authorization' => 'Bearer ' . $user->createToken('t')->plainTextToken];
    }

    private function makePart(?User $seller = null): Part
    {
        $seller ??= User::factory()->create(['role' => 'seller']);
        return Part::create([
            'seller_id' => $seller->id,
            'title' => 'Bosch Front Brake Pads Set',
            'category' => 'brakes',
            'brand' => 'Bosch',
            'part_number' => 'BOSCH-BP-01',
            'price' => 2450.00,
            'status' => 'active',
            'published_at' => now(),
        ]);
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
        ], $extra);
    }

    private function makeCar(?User $seller = null): Car
    {
        $seller ??= User::factory()->create(['role' => 'seller']);
        return Car::create([
            'seller_id' => $seller->id,
            'title' => '1998 Nissan Silvia S15 Spec-R Aero',
            'brand' => 'Nissan',
            'model' => 'Silvia S15 Spec-R',
            'year' => 1998,
            'price' => 1240000.00,
            'quantity' => 1,
            'status' => 'active',
            'published_at' => now(),
        ]);
    }

    private function carCheckoutPayload(Car $car, array $extra = []): array
    {
        return array_merge([
            'buyer_name' => 'Kenji Takahashi',
            'buyer_email' => 'kenji@tokyogarage.jp',
            'shipping_address' => 'Unit 4B Chino Roces Ave',
            'shipping_city' => 'Makati',
            'car_id' => $car->id,
            'item_type' => 'car',
            'quantity' => 1,
            'payment_method' => 'bank_transfer',
        ], $extra);
    }

    private function acceptOrder(Order $order, User $seller): void
    {
        $this->postJson("/api/v1/seller/orders/{$order->id}/accept", [], $this->token($seller))->assertOk();
    }

    public function test_escrow_flow_negotiating_sold_delivered_accept_releases_payout(): void
    {
        $seller = User::factory()->create(['role' => 'seller']);
        $buyer = User::factory()->create(['role' => 'buyer', 'email' => 'kenji@tokyogarage.jp']);
        $car = $this->makeCar($seller);

        $orderNumber = $this->postJson('/api/v1/orders', $this->carCheckoutPayload($car, [
            'mock_paid' => true,
            'payment_reference' => 'HELD-REF-1',
        ]))->assertCreated()->json('data.order_number');
        $order = Order::where('order_number', $orderNumber)->firstOrFail();

        // Prepaid: settled but HELD — order is not complete.
        $this->assertEquals('paid', $order->payment_status);
        $this->assertEquals('processing', $order->status);
        $this->assertNotEquals('completed', $order->status);

        // Seller marks negotiation, then sold.
        $this->patchJson("/api/v1/seller/orders/{$order->id}/status", [
            'status' => 'negotiating',
        ], $this->token($seller))->assertOk()->assertJsonPath('data.status', 'negotiating');
        $this->patchJson("/api/v1/seller/orders/{$order->id}/status", [
            'status' => 'sold',
        ], $this->token($seller))->assertOk()->assertJsonPath('data.status', 'sold');

        // Seller delivers; buyer inspects and accepts → payout released.
        $this->patchJson("/api/v1/seller/orders/{$order->id}/status", [
            'status' => 'delivered',
        ], $this->token($seller))->assertOk();
        $this->postJson("/api/v1/orders/{$orderNumber}/accept-inspection", [], $this->token($buyer))
            ->assertOk()
            ->assertJsonPath('data.status', 'completed')
            ->assertJsonPath('data.financials.payment_status', 'released');

        $this->assertDatabaseHas('platform_transactions', [
            'stream_type' => 'seller_payout',
            'order_id' => $order->id,
            'status' => 'completed',
        ]);
    }

    public function test_rejected_inspection_opens_dispute_and_refund(): void
    {
        $seller = User::factory()->create(['role' => 'seller']);
        $buyer = User::factory()->create(['role' => 'buyer', 'email' => 'kenji@tokyogarage.jp']);
        $car = $this->makeCar($seller);

        $orderNumber = $this->postJson('/api/v1/orders', $this->carCheckoutPayload($car, [
            'mock_paid' => true,
            'payment_reference' => 'HELD-REF-2',
        ]))->assertCreated()->json('data.order_number');
        $order = Order::where('order_number', $orderNumber)->firstOrFail();

        $this->patchJson("/api/v1/seller/orders/{$order->id}/status", [
            'status' => 'delivered',
        ], $this->token($seller))->assertOk();

        $this->postJson("/api/v1/orders/{$orderNumber}/reject-inspection", [
            'reason' => 'Paint mismatch on delivery',
        ], $this->token($buyer))
            ->assertOk()
            ->assertJsonPath('data.status', 'disputed');

        // Held funds are NOT released on dispute.
        $this->assertDatabaseMissing('platform_transactions', [
            'stream_type' => 'seller_payout',
            'order_id' => $order->id,
        ]);

        $this->postJson("/api/v1/seller/orders/{$order->id}/refund", [], $this->token($seller))
            ->assertOk()
            ->assertJsonPath('data.status', 'refunded')
            ->assertJsonPath('data.financials.payment_status', 'refunded');

        $this->assertDatabaseHas('platform_transactions', [
            'stream_type' => 'order_refund',
            'order_id' => $order->id,
        ]);
    }

    public function test_parts_orders_use_direct_capture_labels_not_escrow(): void
    {
        $part = $this->makePart();

        $orderNumber = $this->postJson('/api/v1/orders', $this->checkoutPayload($part, [
            'mock_paid' => true,
            'payment_reference' => 'PART-DIRECT-1',
        ]))->assertCreated()->json('data.order_number');

        $this->getJson("/api/v1/orders/{$orderNumber}")
            ->assertOk()
            ->assertJsonPath('data.financials.payment_status', 'paid')
            ->assertJsonPath('data.financials.payment_label', 'Payment Received — order confirmed');
    }

    public function test_parts_inspection_endpoints_reject_with_422(): void
    {
        $buyer = User::factory()->create(['role' => 'buyer', 'email' => 'kenji@tokyogarage.jp']);
        $part = $this->makePart();

        $orderNumber = $this->postJson('/api/v1/orders', $this->checkoutPayload($part, [
            'mock_paid' => true,
            'payment_reference' => 'PART-DIRECT-2',
        ]))->assertCreated()->json('data.order_number');
        $order = Order::where('order_number', $orderNumber)->firstOrFail();

        $admin = User::factory()->create(['role' => 'admin']);
        $this->patchJson("/api/v1/admin/orders/{$order->id}/status", [
            'status' => 'delivered',
        ], $this->token($admin))->assertOk();

        $this->postJson("/api/v1/orders/{$orderNumber}/accept-inspection", [], $this->token($buyer))
            ->assertStatus(422);
        $this->postJson("/api/v1/orders/{$orderNumber}/reject-inspection", [
            'reason' => 'Changed my mind',
        ], $this->token($buyer))->assertStatus(422);
    }

    public function test_parts_completion_records_payout_once(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $part = $this->makePart();

        $orderNumber = $this->postJson('/api/v1/orders', $this->checkoutPayload($part, [
            'mock_paid' => true,
            'payment_reference' => 'PART-DIRECT-3',
        ]))->assertCreated()->json('data.order_number');
        $order = Order::where('order_number', $orderNumber)->firstOrFail();

        foreach (['preparing', 'shipped', 'delivered'] as $status) {
            $this->patchJson("/api/v1/admin/orders/{$order->id}/status", [
                'status' => $status,
            ], $this->token($admin))->assertOk();
        }

        $this->patchJson("/api/v1/admin/orders/{$order->id}/status", [
            'status' => 'completed',
        ], $this->token($admin))
            ->assertOk()
            ->assertJsonPath('data.status', 'completed')
            ->assertJsonPath('data.financials.payment_status', 'paid');

        $this->assertDatabaseHas('platform_transactions', [
            'stream_type' => 'seller_payout',
            'order_id' => $order->id,
            'status' => 'completed',
        ]);

        // Completing again never pays twice.
        $this->patchJson("/api/v1/admin/orders/{$order->id}/status", [
            'status' => 'completed',
        ], $this->token($admin))->assertOk();
        $this->assertEquals(1, \App\Models\PlatformTransaction::where('order_id', $order->id)
            ->where('stream_type', 'seller_payout')
            ->count());
    }

    public function test_delivery_quote_prices_by_distance_from_main_branch(): void
    {
        // Makati pin (~17km from Valenzuela) → NCR Fringe tier.
        $this->getJson('/api/v1/delivery-quote?latitude=14.5547&longitude=121.0244&city=Makati')
            ->assertOk()
            ->assertJsonPath('data.zone', 'NCR Fringe')
            ->assertJsonPath('data.fee', 250)
            ->assertJsonPath('data.free', false);

        // Cebu pin (inter-island) → top tier.
        $this->getJson('/api/v1/delivery-quote?latitude=10.3157&longitude=123.8854&city=Cebu%20City')
            ->assertOk()
            ->assertJsonPath('data.zone', 'Inter-island Freight')
            ->assertJsonPath('data.fee', 1200);

        // No pin, unknown city → standard flat fallback.
        $this->getJson('/api/v1/delivery-quote?city=Nowhereville')
            ->assertOk()
            ->assertJsonPath('data.zone', 'Standard')
            ->assertJsonPath('data.fee', 350);
    }

    public function test_checkout_stores_server_computed_fee_distance_and_zone(): void
    {
        $part = $this->makePart();

        $response = $this->postJson('/api/v1/orders', $this->checkoutPayload($part, [
            'delivery_latitude' => 14.5547,
            'delivery_longitude' => 121.0244,
        ]))->assertCreated();

        $response
            ->assertJsonPath('data.financials.shipping_fee', 250)
            ->assertJsonPath('data.delivery.zone', 'NCR Fringe')
            ->assertJsonPath('data.financials.total_amount', 2700);

        $this->assertDatabaseHas('orders', [
            'buyer_email' => 'kenji@tokyogarage.jp',
            'shipping_fee' => 250,
            'delivery_zone' => 'NCR Fringe',
        ]);
    }

    public function test_buyer_cannot_confirm_payment_before_acceptance(): void
    {
        $buyer = User::factory()->create(['role' => 'buyer', 'email' => 'kenji@tokyogarage.jp']);
        $part = $this->makePart();

        $orderNumber = $this->postJson('/api/v1/orders', $this->checkoutPayload($part))
            ->assertCreated()->json('data.order_number');

        $this->postJson("/api/v1/orders/{$orderNumber}/confirm-payment", [
            'payment_reference' => 'BDO-REF-123',
        ], $this->token($buyer))->assertUnprocessable();
    }

    public function test_full_fund_flow_from_acceptance_to_completion_and_receipt(): void
    {
        $seller = User::factory()->create(['role' => 'seller']);
        $buyer = User::factory()->create(['role' => 'buyer', 'email' => 'kenji@tokyogarage.jp']);
        $part = $this->makePart($seller);

        $orderNumber = $this->postJson('/api/v1/orders', $this->checkoutPayload($part))
            ->assertCreated()->json('data.order_number');
        $order = Order::where('order_number', $orderNumber)->firstOrFail();

        $this->acceptOrder($order, $seller);

        // Completion is blocked while funds are still pending.
        $admin = User::factory()->create(['role' => 'admin']);
        $this->patchJson("/api/v1/admin/orders/{$order->id}/status", [
            'status' => 'completed',
        ], $this->token($admin))->assertUnprocessable();

        // Buyer submits fund transfer with reference.
        $this->postJson("/api/v1/orders/{$orderNumber}/confirm-payment", [
            'payment_method' => 'bank_transfer',
            'payment_reference' => 'BDO-REF-7788',
        ], $this->token($buyer))
            ->assertOk()
            ->assertJsonPath('data.financials.payment_status', 'paid')
            ->assertJsonPath('data.financials.payment_reference', 'BDO-REF-7788');

        // House/seller confirms the funds.
        $this->postJson("/api/v1/seller/orders/{$order->id}/confirm-funds", [], $this->token($seller))
            ->assertOk()
            ->assertJsonPath('data.financials.payment_status', 'confirmed');

        // Ship → deliver → complete.
        $this->patchJson("/api/v1/admin/orders/{$order->id}/status", [
            'status' => 'shipped',
            'tracking_number' => 'TRK-VAL-001',
            'carrier' => 'LBC Express',
        ], $this->token($admin))->assertOk();

        $this->patchJson("/api/v1/admin/orders/{$order->id}/status", [
            'status' => 'delivered',
        ], $this->token($admin))->assertOk();

        $this->patchJson("/api/v1/admin/orders/{$order->id}/status", [
            'status' => 'completed',
        ], $this->token($admin))
            ->assertOk()
            ->assertJsonPath('data.status', 'completed')
            ->assertJsonPath('data.financials.payment_status', 'confirmed')
            ->assertJsonPath('data.financials.payment_reference', 'BDO-REF-7788')
            ->assertJsonPath('data.delivery.zone', 'NCR Fringe');

        // Receipt locks: buyer can no longer swap payment method or pin.
        $this->patchJson("/api/v1/orders/{$orderNumber}/payment-method", [
            'payment_method' => 'ewallet',
        ], $this->token($buyer))->assertUnprocessable();
    }

    public function test_funds_cannot_be_confirmed_before_buyer_pays(): void
    {
        $seller = User::factory()->create(['role' => 'seller']);
        $part = $this->makePart($seller);

        $orderNumber = $this->postJson('/api/v1/orders', $this->checkoutPayload($part))
            ->assertCreated()->json('data.order_number');
        $order = Order::where('order_number', $orderNumber)->firstOrFail();

        $this->acceptOrder($order, $seller);

        $this->postJson("/api/v1/seller/orders/{$order->id}/confirm-funds", [], $this->token($seller))
            ->assertUnprocessable();
    }

    public function test_stranger_cannot_confirm_funds_on_others_orders(): void
    {
        $seller = User::factory()->create(['role' => 'seller']);
        $stranger = User::factory()->create(['role' => 'seller']);
        $buyer = User::factory()->create(['role' => 'buyer', 'email' => 'kenji@tokyogarage.jp']);
        $part = $this->makePart($seller);

        $orderNumber = $this->postJson('/api/v1/orders', $this->checkoutPayload($part))
            ->assertCreated()->json('data.order_number');
        $order = Order::where('order_number', $orderNumber)->firstOrFail();

        $this->acceptOrder($order, $seller);
        $this->postJson("/api/v1/orders/{$orderNumber}/confirm-payment", [
            'payment_reference' => 'REF-1',
        ], $this->token($buyer))->assertOk();

        $this->postJson("/api/v1/seller/orders/{$order->id}/confirm-funds", [], $this->token($stranger))
            ->assertForbidden();
    }

    public function test_prepaid_checkout_creates_paid_accepted_order_and_consumes_stock(): void
    {
        $seller = User::factory()->create(['role' => 'seller']);
        $part = $this->makePart($seller);
        $part->forceFill(['quantity' => 5])->save();

        $response = $this->postJson('/api/v1/orders', $this->checkoutPayload($part, [
            'payment_method' => 'ewallet',
            'payment_reference' => 'MOCK-EW-7788',
            'mock_paid' => true,
        ]))->assertCreated();

        $response
            ->assertJsonPath('data.financials.payment_status', 'paid')
            ->assertJsonPath('data.financials.payment_reference', 'MOCK-EW-7788')
            ->assertJsonPath('data.verification_status', 'accepted')
            ->assertJsonPath('data.status', 'processing');

        $this->assertSame(4, (int) $part->refresh()->quantity);
    }

    public function test_order_mints_unique_security_hash_and_verify_endpoint(): void
    {
        $seller = User::factory()->create(['role' => 'seller']);
        $part = $this->makePart($seller);

        $orderNumber = $this->postJson('/api/v1/orders', $this->checkoutPayload($part, [
            'mock_paid' => true,
            'payment_reference' => 'HASH-REF-1',
        ]))->assertCreated()->json('data.order_number');

        $order = Order::where('order_number', $orderNumber)->firstOrFail();
        $this->assertNotEmpty($order->security_hash);
        $this->assertEquals(64, strlen($order->security_hash));

        // Second order gets a different hash.
        $orderNumber2 = $this->postJson('/api/v1/orders', $this->checkoutPayload($part, [
            'mock_paid' => true,
            'payment_reference' => 'HASH-REF-2',
        ]))->assertCreated()->json('data.order_number');
        $order2 = Order::where('order_number', $orderNumber2)->firstOrFail();
        $this->assertNotEquals($order->security_hash, $order2->security_hash);

        // Genuine hash verifies (public, no auth).
        $this->getJson("/api/v1/orders/verify/{$order->security_hash}")
            ->assertOk()
            ->assertJsonPath('data.valid', true)
            ->assertJsonPath('data.order_number', $orderNumber);

        // Forged hash does not.
        $this->getJson('/api/v1/orders/verify/' . str_repeat('0', 64))
            ->assertOk()
            ->assertJsonPath('data.valid', false);
    }

    public function test_prepaid_checkout_requires_method_and_reference(): void
    {
        $part = $this->makePart();

        $this->postJson('/api/v1/orders', $this->checkoutPayload($part, [
            'mock_paid' => true,
        ]))->assertUnprocessable();
    }

    public function test_preparing_to_completed_flow_with_delivery_details(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $part = $this->makePart();

        $orderNumber = $this->postJson('/api/v1/orders', $this->checkoutPayload($part, [
            'payment_method' => 'bank_transfer',
            'payment_reference' => 'MOCK-BT-001',
            'mock_paid' => true,
        ]))->assertCreated()->json('data.order_number');
        $order = Order::where('order_number', $orderNumber)->firstOrFail();

        // Prepaid orders skip straight into prep — no separate acceptance needed.
        $this->patchJson("/api/v1/admin/orders/{$order->id}/status", [
            'status' => 'preparing',
        ], $this->token($admin))->assertOk();

        $this->patchJson("/api/v1/admin/orders/{$order->id}/status", [
            'status' => 'shipped',
            'carrier' => 'LBC Express',
            'tracking_number' => 'LBC-VAL-0099',
            'estimated_arrival' => now()->addDays(3)->format('Y-m-d'),
        ], $this->token($admin))
            ->assertOk()
            ->assertJsonPath('data.carrier', 'LBC Express')
            ->assertJsonPath('data.tracking_number', 'LBC-VAL-0099')
            ->assertJsonPath('data.estimated_arrival', now()->addDays(3)->format('Y-m-d'));

        $this->patchJson("/api/v1/admin/orders/{$order->id}/status", [
            'status' => 'delivered',
        ], $this->token($admin))->assertOk();

        $this->patchJson("/api/v1/admin/orders/{$order->id}/status", [
            'status' => 'completed',
        ], $this->token($admin))
            ->assertOk()
            ->assertJsonPath('data.status', 'completed')
            ->assertJsonPath('data.financials.payment_status', 'paid');
    }
}
