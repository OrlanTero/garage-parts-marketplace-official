<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Part;
use App\Models\PlatformTransaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AgentCommissionTest extends TestCase
{
    use RefreshDatabase;

    private function token(User $user): array
    {
        return ['Authorization' => 'Bearer ' . $user->createToken('t')->plainTextToken];
    }

    private function makePart(User $seller): Part
    {
        return Part::create([
            'seller_id' => $seller->id,
            'title' => 'GReddy Intercooler Kit',
            'category' => 'engine',
            'brand' => 'GReddy',
            'part_number' => 'GRE-IC-01',
            'price' => 20000.00,
            'status' => 'active',
            'published_at' => now(),
        ]);
    }

    private function checkoutPayload(Part $part, array $extra = []): array
    {
        return array_merge([
            'buyer_name' => 'Buyer One',
            'buyer_email' => 'buyer1@garage.test',
            'shipping_address' => 'Makati',
            'chassis_number' => 'JZA80-001',
            'vin' => '1N4AL3AP8JC123456',
            'part_id' => $part->id,
            'quantity' => 1,
            'payment_method' => 'bank_transfer',
            'payment_reference' => 'AG-REF-1',
            'mock_paid' => true,
        ], $extra);
    }

    private function completeAsAdmin(Order $order, User $admin): void
    {
        foreach (['preparing', 'shipped', 'delivered', 'completed'] as $status) {
            $this->patchJson("/api/v1/admin/orders/{$order->id}/status", [
                'status' => $status,
            ], $this->token($admin))->assertOk();
        }
    }

    public function test_seller_cannot_earn_commission_on_own_listing(): void
    {
        $seller = User::factory()->create(['role' => 'seller', 'agent_code' => 'AGT-SELF']);
        $part = $this->makePart($seller);

        $orderNumber = $this->postJson('/api/v1/orders', $this->checkoutPayload($part, [
            'agent_code' => 'AGT-SELF',
        ]))->assertCreated()->json('data.order_number');

        $this->assertDatabaseHas('orders', [
            'order_number' => $orderNumber,
            'agent_id' => null,
            'agent_code' => null,
            'commission_amount' => 0,
        ]);
    }

    public function test_buyer_cannot_earn_commission_on_own_purchase(): void
    {
        $seller = User::factory()->create(['role' => 'seller']);
        $buyer = User::factory()->create(['role' => 'buyer', 'agent_code' => 'AGT-BUYER']);
        $part = $this->makePart($seller);

        $payload = $this->checkoutPayload($part, [
            'buyer_email' => $buyer->email,
            'agent_code' => 'AGT-BUYER',
        ]);
        $orderNumber = $this->postJson('/api/v1/orders', $payload, $this->token($buyer))
            ->assertCreated()->json('data.order_number');

        $this->assertDatabaseHas('orders', [
            'order_number' => $orderNumber,
            'agent_id' => null,
            'agent_code' => null,
            'commission_amount' => 0,
        ]);
    }

    public function test_third_party_agent_commission_settles_to_wallet_once(): void
    {
        $seller = User::factory()->create(['role' => 'seller']);
        $agent = User::factory()->create(['agent_code' => 'AGT-WALLET', 'commission_rate' => 5.00]);
        $admin = User::factory()->create(['role' => 'admin']);
        $part = $this->makePart($seller);

        $orderNumber = $this->postJson('/api/v1/orders', $this->checkoutPayload($part, [
            'agent_code' => 'AGT-WALLET',
        ]))->assertCreated()->json('data.order_number');
        $order = Order::where('order_number', $orderNumber)->firstOrFail();

        $this->assertEquals(1000.00, (float) $order->commission_amount);
        $this->assertEquals('pending', $order->commission_status);

        $this->completeAsAdmin($order, $admin);

        // Settled once: ledger row + status flip + wallet credit.
        $this->assertEquals(1, PlatformTransaction::where('order_id', $order->id)
            ->where('stream_type', 'agent_commission')->count());
        $this->assertDatabaseHas('platform_transactions', [
            'stream_type' => 'agent_commission',
            'user_id' => $agent->id,
            'order_id' => $order->id,
            'status' => 'completed',
        ]);
        $this->assertEquals('settled', $order->refresh()->commission_status);

        $wallet = $this->getJson('/api/v1/wallet', $this->token($agent))->assertOk();
        $this->assertEquals(1000.00, (float) $wallet->json('data.balance.available'));

        $statements = $this->getJson('/api/v1/wallet/statements', $this->token($agent))->assertOk();
        $kinds = collect($statements->json('data'))->pluck('kind')->all();
        $this->assertContains('commission', $kinds);

        // Completing again never double-pays.
        $this->patchJson("/api/v1/admin/orders/{$order->id}/status", [
            'status' => 'completed',
        ], $this->token($admin))->assertOk();
        $this->assertEquals(1, PlatformTransaction::where('order_id', $order->id)
            ->where('stream_type', 'agent_commission')->count());

        // Agent portal reflects settled money.
        $stats = $this->getJson('/api/v1/agent/stats', $this->token($agent))->assertOk();
        $this->assertEquals(1000.00, (float) $stats->json('performance.settled_commission'));
        $this->assertEquals(0.0, (float) $stats->json('performance.pending_commission'));
    }
}
