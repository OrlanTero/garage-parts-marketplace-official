<?php

namespace Tests\Feature;

use Tests\TestCase;

class HealthTest extends TestCase
{
    public function test_health_endpoint_responds(): void
    {
        $response = $this->getJson('/api/v1/health');

        // In testing env DB/Cache/Queue are sqlite/array/sync so all should be ok.
        $response->assertOk()->assertJsonPath('checks.api', 'ok');
    }
}
