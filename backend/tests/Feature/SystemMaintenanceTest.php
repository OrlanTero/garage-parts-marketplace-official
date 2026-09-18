<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SystemMaintenanceTest extends TestCase
{
    use RefreshDatabase;

    public function test_unauthorized_request_is_rejected(): void
    {
        $response = $this->postJson('/api/v1/system/migrate');
        $response->assertStatus(401)
            ->assertJson([
                'status' => 'error',
            ]);
    }

    public function test_authorized_via_app_key_header(): void
    {
        $appKey = config('app.key');

        $response = $this->withHeaders([
            'X-App-Key' => $appKey,
        ])->getJson('/api/v1/system/migrate-status');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'status',
                'command',
                'exit_code',
                'output',
                'database',
            ]);
    }

    public function test_authorized_via_maintenance_token_header(): void
    {
        config(['app.maintenance_token' => 'secret-test-token']);
        putenv('MAINTENANCE_TOKEN=secret-test-token');
        $_ENV['MAINTENANCE_TOKEN'] = 'secret-test-token';

        $response = $this->withHeaders([
            'X-Maintenance-Token' => 'secret-test-token',
        ])->postJson('/api/v1/system/migrate');

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'command' => 'migrate --force',
                'exit_code' => 0,
            ]);
    }

    public function test_authorized_as_authenticated_admin(): void
    {
        $admin = User::factory()->create([
            'role' => 'admin',
        ]);

        $token = $admin->createToken('admin-token')->plainTextToken;

        $response = $this->withHeaders([
            'Authorization' => "Bearer {$token}",
        ])->postJson('/api/v1/system/seed');

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'command' => 'db:seed --force',
                'exit_code' => 0,
            ]);
    }

    public function test_non_admin_user_is_rejected(): void
    {
        $buyer = User::factory()->create([
            'role' => 'buyer',
        ]);

        $token = $buyer->createToken('buyer-token')->plainTextToken;

        $response = $this->withHeaders([
            'Authorization' => "Bearer {$token}",
        ])->postJson('/api/v1/system/migrate');

        $response->assertStatus(401);
    }
}
