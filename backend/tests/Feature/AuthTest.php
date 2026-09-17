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

        $buyerToken = $buyer->createToken('t')->plainTextToken;
        $sellerToken = $seller->createToken('t')->plainTextToken;

        $this->getJson('/api/v1/_session/ping-seller', ['Authorization' => "Bearer {$buyerToken}"])
            ->assertForbidden();
        $this->getJson('/api/v1/_session/ping-seller', ['Authorization' => "Bearer {$sellerToken}"])
            ->assertOk();
        $this->getJson('/api/v1/_session/ping-buyer')->assertUnauthorized();
    }

    public function test_unsupported_oauth_provider_rejected(): void
    {
        // whereIn constraint → 404 for unknown providers.
        $this->getJson('/api/v1/auth/oauth/apple/redirect')->assertNotFound();
    }
}
