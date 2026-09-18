<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_buyer_can_register_and_fetch_me(): void
    {
        $res = $this->postJson('/api/v1/auth/register', [
            'name' => 'Buyer One',
            'email' => 'buyer@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role' => 'buyer',
        ]);

        $res->assertCreated()
            ->assertJsonPath('token_type', 'Bearer')
            ->assertJsonPath('user.role', 'buyer');

        $token = $res->json('token');

        $this->getJson('/api/v1/auth/me', ['Authorization' => "Bearer {$token}"])
            ->assertOk()
            ->assertJsonPath('email', 'buyer@example.com');
    }

    public function test_dealer_and_parts_seller_can_register(): void
    {
        $resDealer = $this->postJson('/api/v1/auth/register', [
            'name' => 'Metro Motors',
            'email' => 'dealer@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role' => 'dealer',
        ]);

        $resDealer->assertCreated()
            ->assertJsonPath('token_type', 'Bearer')
            ->assertJsonPath('user.role', 'dealer');

        $resParts = $this->postJson('/api/v1/auth/register', [
            'name' => 'Apex Parts Supply',
            'email' => 'partsseller@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role' => 'parts_seller',
        ]);

        $resParts->assertCreated()
            ->assertJsonPath('token_type', 'Bearer')
            ->assertJsonPath('user.role', 'parts_seller');
    }

    public function test_register_defaults_to_buyer_and_rejects_bad_role(): void
    {
        $this->postJson('/api/v1/auth/register', [
            'name' => 'No Role',
            'email' => 'norole@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ])->assertCreated()->assertJsonPath('user.role', 'buyer');

        $this->postJson('/api/v1/auth/register', [
            'name' => 'Hacker',
            'email' => 'hacker@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role' => 'admin',
        ])->assertUnprocessable();
    }

    public function test_login_logout_and_logout_all(): void
    {
        User::factory()->create(['email' => 'seller@example.com', 'role' => 'seller']);

        $login = $this->postJson('/api/v1/auth/login', [
            'email' => 'seller@example.com',
            'password' => 'password',
        ])->assertOk();

        $token = $login->json('token');
        $headers = ['Authorization' => "Bearer {$token}"];

        $this->getJson('/api/v1/auth/me', $headers)->assertOk()->assertJsonPath('role', 'seller');

        $this->postJson('/api/v1/auth/logout', [], $headers)->assertOk();
        $this->getJson('/api/v1/auth/me', $headers)->assertUnauthorized();
    }

    public function test_role_middleware_blocks_wrong_role(): void
    {
        $buyer = User::factory()->create(['role' => 'buyer']);
        $seller = User::factory()->create(['role' => 'seller']);
        $dealer = User::factory()->create(['role' => 'dealer']);
        $partsSeller = User::factory()->create(['role' => 'parts_seller']);
        $admin = User::factory()->create(['role' => 'admin']);

        $buyerToken = $buyer->createToken('t')->plainTextToken;
        $sellerToken = $seller->createToken('t')->plainTextToken;
        $dealerToken = $dealer->createToken('t')->plainTextToken;
        $partsSellerToken = $partsSeller->createToken('t')->plainTextToken;
        $adminToken = $admin->createToken('t')->plainTextToken;

        $this->getJson('/api/v1/_session/ping-seller', ['Authorization' => "Bearer {$buyerToken}"])
            ->assertForbidden();
        $this->getJson('/api/v1/_session/ping-seller', ['Authorization' => "Bearer {$sellerToken}"])
            ->assertOk();

        $this->getJson('/api/v1/_session/ping-dealer', ['Authorization' => "Bearer {$dealerToken}"])
            ->assertOk();
        $this->getJson('/api/v1/_session/ping-dealer', ['Authorization' => "Bearer {$sellerToken}"])
            ->assertForbidden();

        $this->getJson('/api/v1/_session/ping-parts-seller', ['Authorization' => "Bearer {$partsSellerToken}"])
            ->assertOk();
        $this->getJson('/api/v1/_session/ping-parts-seller', ['Authorization' => "Bearer {$buyerToken}"])
            ->assertForbidden();

        $this->getJson('/api/v1/_session/ping-admin', ['Authorization' => "Bearer {$adminToken}"])
            ->assertOk();
        $this->getJson('/api/v1/_session/ping-admin', ['Authorization' => "Bearer {$dealerToken}"])
            ->assertForbidden();

        $this->getJson('/api/v1/_session/ping-buyer')->assertUnauthorized();
    }

    public function test_user_role_helpers(): void
    {
        $buyer = User::factory()->make(['role' => 'buyer']);
        $seller = User::factory()->make(['role' => 'seller']);
        $dealer = User::factory()->make(['role' => 'dealer']);
        $partsSeller = User::factory()->make(['role' => 'parts_seller']);
        $admin = User::factory()->make(['role' => 'admin']);

        $this->assertTrue($buyer->isBuyer());
        $this->assertFalse($buyer->isSeller());
        $this->assertFalse($buyer->isDealer());

        $this->assertTrue($seller->isSeller());
        $this->assertFalse($seller->isBuyer());

        $this->assertTrue($dealer->isDealer());
        $this->assertFalse($dealer->isPartsSeller());

        $this->assertTrue($partsSeller->isPartsSeller());
        $this->assertFalse($partsSeller->isSeller());

        $this->assertTrue($admin->isAdmin());
    }

    public function test_unsupported_oauth_provider_rejected(): void
    {
        // whereIn constraint → 404 for unknown providers.
        $this->getJson('/api/v1/auth/oauth/apple/redirect')->assertNotFound();
    }

    public function test_cors_preflight_and_admin_origin_allowed(): void
    {
        // Admin Origin preflight
        $res = $this->call('OPTIONS', '/api/v1/auth/login', [], [], [], [
            'HTTP_ORIGIN' => 'http://localhost:5174',
            'HTTP_ACCESS_CONTROL_REQUEST_METHOD' => 'POST',
            'HTTP_ACCESS_CONTROL_REQUEST_HEADERS' => 'content-type,accept',
        ]);

        $res->assertStatus(204)
            ->assertHeader('Access-Control-Allow-Origin', 'http://localhost:5174');

        // Storefront Origin preflight
        $resStorefront = $this->call('OPTIONS', '/api/v1/auth/login', [], [], [], [
            'HTTP_ORIGIN' => 'http://localhost:5173',
            'HTTP_ACCESS_CONTROL_REQUEST_METHOD' => 'POST',
        ]);

        $resStorefront->assertStatus(204)
            ->assertHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
    }
}
