<?php

namespace Tests\Feature;

use Tests\TestCase;

class CorsTest extends TestCase
{
    public function test_cors_allows_vercel_production_origin(): void
    {
        $response = $this->withHeaders([
            'Origin' => 'https://garage-parts-marketplace-official.vercel.app',
        ])->getJson('/api/v1/marketplace/parts');

        $response->assertHeader('Access-Control-Allow-Origin', 'https://garage-parts-marketplace-official.vercel.app');
        $response->assertHeader('Access-Control-Allow-Credentials', 'true');
    }

    public function test_cors_allows_vercel_preview_subdomain_pattern(): void
    {
        $response = $this->withHeaders([
            'Origin' => 'https://garage-parts-preview-123.vercel.app',
        ])->getJson('/api/v1/marketplace/cars');

        $response->assertHeader('Access-Control-Allow-Origin', 'https://garage-parts-preview-123.vercel.app');
    }

    public function test_cors_handles_options_preflight_request(): void
    {
        $response = $this->withHeaders([
            'Origin' => 'https://garage-parts-marketplace-official.vercel.app',
            'Access-Control-Request-Method' => 'GET',
            'Access-Control-Request-Headers' => 'Authorization, Content-Type, Accept',
        ])->options('/api/v1/marketplace/parts');

        $response->assertHeader('Access-Control-Allow-Origin', 'https://garage-parts-marketplace-official.vercel.app');
        $response->assertHeader('Access-Control-Allow-Credentials', 'true');
        $response->assertHeader('Access-Control-Allow-Methods', 'GET');
    }
}
