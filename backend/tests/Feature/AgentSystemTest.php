<?php

namespace Tests\Feature;

use App\Models\Car;
use App\Models\Order;
use App\Models\Part;
use App\Models\User;
use App\Services\AgentService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AgentSystemTest extends TestCase
{
    use RefreshDatabase;

    private function makeActiveAgent(array $overrides = []): User
    {
        $agent = User::factory()->kycVerified()->create(array_merge([
            'agent_subscription_status' => 'inactive',
        ], $overrides));

        AgentService::subscribe($agent, 'gcash', 'TEST-REF-' . $agent->id);

        return $agent->refresh();
    }

    public function test_user_is_assigned_an_agent_code_automatically(): void
    {
        $user = User::factory()->create([
            'name' => 'Dominic Toretto',
            'email' => 'dom@fastgarage.ph',
            'role' => 'buyer',
        ]);

        $this->assertNotEmpty($user->agent_code);
        $this->assertStringStartsWith('AGT-', $user->agent_code);
        // New rule: agent_code is an identity, but privileges stay inactive
        // until verified KYC + paid yearly subscription.
        $this->assertFalse($user->isAgentActive());
        $this->assertEquals('inactive', $user->agent_subscription_status);
    }

    public function test_can_verify_valid_agent_code_publicly(): void
    {
        $agent = $this->makeActiveAgent([
            'name' => 'Brian OConner',
            'email' => 'brian@r34tuners.ph',
            'agent_code' => 'AGT-BRIAN',
            'agent_tagline' => 'Certified JDM Performance Agent',
            'commission_rate' => 7.50,
        ]);

        $response = $this->getJson('/api/v1/agents/verify/AGT-BRIAN');

        $response->assertStatus(200)
            ->assertJsonPath('valid', true)
            ->assertJsonPath('agent.name', 'Brian OConner')
            ->assertJsonPath('agent.agent_code', 'AGT-BRIAN')
            ->assertJsonPath('agent.commission_rate', 7.5)
            ->assertJsonPath('agent.tagline', 'Certified JDM Performance Agent');
    }

    public function test_inactive_agent_code_does_not_verify(): void
    {
        User::factory()->create([
            'name' => 'Inactive Ivan',
            'email' => 'ivan@garage.ph',
            'agent_code' => 'AGT-INACTIVE',
        ]);

        $response = $this->getJson('/api/v1/agents/verify/AGT-INACTIVE');

        $response->assertStatus(200)
            ->assertJsonPath('valid', false);
    }

    public function test_verifying_invalid_agent_code_returns_404(): void
    {
        $response = $this->getJson('/api/v1/agents/verify/NON-EXISTENT-CODE');

        $response->assertStatus(404)
            ->assertJsonPath('valid', false);
    }

    public function test_customer_order_attributes_commission_to_referring_agent(): void
    {
        $agent = $this->makeActiveAgent([
            'name' => 'Han Lue',
            'email' => 'han@rx7drift.ph',
            'agent_code' => 'AGT-HAN',
            'commission_rate' => 10.00,
        ]);

        $seller = User::factory()->create(['role' => 'seller']);

        $part = Part::create([
            'seller_id' => $seller->id,
            'title' => 'Tomei Titanium Exhaust System',
            'category' => 'exhaust',
            'brand' => 'Tomei',
            'price' => 5000.00,
            'status' => 'active',
            'published_at' => now(),
        ]);

        $payload = [
            'buyer_name' => 'Sean Boswell',
            'buyer_email' => 'sean@tokyodrift.ph',
            'shipping_address' => 'Shibuya Crossing, Tokyo',
            'chassis_number' => 'S15-009821',
            'vin' => '1N4AL3AP8JC999999',
            'vehicle_make_model' => 'Nissan Silvia S15 Spec-R',
            'part_id' => $part->id,
            'quantity' => 1,
            'agent_code' => 'AGT-HAN',
        ];

        $response = $this->postJson('/api/v1/orders', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('data.agent.code', 'AGT-HAN')
            ->assertJsonPath('data.agent.name', 'Han Lue')
            ->assertJsonPath('data.agent.commission_rate', 10)
            ->assertJsonPath('data.agent.commission_amount', 500) // 10% of 5000
            ->assertJsonPath('data.agent_code', 'AGT-HAN');

        $this->assertDatabaseHas('orders', [
            'buyer_email' => 'sean@tokyodrift.ph',
            'agent_id' => $agent->id,
            'agent_code' => 'AGT-HAN',
            'commission_rate' => 10.00,
            'commission_amount' => 500.00,
        ]);
    }

    public function test_inactive_agent_earns_no_order_commission(): void
    {
        User::factory()->create([
            'name' => 'No Sub Ned',
            'email' => 'ned@garage.ph',
            'agent_code' => 'AGT-NOSUB',
            'commission_rate' => 10.00,
        ]);

        $seller = User::factory()->create(['role' => 'seller']);

        $part = Part::create([
            'seller_id' => $seller->id,
            'title' => 'Stock Muffler',
            'category' => 'exhaust',
            'brand' => 'OEM',
            'price' => 5000.00,
            'status' => 'active',
            'published_at' => now(),
        ]);

        $response = $this->postJson('/api/v1/orders', [
            'buyer_name' => 'Buyer B',
            'buyer_email' => 'b@garage.ph',
            'shipping_address' => 'Makati',
            'chassis_number' => 'S15-009822',
            'vin' => '1N4AL3AP8JC999998',
            'vehicle_make_model' => 'Nissan Silvia S15 Spec-R',
            'part_id' => $part->id,
            'quantity' => 1,
            'agent_code' => 'AGT-NOSUB',
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('orders', [
            'buyer_email' => 'b@garage.ph',
            'agent_id' => null,
            'commission_amount' => 0.00,
        ]);
    }

    public function test_agent_can_fetch_earnings_and_performance_stats(): void
    {
        $agent = $this->makeActiveAgent([
            'name' => 'Mia Toretto',
            'email' => 'mia@torettoauto.ph',
            'agent_code' => 'AGT-MIA',
            'commission_rate' => 5.00,
        ]);

        // Place an order referred by Mia
        Order::create([
            'order_number' => 'SO-2026-MIA001',
            'buyer_name' => 'Customer One',
            'buyer_email' => 'cust1@garage.ph',
            'shipping_address' => 'Quezon City',
            'chassis_number' => 'DC2-100234',
            'vin' => 'JH4DC2310SS001234',
            'item_name' => 'Mugen Twin Loop Exhaust',
            'quantity' => 1,
            'unit_price' => 4000.00,
            'shipping_fee' => 0.00,
            'total_amount' => 4000.00,
            'agent_id' => $agent->id,
            'agent_code' => $agent->agent_code,
            'agent_name' => $agent->name,
            'commission_rate' => 5.00,
            'commission_amount' => 200.00, // 5% of 4000
            'commission_status' => 'pending',
            'status' => 'processing',
        ]);

        $response = $this->getJson('/api/v1/agent/stats', [
            'Authorization' => 'Bearer ' . $agent->createToken('test')->plainTextToken,
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('agent.agent_code', 'AGT-MIA')
            ->assertJsonPath('agent.is_active', true)
            ->assertJsonPath('performance.total_orders', 1)
            ->assertJsonPath('performance.total_sales_volume', 4000)
            ->assertJsonPath('performance.total_commission', 200)
            ->assertJsonPath('performance.pending_commission', 200)
            ->assertJsonCount(1, 'recent_orders');
    }
}
