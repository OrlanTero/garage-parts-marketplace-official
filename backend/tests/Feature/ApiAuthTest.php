<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ApiAuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_unauthenticated_api_requests_return_json_401_not_login_redirect(): void
    {
        // Regression: used to fatal with "Route [login] not defined" (500)
        // because no web login route exists.
        $this->getJson('/api/v1/admin/funds/report?format=csv')
            ->assertStatus(401)
            ->assertJsonPath('message', 'Unauthenticated.');

        $this->getJson('/api/v1/notifications')
            ->assertStatus(401)
            ->assertJsonPath('message', 'Unauthenticated.');
    }

    public function test_browser_like_request_without_json_accept_still_gets_401(): void
    {
        // A plain browser tab / curl sends Accept: text/html. The API must
        // still answer JSON 401 — never redirect to a missing login route.
        $this->get('/api/v1/admin/funds/report?format=csv', ['Accept' => 'text/html'])
            ->assertStatus(401)
            ->assertJsonPath('message', 'Unauthenticated.');
    }

    public function test_authenticated_admin_can_download_csv_report(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $res = $this->get(
            '/api/v1/admin/funds/report?format=csv',
            ['Authorization' => 'Bearer ' . $admin->createToken('t')->plainTextToken, 'Accept' => 'text/csv'],
        );

        $res->assertOk();
        $this->assertStringContainsString('text/csv', $res->headers->get('Content-Type'));
        $this->assertStringContainsString('Transaction Number', $res->streamedContent());
    }
}
