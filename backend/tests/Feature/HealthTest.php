<?php

namespace Tests\Feature;

use Tests\TestCase;

class HealthTest extends TestCase
{
    public function test_health_endpoint_responds(): void
    {
        $response = $this->getJson('/api/v1/health');

        // In testing env DB/Cache/Queue are sqlite/array/sync so all should be ok.
        $response->assertOk()
            ->assertJsonPath('status', 'ok')
            ->assertJsonPath('checks.api', 'ok')
            ->assertJsonPath('checks.database', 'ok')
            ->assertJsonPath('checks.cache', 'ok')
            ->assertJsonPath('checks.queue', 'ok')
            ->assertJsonStructure([
                'status',
                'service',
                'version',
                'timestamp',
                'execution_ms',
                'checks' => ['api', 'database', 'cache', 'queue'],
                'telemetry' => ['database_ms', 'cache_ms', 'queue_ms'],
            ]);
    }
}
