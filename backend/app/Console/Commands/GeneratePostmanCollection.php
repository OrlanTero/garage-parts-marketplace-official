<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

class GeneratePostmanCollection extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'postman:generate {--output= : Path to output the postman collection JSON file}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Generates or updates the complete Postman Collection v2.1.0 JSON file for Garage Parts Marketplace API';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info('Generating Postman Collection for Garage Parts Marketplace API...');

        $outputPath = $this->option('output') ?: base_path('../docs/postman/garage-parts-session.postman_collection.json');

        $collection = [
            'info' => [
                'name' => 'Garage Parts — Full Marketplace & Realtime API Collection',
                '_postman_id' => 'garage-parts-marketplace-v1',
                'description' => "Comprehensive Postman collection for Garage Parts Marketplace API.\n\n### Included Modules & Workflows:\n1. **System & Health Probes**: Health check, database/cache/queue probes, Laravel uptime, CSRF cookie initialization.\n2. **Authentication & Session**: Registration (Buyer, Seller, Dealer, Parts Seller), Multi-role Login, Profile (`/auth/me`), Role-specific probes (`buyer`, `seller`, `dealer`, `parts_seller`, `admin`), OAuth redirect/callback, Single & All-device logout.\n3. **Cars Marketplace & Seller Inventory**: Public listings with filters/search/pagination, Car detail, Seller Car creation, media array uploads, update, publish, unpublish, and mark-sold transitions.\n4. **Parts & Accessories Marketplace & Inventory**: Public parts catalog with category/condition/price filters, Part detail, Seller Part creation, media uploads, update, publish, unpublish, and mark-sold.\n5. **Real-time WebSockets & Broadcasting (Laravel Reverb)**: Channel authorization (`/api/v1/broadcasting/auth`) for `private-user.{id}`, `private-seller.{id}`, and `presence-marketplace` channels.\n6. **Nginx FastCGI Edge Performance & Caching**: Cache hit/miss/bypass validation probes.\n\n### Automatic Variable Sync:\n- Authentication requests automatically capture the Bearer `{{token}}` and `{{userId}}`.\n- Creating a car or part automatically captures `{{carId}}` and `{{partId}}` for downstream tests.",
                'schema' => 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
            ],
            'variable' => [
                ['key' => 'baseUrl', 'value' => 'http://localhost:8000', 'type' => 'string'],
                ['key' => 'token', 'value' => '', 'type' => 'string'],
                ['key' => 'userId', 'value' => '1', 'type' => 'string'],
                ['key' => 'carId', 'value' => '1', 'type' => 'string'],
                ['key' => 'partId', 'value' => '1', 'type' => 'string'],
                ['key' => 'mediaId', 'value' => '1', 'type' => 'string'],
                ['key' => 'socketId', 'value' => '1234.5678', 'type' => 'string'],
                ['key' => 'oauthProvider', 'value' => 'google', 'type' => 'string'],
                ['key' => 'reverbHost', 'value' => '127.0.0.1', 'type' => 'string'],
                ['key' => 'reverbPort', 'value' => '8080', 'type' => 'string'],
                ['key' => 'reverbAppKey', 'value' => 'local-key', 'type' => 'string'],
                ['key' => 'appKey', 'value' => 'base64:sM5Th/eioZw9bH6Hj6gsMw4ooLgjauK4bC1/9lpQr6E=', 'type' => 'string'],
                ['key' => 'maintenanceToken', 'value' => '', 'type' => 'string'],
            ],
            'auth' => [
                'type' => 'bearer',
                'bearer' => [
                    ['key' => 'token', 'value' => '{{token}}', 'type' => 'string'],
                ],
            ],
            'item' => [
                $this->systemAndHealthFolder(),
                $this->authAndSessionFolder(),
                $this->mediaUploadsFolder(),
                $this->favoritesFolder(),
                $this->carsMarketplaceFolder(),
                $this->sellerCarsFolder(),
                $this->partsMarketplaceFolder(),
                $this->sellerPartsFolder(),
                $this->broadcastingFolder(),
                $this->nginxCachingFolder(),
            ],
        ];

        $jsonOutput = json_encode($collection, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

        $directory = dirname($outputPath);
        if (!File::isDirectory($directory)) {
            File::makeDirectory($directory, 0755, true, true);
        }

        File::put($outputPath, $jsonOutput);

        $this->info("✓ Postman Collection successfully generated and written to: {$outputPath}");
        $this->info('  Total folders: ' . count($collection['item']));

        return Command::SUCCESS;
    }

    private function testStatus200(string $extra = ''): array
    {
        $lines = [
            'pm.test("Status code is 200", function () {',
            '    pm.response.to.have.status(200);',
            '});',
        ];
        if ($extra) {
            $lines[] = $extra;
        }

        return [
            'listen' => 'test',
            'script' => [
                'exec' => $lines,
                'type' => 'text/javascript',
            ],
        ];
    }

    private function testStatus201(string $extra = ''): array
    {
        $lines = [
            'pm.test("Status code is 201 Created", function () {',
            '    pm.response.to.have.status(201);',
            '});',
        ];
        if ($extra) {
            $lines[] = $extra;
        }

        return [
            'listen' => 'test',
            'script' => [
                'exec' => $lines,
                'type' => 'text/javascript',
            ],
        ];
    }

    private function systemAndHealthFolder(): array
    {
        return [
            'name' => '1. System & Health Probes',
            'item' => [
                [
                    'name' => 'GET API Health Check',
                    'event' => [$this->testStatus200('pm.test("Healthy services", function () { const d = pm.response.json(); pm.expect(d.checks.database).to.eql("ok"); });')],
                    'request' => [
                        'auth' => ['type' => 'noauth'],
                        'method' => 'GET',
                        'header' => [['key' => 'Accept', 'value' => 'application/json']],
                        'url' => ['raw' => '{{baseUrl}}/api/v1/health', 'host' => ['{{baseUrl}}'], 'path' => ['api', 'v1', 'health']],
                        'description' => 'Returns health probe status of database, Redis/cache, and queues.',
                    ],
                ],
                [
                    'name' => 'GET Laravel /up Probe',
                    'event' => [$this->testStatus200()],
                    'request' => [
                        'auth' => ['type' => 'noauth'],
                        'method' => 'GET',
                        'header' => [],
                        'url' => ['raw' => '{{baseUrl}}/up', 'host' => ['{{baseUrl}}'], 'path' => ['up']],
                        'description' => 'Laravel framework base uptime ping probe.',
                    ],
                ],
                [
                    'name' => 'GET Root Welcome / Info',
                    'event' => [$this->testStatus200()],
                    'request' => [
                        'auth' => ['type' => 'noauth'],
                        'method' => 'GET',
                        'header' => [['key' => 'Accept', 'value' => 'application/json']],
                        'url' => ['raw' => '{{baseUrl}}/', 'host' => ['{{baseUrl}}'], 'path' => ['']],
                        'description' => 'Root endpoint welcome response and API version notice.',
                    ],
                ],
                [
                    'name' => 'GET Sanctum CSRF Cookie',
                    'event' => [[
                        'listen' => 'test',
                        'script' => [
                            'exec' => [
                                'pm.test("Status code is 204 or 200", function () {',
                                '    pm.expect([200, 204]).to.include(pm.response.code);',
                                '});',
                            ],
                            'type' => 'text/javascript',
                        ],
                    ]],
                    'request' => [
                        'auth' => ['type' => 'noauth'],
                        'method' => 'GET',
                        'header' => [['key' => 'Accept', 'value' => 'application/json']],
                        'url' => ['raw' => '{{baseUrl}}/sanctum/csrf-cookie', 'host' => ['{{baseUrl}}'], 'path' => ['sanctum', 'csrf-cookie']],
                        'description' => 'Initializes CSRF cookies for SPA cookie-based session authorization.',
                    ],
                ],
                [
                    'name' => 'GET Remote Migration Status',
                    'event' => [$this->testStatus200('pm.test("Migration status output present", function () { const d = pm.response.json(); pm.expect(d.status).to.eql("success"); });')],
                    'request' => [
                        'auth' => ['type' => 'noauth'],
                        'method' => 'GET',
                        'header' => [
                            ['key' => 'Accept', 'value' => 'application/json'],
                            ['key' => 'X-App-Key', 'value' => '{{appKey}}'],
                        ],
                        'url' => ['raw' => '{{baseUrl}}/api/v1/system/migrate-status', 'host' => ['{{baseUrl}}'], 'path' => ['api', 'v1', 'system', 'migrate-status']],
                        'description' => 'Checks database migration status (php artisan migrate:status) on remote deployment.',
                    ],
                ],
                [
                    'name' => 'POST Run Remote Migrations',
                    'event' => [$this->testStatus200('pm.test("Migration completed", function () { const d = pm.response.json(); pm.expect(d.status).to.eql("success"); });')],
                    'request' => [
                        'auth' => ['type' => 'noauth'],
                        'method' => 'POST',
                        'header' => [
                            ['key' => 'Accept', 'value' => 'application/json'],
                            ['key' => 'X-App-Key', 'value' => '{{appKey}}'],
                        ],
                        'url' => ['raw' => '{{baseUrl}}/api/v1/system/migrate', 'host' => ['{{baseUrl}}'], 'path' => ['api', 'v1', 'system', 'migrate']],
                        'description' => 'Executes database migrations (php artisan migrate --force) on remote deployment.',
                    ],
                ],
                [
                    'name' => 'POST Run Remote Seeders',
                    'event' => [$this->testStatus200('pm.test("Seeding completed", function () { const d = pm.response.json(); pm.expect(d.status).to.eql("success"); });')],
                    'request' => [
                        'auth' => ['type' => 'noauth'],
                        'method' => 'POST',
                        'header' => [
                            ['key' => 'Accept', 'value' => 'application/json'],
                            ['key' => 'X-App-Key', 'value' => '{{appKey}}'],
                        ],
                        'url' => ['raw' => '{{baseUrl}}/api/v1/system/seed', 'host' => ['{{baseUrl}}'], 'path' => ['api', 'v1', 'system', 'seed']],
                        'description' => 'Executes database seeders (php artisan db:seed --force) on remote deployment.',
                    ],
                ],
                [
                    'name' => 'POST Run Remote Migrate & Seed',
                    'event' => [$this->testStatus200('pm.test("Migrate & Seed completed", function () { const d = pm.response.json(); pm.expect(d.status).to.eql("success"); });')],
                    'request' => [
                        'auth' => ['type' => 'noauth'],
                        'method' => 'POST',
                        'header' => [
                            ['key' => 'Accept', 'value' => 'application/json'],
                            ['key' => 'X-App-Key', 'value' => '{{appKey}}'],
                        ],
                        'url' => ['raw' => '{{baseUrl}}/api/v1/system/migrate-seed', 'host' => ['{{baseUrl}}'], 'path' => ['api', 'v1', 'system', 'migrate-seed']],
                        'description' => 'Executes both database migrations and seeders together on remote deployment.',
                    ],
                ],
            ],
        ];
    }

    private function authAndSessionFolder(): array
    {
        $saveTokenScript = [
            'listen' => 'test',
            'script' => [
                'exec' => [
                    'pm.test("Successful authentication", function () {',
                    '    pm.expect([200, 201]).to.include(pm.response.code);',
                    '    const jsonData = pm.response.json();',
                    '    if (jsonData.token) {',
                    '        pm.collectionVariables.set("token", jsonData.token);',
                    '    }',
                    '    if (jsonData.user && jsonData.user.id) {',
                    '        pm.collectionVariables.set("userId", String(jsonData.user.id));',
                    '    }',
                    '});',
                ],
                'type' => 'text/javascript',
            ],
        ];

        return [
            'name' => '2. Authentication & Session',
            'item' => [
                [
                    'name' => 'POST Register (Buyer)',
                    'event' => [$saveTokenScript],
                    'request' => [
                        'auth' => ['type' => 'noauth'],
                        'method' => 'POST',
                        'header' => [
                            ['key' => 'Accept', 'value' => 'application/json'],
                            ['key' => 'Content-Type', 'value' => 'application/json'],
                        ],
                        'body' => [
                            'mode' => 'raw',
                            'raw' => json_encode([
                                'name' => 'Enthusiast Buyer',
                                'email' => 'buyer.test.' . time() . '@garagemarket.ph',
                                'password' => 'password',
                                'password_confirmation' => 'password',
                                'role' => 'buyer',
                            ], JSON_PRETTY_PRINT),
                        ],
                        'url' => ['raw' => '{{baseUrl}}/api/v1/auth/register', 'host' => ['{{baseUrl}}'], 'path' => ['api', 'v1', 'auth', 'register']],
                        'description' => 'Registers a new Buyer account with Sanctum Bearer token generation.',
                    ],
                ],
                [
                    'name' => 'POST Register (Seller)',
                    'event' => [$saveTokenScript],
                    'request' => [
                        'auth' => ['type' => 'noauth'],
                        'method' => 'POST',
                        'header' => [
                            ['key' => 'Accept', 'value' => 'application/json'],
                            ['key' => 'Content-Type', 'value' => 'application/json'],
                        ],
                        'body' => [
                            'mode' => 'raw',
                            'raw' => json_encode([
                                'name' => 'Private Car Seller',
                                'email' => 'seller.test.' . time() . '@garagemarket.ph',
                                'password' => 'password',
                                'password_confirmation' => 'password',
                                'role' => 'seller',
                            ], JSON_PRETTY_PRINT),
                        ],
                        'url' => ['raw' => '{{baseUrl}}/api/v1/auth/register', 'host' => ['{{baseUrl}}'], 'path' => ['api', 'v1', 'auth', 'register']],
                        'description' => 'Registers an individual Seller account with inventory access.',
                    ],
                ],
                [
                    'name' => 'POST Register (Dealer)',
                    'event' => [$saveTokenScript],
                    'request' => [
                        'auth' => ['type' => 'noauth'],
                        'method' => 'POST',
                        'header' => [
                            ['key' => 'Accept', 'value' => 'application/json'],
                            ['key' => 'Content-Type', 'value' => 'application/json'],
                        ],
                        'body' => [
                            'mode' => 'raw',
                            'raw' => json_encode([
                                'name' => 'Metro Premier Auto Mall',
                                'email' => 'dealer.test.' . time() . '@garagemarket.ph',
                                'password' => 'password',
                                'password_confirmation' => 'password',
                                'role' => 'dealer',
                            ], JSON_PRETTY_PRINT),
                        ],
                        'url' => ['raw' => '{{baseUrl}}/api/v1/auth/register', 'host' => ['{{baseUrl}}'], 'path' => ['api', 'v1', 'auth', 'register']],
                        'description' => 'Registers a commercial Dealership account.',
                    ],
                ],
                [
                    'name' => 'POST Register (Parts Seller)',
                    'event' => [$saveTokenScript],
                    'request' => [
                        'auth' => ['type' => 'noauth'],
                        'method' => 'POST',
                        'header' => [
                            ['key' => 'Accept', 'value' => 'application/json'],
                            ['key' => 'Content-Type', 'value' => 'application/json'],
                        ],
                        'body' => [
                            'mode' => 'raw',
                            'raw' => json_encode([
                                'name' => 'Apex Performance Parts Supply',
                                'email' => 'parts.test.' . time() . '@garagemarket.ph',
                                'password' => 'password',
                                'password_confirmation' => 'password',
                                'role' => 'parts_seller',
                            ], JSON_PRETTY_PRINT),
                        ],
                        'url' => ['raw' => '{{baseUrl}}/api/v1/auth/register', 'host' => ['{{baseUrl}}'], 'path' => ['api', 'v1', 'auth', 'register']],
                        'description' => 'Registers an automotive Parts & Accessories merchant account.',
                    ],
                ],
                [
                    'name' => 'POST Login (Seller Seed Account)',
                    'event' => [$saveTokenScript],
                    'request' => [
                        'auth' => ['type' => 'noauth'],
                        'method' => 'POST',
                        'header' => [
                            ['key' => 'Accept', 'value' => 'application/json'],
                            ['key' => 'Content-Type', 'value' => 'application/json'],
                        ],
                        'body' => [
                            'mode' => 'raw',
                            'raw' => json_encode([
                                'email' => 'seller@garagemarket.ph',
                                'password' => 'password',
                                'device_name' => 'Postman Test Client',
                            ], JSON_PRETTY_PRINT),
                        ],
                        'url' => ['raw' => '{{baseUrl}}/api/v1/auth/login', 'host' => ['{{baseUrl}}'], 'path' => ['api', 'v1', 'auth', 'login']],
                        'description' => 'Logs in as seed Seller (Makati Showroom & HQ). Sets {{token}} and {{userId}}.',
                    ],
                ],
                [
                    'name' => 'POST Login (Dealer Seed Account)',
                    'event' => [$saveTokenScript],
                    'request' => [
                        'auth' => ['type' => 'noauth'],
                        'method' => 'POST',
                        'header' => [
                            ['key' => 'Accept', 'value' => 'application/json'],
                            ['key' => 'Content-Type', 'value' => 'application/json'],
                        ],
                        'body' => [
                            'mode' => 'raw',
                            'raw' => json_encode([
                                'email' => 'dealer@garagemarket.ph',
                                'password' => 'password',
                                'device_name' => 'Postman Test Client',
                            ], JSON_PRETTY_PRINT),
                        ],
                        'url' => ['raw' => '{{baseUrl}}/api/v1/auth/login', 'host' => ['{{baseUrl}}'], 'path' => ['api', 'v1', 'auth', 'login']],
                        'description' => 'Logs in as seed Dealer (Metro Premier Auto Mall). Sets {{token}} and {{userId}}.',
                    ],
                ],
                [
                    'name' => 'POST Login (Parts Seller Seed Account)',
                    'event' => [$saveTokenScript],
                    'request' => [
                        'auth' => ['type' => 'noauth'],
                        'method' => 'POST',
                        'header' => [
                            ['key' => 'Accept', 'value' => 'application/json'],
                            ['key' => 'Content-Type', 'value' => 'application/json'],
                        ],
                        'body' => [
                            'mode' => 'raw',
                            'raw' => json_encode([
                                'email' => 'partsseller@garagemarket.ph',
                                'password' => 'password',
                                'device_name' => 'Postman Test Client',
                            ], JSON_PRETTY_PRINT),
                        ],
                        'url' => ['raw' => '{{baseUrl}}/api/v1/auth/login', 'host' => ['{{baseUrl}}'], 'path' => ['api', 'v1', 'auth', 'login']],
                        'description' => 'Logs in as seed Parts Seller (Apex Performance Parts Depot). Sets {{token}} and {{userId}}.',
                    ],
                ],
                [
                    'name' => 'POST Login (Admin Seed Account)',
                    'event' => [$saveTokenScript],
                    'request' => [
                        'auth' => ['type' => 'noauth'],
                        'method' => 'POST',
                        'header' => [
                            ['key' => 'Accept', 'value' => 'application/json'],
                            ['key' => 'Content-Type', 'value' => 'application/json'],
                        ],
                        'body' => [
                            'mode' => 'raw',
                            'raw' => json_encode([
                                'email' => 'admin@garagemarket.ph',
                                'password' => 'password',
                                'device_name' => 'Postman Test Client',
                            ], JSON_PRETTY_PRINT),
                        ],
                        'url' => ['raw' => '{{baseUrl}}/api/v1/auth/login', 'host' => ['{{baseUrl}}'], 'path' => ['api', 'v1', 'auth', 'login']],
                        'description' => 'Logs in as Platform Admin. Sets {{token}} and {{userId}}.',
                    ],
                ],
                [
                    'name' => 'POST Login (Buyer Seed Account)',
                    'event' => [$saveTokenScript],
                    'request' => [
                        'auth' => ['type' => 'noauth'],
                        'method' => 'POST',
                        'header' => [
                            ['key' => 'Accept', 'value' => 'application/json'],
                            ['key' => 'Content-Type', 'value' => 'application/json'],
                        ],
                        'body' => [
                            'mode' => 'raw',
                            'raw' => json_encode([
                                'email' => 'buyer@garagemarket.ph',
                                'password' => 'password',
                                'device_name' => 'Postman Test Client',
                            ], JSON_PRETTY_PRINT),
                        ],
                        'url' => ['raw' => '{{baseUrl}}/api/v1/auth/login', 'host' => ['{{baseUrl}}'], 'path' => ['api', 'v1', 'auth', 'login']],
                        'description' => 'Logs in as seed Buyer (Anton Valenzuela). Sets {{token}} and {{userId}}.',
                    ],
                ],
                [
                    'name' => 'GET Authenticated User Profile (/auth/me)',
                    'event' => [$this->testStatus200('pm.test("Profile structure", function () { const d = pm.response.json(); pm.expect(d.id).to.be.a("number"); pm.expect(d.email).to.be.a("string"); });')],
                    'request' => [
                        'method' => 'GET',
                        'header' => [['key' => 'Accept', 'value' => 'application/json']],
                        'url' => ['raw' => '{{baseUrl}}/api/v1/auth/me', 'host' => ['{{baseUrl}}'], 'path' => ['api', 'v1', 'auth', 'me']],
                        'description' => 'Fetches the current authenticated user profile using Bearer {{token}}.',
                    ],
                ],
                [
                    'name' => 'GET Role Probe (Ping Buyer)',
                    'event' => [$this->testStatus200()],
                    'request' => [
                        'method' => 'GET',
                        'header' => [['key' => 'Accept', 'value' => 'application/json']],
                        'url' => ['raw' => '{{baseUrl}}/api/v1/_session/ping-buyer', 'host' => ['{{baseUrl}}'], 'path' => ['api', 'v1', '_session', 'ping-buyer']],
                        'description' => 'Verifies active session has buyer role authorization.',
                    ],
                ],
                [
                    'name' => 'GET Role Probe (Ping Seller)',
                    'event' => [$this->testStatus200()],
                    'request' => [
                        'method' => 'GET',
                        'header' => [['key' => 'Accept', 'value' => 'application/json']],
                        'url' => ['raw' => '{{baseUrl}}/api/v1/_session/ping-seller', 'host' => ['{{baseUrl}}'], 'path' => ['api', 'v1', '_session', 'ping-seller']],
                        'description' => 'Verifies active session has seller role authorization.',
                    ],
                ],
                [
                    'name' => 'GET Role Probe (Ping Dealer)',
                    'event' => [$this->testStatus200()],
                    'request' => [
                        'method' => 'GET',
                        'header' => [['key' => 'Accept', 'value' => 'application/json']],
                        'url' => ['raw' => '{{baseUrl}}/api/v1/_session/ping-dealer', 'host' => ['{{baseUrl}}'], 'path' => ['api', 'v1', '_session', 'ping-dealer']],
                        'description' => 'Verifies active session has dealer role authorization.',
                    ],
                ],
                [
                    'name' => 'GET Role Probe (Ping Parts Seller)',
                    'event' => [$this->testStatus200()],
                    'request' => [
                        'method' => 'GET',
                        'header' => [['key' => 'Accept', 'value' => 'application/json']],
                        'url' => ['raw' => '{{baseUrl}}/api/v1/_session/ping-parts-seller', 'host' => ['{{baseUrl}}'], 'path' => ['api', 'v1', '_session', 'ping-parts-seller']],
                        'description' => 'Verifies active session has parts_seller role authorization.',
                    ],
                ],
                [
                    'name' => 'GET Role Probe (Ping Admin)',
                    'event' => [$this->testStatus200()],
                    'request' => [
                        'method' => 'GET',
                        'header' => [['key' => 'Accept', 'value' => 'application/json']],
                        'url' => ['raw' => '{{baseUrl}}/api/v1/_session/ping-admin', 'host' => ['{{baseUrl}}'], 'path' => ['api', 'v1', '_session', 'ping-admin']],
                        'description' => 'Verifies active session has admin role authorization.',
                    ],
                ],
                [
                    'name' => 'GET OAuth Redirect URL',
                    'event' => [$this->testStatus200('pm.test("OAuth URL returned", function () { const d = pm.response.json(); pm.expect(d.url).to.be.a("string"); });')],
                    'request' => [
                        'auth' => ['type' => 'noauth'],
                        'method' => 'GET',
                        'header' => [['key' => 'Accept', 'value' => 'application/json']],
                        'url' => ['raw' => '{{baseUrl}}/api/v1/auth/oauth/{{oauthProvider}}/redirect', 'host' => ['{{baseUrl}}'], 'path' => ['api', 'v1', 'auth', 'oauth', '{{oauthProvider}}', 'redirect']],
                        'description' => 'Generates OAuth redirect URL for Google/Facebook signup/signin.',
                    ],
                ],
                [
                    'name' => 'POST Logout (Current Token)',
                    'event' => [$this->testStatus200()],
                    'request' => [
                        'method' => 'POST',
                        'header' => [['key' => 'Accept', 'value' => 'application/json']],
                        'url' => ['raw' => '{{baseUrl}}/api/v1/auth/logout', 'host' => ['{{baseUrl}}'], 'path' => ['api', 'v1', 'auth', 'logout']],
                        'description' => 'Revokes the current Sanctum token.',
                    ],
                ],
                [
                    'name' => 'POST Logout All Devices',
                    'event' => [$this->testStatus200()],
                    'request' => [
                        'method' => 'POST',
                        'header' => [['key' => 'Accept', 'value' => 'application/json']],
                        'url' => ['raw' => '{{baseUrl}}/api/v1/auth/logout-all', 'host' => ['{{baseUrl}}'], 'path' => ['api', 'v1', 'auth', 'logout-all']],
                        'description' => 'Revokes all active Sanctum tokens for the user account.',
                    ],
                ],
            ],
        ];
    }

    private function mediaUploadsFolder(): array
    {
        $saveMediaIdScript = [
            'listen' => 'test',
            'script' => [
                'exec' => [
                    'pm.test("Status is 201 Created", function () {',
                    '    pm.response.to.have.status(201);',
                    '});',
                    'const res = pm.response.json();',
                    'if (res.data && res.data.id) {',
                    '    pm.collectionVariables.set("mediaId", res.data.id);',
                    '} else if (Array.isArray(res.data) && res.data[0] && res.data[0].id) {',
                    '    pm.collectionVariables.set("mediaId", res.data[0].id);',
                    '}',
                ],
                'type' => 'text/javascript',
            ],
        ];

        return [
            'name' => '3. Media & High-Resolution File Storage',
            'item' => [
                [
                    'name' => 'POST Upload Single Media File',
                    'event' => [$saveMediaIdScript],
                    'request' => [
                        'method' => 'POST',
                        'header' => [
                            ['key' => 'Accept', 'value' => 'application/json'],
                        ],
                        'body' => [
                            'mode' => 'formdata',
                            'formdata' => [
                                ['key' => 'file', 'type' => 'file', 'src' => ''],
                                ['key' => 'type', 'value' => 'image', 'type' => 'text'],
                                ['key' => 'caption', 'value' => 'High-resolution walkaround photo', 'type' => 'text'],
                                ['key' => 'is_primary', 'value' => '1', 'type' => 'text'],
                            ],
                        ],
                        'url' => ['raw' => '{{baseUrl}}/api/v1/media/upload', 'host' => ['{{baseUrl}}'], 'path' => ['api', 'v1', 'media', 'upload']],
                        'description' => 'Uploads a single high-resolution image/document to Laravel Storage (AWS S3 ready). Sets {{mediaId}} variable.',
                    ],
                ],
                [
                    'name' => 'POST Upload Batch Multiple Media Files',
                    'event' => [$saveMediaIdScript],
                    'request' => [
                        'method' => 'POST',
                        'header' => [
                            ['key' => 'Accept', 'value' => 'application/json'],
                        ],
                        'body' => [
                            'mode' => 'formdata',
                            'formdata' => [
                                ['key' => 'files[]', 'type' => 'file', 'src' => []],
                                ['key' => 'type', 'value' => 'image', 'type' => 'text'],
                            ],
                        ],
                        'url' => ['raw' => '{{baseUrl}}/api/v1/media/upload', 'host' => ['{{baseUrl}}'], 'path' => ['api', 'v1', 'media', 'upload']],
                        'description' => 'Uploads multiple media files in batch and returns their metadata array.',
                    ],
                ],
                [
                    'name' => 'GET Single Media Details',
                    'event' => [$this->testStatus200('pm.test("Media structure", function () { const d = pm.response.json(); pm.expect(d.data.id).to.be.a("number"); pm.expect(d.data.url).to.be.a("string"); });')],
                    'request' => [
                        'method' => 'GET',
                        'header' => [['key' => 'Accept', 'value' => 'application/json']],
                        'url' => ['raw' => '{{baseUrl}}/api/v1/media/{{mediaId}}', 'host' => ['{{baseUrl}}'], 'path' => ['api', 'v1', 'media', '{{mediaId}}']],
                        'description' => 'Fetches metadata for an uploaded media file.',
                    ],
                ],
                [
                    'name' => 'DELETE Media File',
                    'event' => [$this->testStatus200()],
                    'request' => [
                        'method' => 'DELETE',
                        'header' => [['key' => 'Accept', 'value' => 'application/json']],
                        'url' => ['raw' => '{{baseUrl}}/api/v1/media/{{mediaId}}', 'host' => ['{{baseUrl}}'], 'path' => ['api', 'v1', 'media', '{{mediaId}}']],
                        'description' => 'Deletes the media record and cleans up the file from the filesystem/S3 disk.',
                    ],
                ],
            ],
        ];
    }

    private function carsMarketplaceFolder(): array
    {
        return [
            'name' => '4. Cars Marketplace (Public)',
            'item' => [
                [
                    'name' => 'GET List Public Cars',
                    'event' => [$this->testStatus200('pm.test("Cars list", function () { const d = pm.response.json(); pm.expect(d.data).to.be.an("array"); });')],
                    'request' => [
                        'auth' => ['type' => 'noauth'],
                        'method' => 'GET',
                        'header' => [['key' => 'Accept', 'value' => 'application/json']],
                        'url' => [
                            'raw' => '{{baseUrl}}/api/v1/marketplace/cars?per_page=12&sort=newest',
                            'host' => ['{{baseUrl}}'],
                            'path' => ['api', 'v1', 'marketplace', 'cars'],
                            'query' => [
                                ['key' => 'per_page', 'value' => '12'],
                                ['key' => 'sort', 'value' => 'newest'],
                            ],
                        ],
                        'description' => 'Browse verified vehicle inventory with pagination and sorting.',
                    ],
                ],
                [
                    'name' => 'GET Search & Filter Cars (Make, Year, Price)',
                    'event' => [$this->testStatus200()],
                    'request' => [
                        'auth' => ['type' => 'noauth'],
                        'method' => 'GET',
                        'header' => [['key' => 'Accept', 'value' => 'application/json']],
                        'url' => [
                            'raw' => '{{baseUrl}}/api/v1/marketplace/cars?brand=Nissan&min_price=500000&max_price=2000000&body_style=coupe&transmission=manual',
                            'host' => ['{{baseUrl}}'],
                            'path' => ['api', 'v1', 'marketplace', 'cars'],
                            'query' => [
                                ['key' => 'brand', 'value' => 'Nissan'],
                                ['key' => 'min_price', 'value' => '500000'],
                                ['key' => 'max_price', 'value' => '2000000'],
                                ['key' => 'body_style', 'value' => 'coupe'],
                                ['key' => 'transmission', 'value' => 'manual'],
                            ],
                        ],
                        'description' => 'Search and filter public vehicles by make, price range, body style, and transmission.',
                    ],
                ],
                [
                    'name' => 'GET Single Car Details',
                    'event' => [$this->testStatus200('pm.test("Single car data", function () { const d = pm.response.json(); pm.expect(d.data.id).to.be.a("number"); });')],
                    'request' => [
                        'auth' => ['type' => 'noauth'],
                        'method' => 'GET',
                        'header' => [['key' => 'Accept', 'value' => 'application/json']],
                        'url' => ['raw' => '{{baseUrl}}/api/v1/marketplace/cars/{{carId}}', 'host' => ['{{baseUrl}}'], 'path' => ['api', 'v1', 'marketplace', 'cars', '{{carId}}']],
                        'description' => 'Fetches detailed vehicle specs, media photos, seller profile, and inspection score.',
                    ],
                ],
            ],
        ];
    }

    private function sellerCarsFolder(): array
    {
        $saveCarIdScript = [
            'listen' => 'test',
            'script' => [
                'exec' => [
                    'pm.test("Car created successfully", function () {',
                    '    pm.response.to.have.status(201);',
                    '    const jsonData = pm.response.json();',
                    '    if (jsonData.data && jsonData.data.id) {',
                    '        pm.collectionVariables.set("carId", String(jsonData.data.id));',
                    '    }',
                    '});',
                ],
                'type' => 'text/javascript',
            ],
        ];

        return [
            'name' => '5. Seller Cars Inventory (CRUD & Workflow)',
            'item' => [
                [
                    'name' => 'GET My Cars Inventory',
                    'event' => [$this->testStatus200()],
                    'request' => [
                        'method' => 'GET',
                        'header' => [['key' => 'Accept', 'value' => 'application/json']],
                        'url' => ['raw' => '{{baseUrl}}/api/v1/seller/cars', 'host' => ['{{baseUrl}}'], 'path' => ['api', 'v1', 'seller', 'cars']],
                        'description' => 'Returns list of cars owned by the authenticated seller/dealer.',
                    ],
                ],
                [
                    'name' => 'POST Create Car (Draft with Media)',
                    'event' => [$saveCarIdScript],
                    'request' => [
                        'method' => 'POST',
                        'header' => [
                            ['key' => 'Accept', 'value' => 'application/json'],
                            ['key' => 'Content-Type', 'value' => 'application/json'],
                        ],
                        'body' => [
                            'mode' => 'raw',
                            'raw' => json_encode([
                                'title' => '1998 Nissan Silvia S15 Spec-R Turbo',
                                'brand' => 'Nissan',
                                'model' => 'Silvia S15',
                                'year' => 1998,
                                'price' => 1350000,
                                'original_price' => 1450000,
                                'mileage_km' => 74000,
                                'body_style' => 'coupe',
                                'fuel_type' => 'petrol',
                                'transmission' => 'manual',
                                'condition' => 'used',
                                'color' => 'Pearl White',
                                'vin' => 'S15-0928174625103',
                                'tag' => 'JDM Icon · SR20DET',
                                'city' => 'Makati City',
                                'location' => 'Makati Showroom & Lift Bay',
                                'inspection_score' => '99/100',
                                'description' => 'Freshly imported and verified Nissan Silvia S15 Spec-R. Original SR20DET ball-bearing turbo, 6-speed manual with factory helical LSD.',
                                'images' => [
                                    'https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=800&auto=format&fit=crop',
                                    'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?q=80&w=800&auto=format&fit=crop',
                                ],
                            ], JSON_PRETTY_PRINT),
                        ],
                        'url' => ['raw' => '{{baseUrl}}/api/v1/seller/cars', 'host' => ['{{baseUrl}}'], 'path' => ['api', 'v1', 'seller', 'cars']],
                        'description' => 'Creates a new vehicle build listing in draft status. Sets {{carId}}.',
                    ],
                ],
                [
                    'name' => 'PUT Update Car Details',
                    'event' => [$this->testStatus200()],
                    'request' => [
                        'method' => 'PUT',
                        'header' => [
                            ['key' => 'Accept', 'value' => 'application/json'],
                            ['key' => 'Content-Type', 'value' => 'application/json'],
                        ],
                        'body' => [
                            'mode' => 'raw',
                            'raw' => json_encode([
                                'title' => '1998 Nissan Silvia S15 Spec-R Turbo (Updated Spec)',
                                'brand' => 'Nissan',
                                'model' => 'Silvia S15',
                                'year' => 1998,
                                'price' => 1320000,
                                'original_price' => 1450000,
                                'mileage_km' => 74500,
                                'body_style' => 'coupe',
                                'fuel_type' => 'petrol',
                                'transmission' => 'manual',
                                'condition' => 'used',
                                'color' => 'Pearl White',
                                'tag' => 'Price Drop · SR20DET',
                                'city' => 'Makati City',
                                'location' => 'Makati Showroom Floor',
                            ], JSON_PRETTY_PRINT),
                        ],
                        'url' => ['raw' => '{{baseUrl}}/api/v1/seller/cars/{{carId}}', 'host' => ['{{baseUrl}}'], 'path' => ['api', 'v1', 'seller', 'cars', '{{carId}}']],
                        'description' => 'Updates vehicle specifications or asking price.',
                    ],
                ],
                [
                    'name' => 'POST Publish Car to Marketplace',
                    'event' => [$this->testStatus200('pm.test("Status is active", function () { const d = pm.response.json(); pm.expect(d.data.status).to.eql("active"); });')],
                    'request' => [
                        'method' => 'POST',
                        'header' => [['key' => 'Accept', 'value' => 'application/json']],
                        'url' => ['raw' => '{{baseUrl}}/api/v1/seller/cars/{{carId}}/publish', 'host' => ['{{baseUrl}}'], 'path' => ['api', 'v1', 'seller', 'cars', '{{carId}}', 'publish']],
                        'description' => 'Transitions car status from draft to active (visible on public marketplace).',
                    ],
                ],
                [
                    'name' => 'POST Unpublish Car (Back to Draft)',
                    'event' => [$this->testStatus200('pm.test("Status is draft", function () { const d = pm.response.json(); pm.expect(d.data.status).to.eql("draft"); });')],
                    'request' => [
                        'method' => 'POST',
                        'header' => [['key' => 'Accept', 'value' => 'application/json']],
                        'url' => ['raw' => '{{baseUrl}}/api/v1/seller/cars/{{carId}}/unpublish', 'host' => ['{{baseUrl}}'], 'path' => ['api', 'v1', 'seller', 'cars', '{{carId}}', 'unpublish']],
                        'description' => 'Hides car from public marketplace back into draft status.',
                    ],
                ],
                [
                    'name' => 'POST Mark Car as Sold',
                    'event' => [$this->testStatus200('pm.test("Status is sold", function () { const d = pm.response.json(); pm.expect(d.data.status).to.eql("sold"); });')],
                    'request' => [
                        'method' => 'POST',
                        'header' => [['key' => 'Accept', 'value' => 'application/json']],
                        'url' => ['raw' => '{{baseUrl}}/api/v1/seller/cars/{{carId}}/sold', 'host' => ['{{baseUrl}}'], 'path' => ['api', 'v1', 'seller', 'cars', '{{carId}}', 'sold']],
                        'description' => 'Marks car transaction as successfully completed and sold.',
                    ],
                ],
                [
                    'name' => 'DELETE Car Listing',
                    'event' => [[
                        'listen' => 'test',
                        'script' => [
                            'exec' => [
                                'pm.test("Deleted successfully (204 or 200)", function () {',
                                '    pm.expect([200, 204]).to.include(pm.response.code);',
                                '});',
                            ],
                            'type' => 'text/javascript',
                        ],
                    ]],
                    'request' => [
                        'method' => 'DELETE',
                        'header' => [['key' => 'Accept', 'value' => 'application/json']],
                        'url' => ['raw' => '{{baseUrl}}/api/v1/seller/cars/{{carId}}', 'host' => ['{{baseUrl}}'], 'path' => ['api', 'v1', 'seller', 'cars', '{{carId}}']],
                        'description' => 'Permanently deletes car listing and associated media.',
                    ],
                ],
            ],
        ];
    }

    private function partsMarketplaceFolder(): array
    {
        return [
            'name' => '6. Parts & Accessories Marketplace (Public)',
            'item' => [
                [
                    'name' => 'GET List Public Parts',
                    'event' => [$this->testStatus200('pm.test("Parts array returned", function () { const d = pm.response.json(); pm.expect(d.data).to.be.an("array"); });')],
                    'request' => [
                        'auth' => ['type' => 'noauth'],
                        'method' => 'GET',
                        'header' => [['key' => 'Accept', 'value' => 'application/json']],
                        'url' => [
                            'raw' => '{{baseUrl}}/api/v1/marketplace/parts?per_page=12&sort=newest',
                            'host' => ['{{baseUrl}}'],
                            'path' => ['api', 'v1', 'marketplace', 'parts'],
                            'query' => [
                                ['key' => 'per_page', 'value' => '12'],
                                ['key' => 'sort', 'value' => 'newest'],
                            ],
                        ],
                        'description' => 'Browse verified automotive parts & accessories catalog.',
                    ],
                ],
                [
                    'name' => 'GET Search & Filter Parts (Category, Brand, Price)',
                    'event' => [$this->testStatus200()],
                    'request' => [
                        'auth' => ['type' => 'noauth'],
                        'method' => 'GET',
                        'header' => [['key' => 'Accept', 'value' => 'application/json']],
                        'url' => [
                            'raw' => '{{baseUrl}}/api/v1/marketplace/parts?category=brakes&brand=Brembo&condition=new&free_shipping=1',
                            'host' => ['{{baseUrl}}'],
                            'path' => ['api', 'v1', 'marketplace', 'parts'],
                            'query' => [
                                ['key' => 'category', 'value' => 'brakes'],
                                ['key' => 'brand', 'value' => 'Brembo'],
                                ['key' => 'condition', 'value' => 'new'],
                                ['key' => 'free_shipping', 'value' => '1'],
                            ],
                        ],
                        'description' => 'Filter parts by category, manufacturer brand, condition, and free freight.',
                    ],
                ],
                [
                    'name' => 'GET Single Part Details',
                    'event' => [$this->testStatus200('pm.test("Part data loaded", function () { const d = pm.response.json(); pm.expect(d.data.id).to.be.a("number"); });')],
                    'request' => [
                        'auth' => ['type' => 'noauth'],
                        'method' => 'GET',
                        'header' => [['key' => 'Accept', 'value' => 'application/json']],
                        'url' => ['raw' => '{{baseUrl}}/api/v1/marketplace/parts/{{partId}}', 'host' => ['{{baseUrl}}'], 'path' => ['api', 'v1', 'marketplace', 'parts', '{{partId}}']],
                        'description' => 'Fetches detailed component technical specs, compatibility list, and stock availability.',
                    ],
                ],
            ],
        ];
    }

    private function sellerPartsFolder(): array
    {
        $savePartIdScript = [
            'listen' => 'test',
            'script' => [
                'exec' => [
                    'pm.test("Part created successfully", function () {',
                    '    pm.response.to.have.status(201);',
                    '    const jsonData = pm.response.json();',
                    '    if (jsonData.data && jsonData.data.id) {',
                    '        pm.collectionVariables.set("partId", String(jsonData.data.id));',
                    '    }',
                    '});',
                ],
                'type' => 'text/javascript',
            ],
        ];

        return [
            'name' => '7. Seller Parts & Accessories Inventory (CRUD & Workflow)',
            'item' => [
                [
                    'name' => 'GET My Parts Inventory',
                    'event' => [$this->testStatus200()],
                    'request' => [
                        'method' => 'GET',
                        'header' => [['key' => 'Accept', 'value' => 'application/json']],
                        'url' => ['raw' => '{{baseUrl}}/api/v1/seller/parts', 'host' => ['{{baseUrl}}'], 'path' => ['api', 'v1', 'seller', 'parts']],
                        'description' => 'Returns list of parts & accessories stock owned by authenticated seller/merchant.',
                    ],
                ],
                [
                    'name' => 'POST Create Part (Draft with Media)',
                    'event' => [$savePartIdScript],
                    'request' => [
                        'method' => 'POST',
                        'header' => [
                            ['key' => 'Accept', 'value' => 'application/json'],
                            ['key' => 'Content-Type', 'value' => 'application/json'],
                        ],
                        'body' => [
                            'mode' => 'raw',
                            'raw' => json_encode([
                                'title' => 'Brembo GT 6-Piston Monobloc Big Brake Kit 355mm',
                                'category' => 'brakes',
                                'brand' => 'Brembo',
                                'part_number' => '1M2.8041A-RED',
                                'compatibility' => 'Toyota GR Yaris, Honda Civic Type R (FK8/FL5), Subaru WRX STI (2015+)',
                                'condition' => 'new',
                                'quantity' => 3,
                                'price' => 42500,
                                'original_price' => 48000,
                                'free_shipping' => true,
                                'tag' => 'Brand New OEM Italy',
                                'city' => 'Makati Showroom Hub',
                                'location' => 'Makati Parts Warehouse',
                                'description' => 'Genuine Brembo GT 6-piston forged monobloc calipers with 355x32mm cross-drilled rotors.',
                                'images' => [
                                    'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?q=80&w=600&auto=format&fit=crop',
                                    'https://images.unsplash.com/photo-1613214149922-f1809c99b414?q=80&w=600&auto=format&fit=crop',
                                ],
                            ], JSON_PRETTY_PRINT),
                        ],
                        'url' => ['raw' => '{{baseUrl}}/api/v1/seller/parts', 'host' => ['{{baseUrl}}'], 'path' => ['api', 'v1', 'seller', 'parts']],
                        'description' => 'Creates a new parts & accessories listing in draft status. Sets {{partId}}.',
                    ],
                ],
                [
                    'name' => 'PUT Update Part Details',
                    'event' => [$this->testStatus200()],
                    'request' => [
                        'method' => 'PUT',
                        'header' => [
                            ['key' => 'Accept', 'value' => 'application/json'],
                            ['key' => 'Content-Type', 'value' => 'application/json'],
                        ],
                        'body' => [
                            'mode' => 'raw',
                            'raw' => json_encode([
                                'title' => 'Brembo GT 6-Piston Monobloc Big Brake Kit 355mm (Promo Price)',
                                'category' => 'brakes',
                                'brand' => 'Brembo',
                                'price' => 39900,
                                'original_price' => 48000,
                                'quantity' => 2,
                                'free_shipping' => true,
                                'tag' => 'Flash Deal · In Stock',
                            ], JSON_PRETTY_PRINT),
                        ],
                        'url' => ['raw' => '{{baseUrl}}/api/v1/seller/parts/{{partId}}', 'host' => ['{{baseUrl}}'], 'path' => ['api', 'v1', 'seller', 'parts', '{{partId}}']],
                        'description' => 'Updates part specifications, stock quantity, or promotional price.',
                    ],
                ],
                [
                    'name' => 'POST Publish Part to Catalog',
                    'event' => [$this->testStatus200('pm.test("Status is active", function () { const d = pm.response.json(); pm.expect(d.data.status).to.eql("active"); });')],
                    'request' => [
                        'method' => 'POST',
                        'header' => [['key' => 'Accept', 'value' => 'application/json']],
                        'url' => ['raw' => '{{baseUrl}}/api/v1/seller/parts/{{partId}}/publish', 'host' => ['{{baseUrl}}'], 'path' => ['api', 'v1', 'seller', 'parts', '{{partId}}', 'publish']],
                        'description' => 'Transitions part status to active (visible on public parts marketplace).',
                    ],
                ],
                [
                    'name' => 'POST Unpublish Part (Back to Draft)',
                    'event' => [$this->testStatus200('pm.test("Status is draft", function () { const d = pm.response.json(); pm.expect(d.data.status).to.eql("draft"); });')],
                    'request' => [
                        'method' => 'POST',
                        'header' => [['key' => 'Accept', 'value' => 'application/json']],
                        'url' => ['raw' => '{{baseUrl}}/api/v1/seller/parts/{{partId}}/unpublish', 'host' => ['{{baseUrl}}'], 'path' => ['api', 'v1', 'seller', 'parts', '{{partId}}', 'unpublish']],
                        'description' => 'Hides part from public catalog back into draft status.',
                    ],
                ],
                [
                    'name' => 'POST Mark Part as Sold / Out of Stock',
                    'event' => [$this->testStatus200('pm.test("Status is sold", function () { const d = pm.response.json(); pm.expect(d.data.status).to.eql("sold"); });')],
                    'request' => [
                        'method' => 'POST',
                        'header' => [['key' => 'Accept', 'value' => 'application/json']],
                        'url' => ['raw' => '{{baseUrl}}/api/v1/seller/parts/{{partId}}/sold', 'host' => ['{{baseUrl}}'], 'path' => ['api', 'v1', 'seller', 'parts', '{{partId}}', 'sold']],
                        'description' => 'Marks part as sold or fully fulfilled.',
                    ],
                ],
                [
                    'name' => 'DELETE Part Listing',
                    'event' => [[
                        'listen' => 'test',
                        'script' => [
                            'exec' => [
                                'pm.test("Deleted successfully (204 or 200)", function () {',
                                '    pm.expect([200, 204]).to.include(pm.response.code);',
                                '});',
                            ],
                            'type' => 'text/javascript',
                        ],
                    ]],
                    'request' => [
                        'method' => 'DELETE',
                        'header' => [['key' => 'Accept', 'value' => 'application/json']],
                        'url' => ['raw' => '{{baseUrl}}/api/v1/seller/parts/{{partId}}', 'host' => ['{{baseUrl}}'], 'path' => ['api', 'v1', 'seller', 'parts', '{{partId}}']],
                        'description' => 'Permanently removes part from seller inventory.',
                    ],
                ],
            ],
        ];
    }

    private function broadcastingFolder(): array
    {
        return [
            'name' => '8. Real-time WebSockets & Broadcasting (Laravel Reverb)',
            'item' => [
                [
                    'name' => 'POST Authorize Private User Channel (private-user.{id})',
                    'event' => [$this->testStatus200('pm.test("Auth signature returned", function () { const d = pm.response.json(); pm.expect(d.auth).to.be.a("string"); });')],
                    'request' => [
                        'method' => 'POST',
                        'header' => [
                            ['key' => 'Accept', 'value' => 'application/json'],
                            ['key' => 'Content-Type', 'value' => 'application/json'],
                        ],
                        'body' => [
                            'mode' => 'raw',
                            'raw' => json_encode([
                                'socket_id' => '{{socketId}}',
                                'channel_name' => 'private-user.{{userId}}',
                            ], JSON_PRETTY_PRINT),
                        ],
                        'url' => ['raw' => '{{baseUrl}}/api/v1/broadcasting/auth', 'host' => ['{{baseUrl}}'], 'path' => ['api', 'v1', 'broadcasting', 'auth']],
                        'description' => 'Authenticates WebSocket connection to private user notification channel.',
                    ],
                ],
                [
                    'name' => 'POST Authorize Private Seller Channel (private-seller.{id})',
                    'event' => [$this->testStatus200('pm.test("Seller channel auth signature", function () { const d = pm.response.json(); pm.expect(d.auth).to.be.a("string"); });')],
                    'request' => [
                        'method' => 'POST',
                        'header' => [
                            ['key' => 'Accept', 'value' => 'application/json'],
                            ['key' => 'Content-Type', 'value' => 'application/json'],
                        ],
                        'body' => [
                            'mode' => 'raw',
                            'raw' => json_encode([
                                'socket_id' => '{{socketId}}',
                                'channel_name' => 'private-seller.{{userId}}',
                            ], JSON_PRETTY_PRINT),
                        ],
                        'url' => ['raw' => '{{baseUrl}}/api/v1/broadcasting/auth', 'host' => ['{{baseUrl}}'], 'path' => ['api', 'v1', 'broadcasting', 'auth']],
                        'description' => 'Authenticates WebSocket connection for seller/dealer inquiry alerts.',
                    ],
                ],
                [
                    'name' => 'POST Authorize Presence Channel (presence-marketplace)',
                    'event' => [$this->testStatus200('pm.test("Presence auth and channel data", function () { const d = pm.response.json(); pm.expect(d.auth).to.be.a("string"); pm.expect(d.channel_data).to.be.a("string"); });')],
                    'request' => [
                        'method' => 'POST',
                        'header' => [
                            ['key' => 'Accept', 'value' => 'application/json'],
                            ['key' => 'Content-Type', 'value' => 'application/json'],
                        ],
                        'body' => [
                            'mode' => 'raw',
                            'raw' => json_encode([
                                'socket_id' => '{{socketId}}',
                                'channel_name' => 'presence-marketplace',
                            ], JSON_PRETTY_PRINT),
                        ],
                        'url' => ['raw' => '{{baseUrl}}/api/v1/broadcasting/auth', 'host' => ['{{baseUrl}}'], 'path' => ['api', 'v1', 'broadcasting', 'auth']],
                        'description' => 'Authenticates WebSocket presence channel showing live active shoppers.',
                    ],
                ],
            ],
        ];
    }

    private function favoritesFolder(): array
    {
        return [
            'name' => '4. Saved & Favorites (Wishlist & Garage)',
            'item' => [
                [
                    'name' => 'GET User Favorite IDs (Fast UI Sync)',
                    'event' => [$this->testStatus200('pm.test("Contains cars and parts arrays", function () { const d = pm.response.json().data; pm.expect(d).to.have.property("cars"); pm.expect(d).to.have.property("parts"); pm.expect(d).to.have.property("total"); });')],
                    'request' => [
                        'method' => 'GET',
                        'header' => [['key' => 'Accept', 'value' => 'application/json']],
                        'url' => ['raw' => '{{baseUrl}}/api/v1/favorites/ids', 'host' => ['{{baseUrl}}'], 'path' => ['api', 'v1', 'favorites', 'ids']],
                        'description' => 'Returns array of saved car IDs and part IDs for fast cross-view badge rendering.',
                    ],
                ],
                [
                    'name' => 'POST Toggle Car Favorite (Save / Unsave)',
                    'event' => [$this->testStatus200('pm.test("Favorite toggle successful", function () { const d = pm.response.json().data; pm.expect(d).to.have.property("favorited"); pm.expect(d.type).to.eql("car"); });')],
                    'request' => [
                        'method' => 'POST',
                        'header' => [
                            ['key' => 'Accept', 'value' => 'application/json'],
                            ['key' => 'Content-Type', 'value' => 'application/json'],
                        ],
                        'body' => [
                            'mode' => 'raw',
                            'raw' => json_encode([
                                'type' => 'car',
                                'id' => 1,
                            ], JSON_PRETTY_PRINT),
                        ],
                        'url' => ['raw' => '{{baseUrl}}/api/v1/favorites/toggle', 'host' => ['{{baseUrl}}'], 'path' => ['api', 'v1', 'favorites', 'toggle']],
                        'description' => 'Toggles favorite bookmark for a specific car build.',
                    ],
                ],
                [
                    'name' => 'POST Toggle Part Favorite (Save / Unsave)',
                    'event' => [$this->testStatus200('pm.test("Part favorite toggle successful", function () { const d = pm.response.json().data; pm.expect(d).to.have.property("favorited"); pm.expect(d.type).to.eql("part"); });')],
                    'request' => [
                        'method' => 'POST',
                        'header' => [
                            ['key' => 'Accept', 'value' => 'application/json'],
                            ['key' => 'Content-Type', 'value' => 'application/json'],
                        ],
                        'body' => [
                            'mode' => 'raw',
                            'raw' => json_encode([
                                'type' => 'part',
                                'id' => 1,
                            ], JSON_PRETTY_PRINT),
                        ],
                        'url' => ['raw' => '{{baseUrl}}/api/v1/favorites/toggle', 'host' => ['{{baseUrl}}'], 'path' => ['api', 'v1', 'favorites', 'toggle']],
                        'description' => 'Toggles favorite bookmark for a specific auto part or accessory.',
                    ],
                ],
                [
                    'name' => 'GET List All Favorites (Full Data & Counts)',
                    'event' => [$this->testStatus200('pm.test("Returns favorites list and counts", function () { const res = pm.response.json(); pm.expect(res.data).to.be.an("array"); pm.expect(res.meta.counts).to.be.an("object"); });')],
                    'request' => [
                        'method' => 'GET',
                        'header' => [['key' => 'Accept', 'value' => 'application/json']],
                        'url' => ['raw' => '{{baseUrl}}/api/v1/favorites', 'host' => ['{{baseUrl}}'], 'path' => ['api', 'v1', 'favorites']],
                        'description' => 'Returns list of user saved cars and parts with complete details and media.',
                    ],
                ],
                [
                    'name' => 'GET Filter Favorites by Type (?type=car)',
                    'event' => [$this->testStatus200()],
                    'request' => [
                        'method' => 'GET',
                        'header' => [['key' => 'Accept', 'value' => 'application/json']],
                        'url' => [
                            'raw' => '{{baseUrl}}/api/v1/favorites?type=car',
                            'host' => ['{{baseUrl}}'],
                            'path' => ['api', 'v1', 'favorites'],
                            'query' => [['key' => 'type', 'value' => 'car']],
                        ],
                        'description' => 'Returns only favorited vehicles.',
                    ],
                ],
                [
                    'name' => 'DELETE Clear All Favorites',
                    'event' => [$this->testStatus200('pm.test("Cleared favorites", function () { const d = pm.response.json(); pm.expect(d.data.counts.total).to.eql(0); });')],
                    'request' => [
                        'method' => 'DELETE',
                        'header' => [['key' => 'Accept', 'value' => 'application/json']],
                        'url' => ['raw' => '{{baseUrl}}/api/v1/favorites/clear', 'host' => ['{{baseUrl}}'], 'path' => ['api', 'v1', 'favorites', 'clear']],
                        'description' => 'Clears all user saved favorites.',
                    ],
                ],
            ],
        ];
    }

    private function nginxCachingFolder(): array
    {
        return [
            'name' => '9. Nginx Caching & Edge Performance',
            'item' => [
                [
                    'name' => 'GET Public Cars (Validate Nginx FastCGI Cache Header)',
                    'event' => [[
                        'listen' => 'test',
                        'script' => [
                            'exec' => [
                                'pm.test("Status is 200", function () {',
                                '    pm.response.to.have.status(200);',
                                '});',
                                'pm.test("Check X-Cache-Status or standard response", function () {',
                                '    if (pm.response.headers.has("X-Cache-Status")) {',
                                '        pm.expect(["HIT", "MISS", "BYPASS", "EXPIRED"]).to.include(pm.response.headers.get("X-Cache-Status"));',
                                '    }',
                                '});',
                            ],
                            'type' => 'text/javascript',
                        ],
                    ]],
                    'request' => [
                        'auth' => ['type' => 'noauth'],
                        'method' => 'GET',
                        'header' => [['key' => 'Accept', 'value' => 'application/json']],
                        'url' => ['raw' => '{{baseUrl}}/api/v1/marketplace/cars', 'host' => ['{{baseUrl}}'], 'path' => ['api', 'v1', 'marketplace', 'cars']],
                        'description' => 'Tests Nginx FastCGI microcache header behavior for unauthenticated public requests.',
                    ],
                ],
                [
                    'name' => 'GET Authenticated Cars (Validate Cache BYPASS on Auth)',
                    'event' => [[
                        'listen' => 'test',
                        'script' => [
                            'exec' => [
                                'pm.test("Status is 200", function () {',
                                '    pm.response.to.have.status(200);',
                                '});',
                                'pm.test("Cache is bypassed on Authorization Bearer", function () {',
                                '    if (pm.response.headers.has("X-Cache-Status")) {',
                                '        pm.expect(pm.response.headers.get("X-Cache-Status")).to.eql("BYPASS");',
                                '    }',
                            ],
                            'type' => 'text/javascript',
                        ],
                    ]],
                    'request' => [
                        'method' => 'GET',
                        'header' => [['key' => 'Accept', 'value' => 'application/json']],
                        'url' => ['raw' => '{{baseUrl}}/api/v1/seller/cars', 'host' => ['{{baseUrl}}'], 'path' => ['api', 'v1', 'seller', 'cars']],
                        'description' => 'Verifies authenticated requests properly bypass edge FastCGI caching.',
                    ],
                ],
            ],
        ];
    }
}
