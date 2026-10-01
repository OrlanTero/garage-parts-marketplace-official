<?php

namespace Tests\Feature;

use App\Models\PlatformSetting;
use App\Models\PlatformTransaction;
use App\Models\User;
use App\Services\AgentService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AgentSubscriptionTest extends TestCase
{
    use RefreshDatabase;

    public function test_register_captures_referral_code(): void
    {
        $referrer = User::factory()->kycVerified()->create(['agent_code' => 'AGT-REF1']);
        AgentService::subscribe($referrer, 'gcash', 'REF-SUB');

        $response = $this->postJson('/api/v1/auth/register', [
            'name' => 'New Recruit',
            'email' => 'recruit@garage.ph',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role' => 'buyer',
            'referral_code' => 'AGT-REF1',
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('users', [
            'email' => 'recruit@garage.ph',
            'referred_by_user_id' => $referrer->id,
        ]);
    }

    public function test_subscribe_requires_verified_kyc(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('test')->plainTextToken;

        $response = $this->postJson('/api/v1/agent/subscribe', [
            'payment_method' => 'gcash',
            'payment_reference' => 'GCASH-123',
        ], ['Authorization' => 'Bearer ' . $token]);

        $response->assertStatus(422);
    }

    public function test_subscribe_activates_agent_for_configured_fee(): void
    {
        PlatformSetting::set('agent_subscription_fee', '100', 'variables');

        $user = User::factory()->kycVerified()->create();
        $token = $user->createToken('test')->plainTextToken;

        $response = $this->postJson('/api/v1/agent/subscribe', [
            'payment_method' => 'gcash',
            'payment_reference' => 'GCASH-AGENT-1',
        ], ['Authorization' => 'Bearer ' . $token]);

        $response->assertStatus(201)
            ->assertJsonPath('subscription.amount', 100)
            ->assertJsonPath('agent.is_active', true);

        $this->assertDatabaseHas('agent_subscriptions', [
            'user_id' => $user->id,
            'amount' => 100,
            'status' => 'active',
        ]);
        $this->assertDatabaseHas('platform_transactions', [
            'stream_type' => 'agent_subscription',
            'user_id' => $user->id,
        ]);
    }

    public function test_subscription_fee_is_credited_to_garage_revenue(): void
    {
        PlatformSetting::set('agent_subscription_fee', '100', 'variables');

        $house = User::factory()->create([
            'username' => User::HOUSE_USERNAME,
            'email' => User::HOUSE_EMAIL,
        ]);
        $user = User::factory()->kycVerified()->create();
        $token = $user->createToken('test')->plainTextToken;

        $this->postJson('/api/v1/agent/subscribe', [
            'payment_method' => 'gcash',
            'payment_reference' => 'GCASH-GARAGE-1',
            'mock_account_name' => 'Juan Dela Cruz',
            'mock_account_number' => '09170000001',
        ], ['Authorization' => 'Bearer ' . $token])->assertStatus(201);

        // Fee lands in garage (house) treasury ledger…
        $this->assertDatabaseHas('platform_transactions', [
            'stream_type' => 'agent_subscription',
            'user_id' => $user->id,
            'seller_id' => $house->id,
        ]);

        // …and surfaces in the admin funds overview / report.
        $admin = User::factory()->create(['role' => 'admin']);
        $this->getJson('/api/v1/admin/funds/overview', [
            'Authorization' => 'Bearer ' . $admin->createToken('test')->plainTextToken,
        ])->assertOk()
            ->assertJsonPath('data.wallet.agent_subscriptions_total', 100)
            ->assertJsonPath('data.wallet.agent_subscriptions_count', 1);
    }

    public function test_referrer_gets_wallet_reward_when_recruit_becomes_agent(): void
    {
        PlatformSetting::set('agent_subscription_fee', '100', 'variables');
        PlatformSetting::set('agent_referral_reward', '50', 'variables');

        $referrer = User::factory()->kycVerified()->create(['agent_code' => 'AGT-BOSS']);
        AgentService::subscribe($referrer, 'gcash', 'BOSS-SUB');

        // Recruit signs up with referrer code, then completes KYC + fee.
        $recruit = User::factory()->create([
            'referred_by_user_id' => $referrer->id,
            'kyc_status' => 'approved',
            'is_kyc_verified' => true,
        ]);

        AgentService::subscribe($recruit, 'gcash', 'RECRUIT-SUB');

        $this->assertDatabaseHas('platform_transactions', [
            'stream_type' => 'agent_referral_reward',
            'user_id' => $referrer->id,
            'net_amount' => 50,
        ]);

        // Reward is idempotent — second activation attempt pays nothing extra.
        AgentService::maybeRewardReferrer($recruit->refresh());
        $this->assertEquals(1, PlatformTransaction::where('stream_type', 'agent_referral_reward')
            ->where('user_id', $referrer->id)->count());
    }

    public function test_referrer_reward_uses_parameterized_amount(): void
    {
        PlatformSetting::set('agent_referral_reward', '75', 'variables');

        $referrer = User::factory()->kycVerified()->create(['agent_code' => 'AGT-PARAM']);
        AgentService::subscribe($referrer, 'gcash', 'PARAM-SUB');

        $recruit = User::factory()->create([
            'referred_by_user_id' => $referrer->id,
            'kyc_status' => 'approved',
            'is_kyc_verified' => true,
        ]);
        AgentService::subscribe($recruit, 'gcash', 'PARAM-RECRUIT');

        $this->assertDatabaseHas('platform_transactions', [
            'stream_type' => 'agent_referral_reward',
            'user_id' => $referrer->id,
            'net_amount' => 75,
        ]);
    }

    public function test_no_reward_when_recruit_never_pays_fee(): void
    {
        $referrer = User::factory()->kycVerified()->create(['agent_code' => 'AGT-NOPAY']);
        AgentService::subscribe($referrer, 'gcash', 'NOPAY-SUB');

        User::factory()->kycVerified()->create(['referred_by_user_id' => $referrer->id]);

        $this->assertEquals(0, PlatformTransaction::where('stream_type', 'agent_referral_reward')
            ->where('user_id', $referrer->id)->count());
    }
}
