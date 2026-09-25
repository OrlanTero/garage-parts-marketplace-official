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
                'description' => "Comprehensive Postman collection for Garage Parts Marketplace API.\n\n### Included Modules & Workflows:\n1. **System & Health Probes**: Health check, database/cache/queue probes, Laravel uptime, CSRF cookie initialization, remote migrations & seeding.\n2. **Authentication & Session**: Registration (Buyer, Seller, Dealer, Parts Seller), Multi-role Login, Profile (`/auth/me`), Role-specific probes (`buyer`, `seller`, `dealer`, `parts_seller`, `admin`), OAuth redirect/callback, Single & All-device logout.\n3. **Media Uploads & File Storage**: Upload single/batch high-resolution images & PDFs (AWS EFS & Local Storage ready), view, and delete media.\n4. **Saved & Favorites**: Save/unsave cars & parts, fetch favorite IDs for fast UI badges, filtered queries, and clear favorites.\n5. **Cars Marketplace (Public)**: Public vehicle catalog with multi-facet filters (brand, model, price, year, mileage, transmission), sorting, pagination, and detail specs.\n6. **Seller Cars Inventory**: Seller vehicle creation, media gallery linkage, updates, draft/publish/sold workflow transitions, and deletion.\n7. **Parts Marketplace (Public)**: Public automotive parts catalog with category, condition, free shipping, brand filters, and stock inspection.\n8. **Seller Parts Inventory**: Seller parts creation, inventory quantities, pricing, compatibility list, workflow transitions, and deletion.\n9. **Checkout & Orders**: Public/Customer order placement with line items, agent attribution, public order lookup by order number, and authenticated order history.\n10. **Sales Agent Portal**: Public referral code verification, agent sales performance analytics, and payout configuration.\n11. **Chat & Direct Messaging**: 1:1 user-to-user direct chat with listing context linkage, unread count badge, conversation listing, message history, read receipts, and automated PII sanitization engine.\n12. **Real-time WebSockets & Broadcasting (Laravel Reverb)**: Channel authorization (`/api/v1/broadcasting/auth`) for `private-user.{id}`, `private-seller.{id}`, `private-conversation.{id}`, and `presence-marketplace` channels.\n13. **Nginx FastCGI Edge Performance & Caching**: Microcache hit/miss validation and cache bypass checks.\n\n### Automatic Variable Sync:\n- Authentication requests automatically capture the Bearer `{{token}}` and `{{userId}}`.\n- Creating a car or part automatically captures `{{carId}}` and `{{partId}}`.\n- Creating an order or starting a conversation automatically captures `{{orderNumber}}` and `{{conversationId}}`.\n- Submitting a seller application automatically captures `{{applicationId}}`.",
                'schema' => 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
            ],
            'variable' => [
                ['key' => 'baseUrl', 'value' => 'http://localhost:8000', 'type' => 'string'],
                ['key' => 'token', 'value' => '', 'type' => 'string'],
                ['key' => 'userId', 'value' => '1', 'type' => 'string'],
                ['key' => 'carId', 'value' => '1', 'type' => 'string'],
                ['key' => 'partId', 'value' => '1', 'type' => 'string'],
                ['key' => 'mediaId', 'value' => '1', 'type' => 'string'],
                ['key' => 'conversationId', 'value' => '1', 'type' => 'string'],
                ['key' => 'applicationId', 'value' => '1', 'type' => 'string'],
                ['key' => 'recipientId', 'value' => '2', 'type' => 'string'],
                ['key' => 'orderNumber', 'value' => 'ORD-20260922-0001', 'type' => 'string'],
                ['key' => 'agentCode', 'value' => 'AGENT-DEMO', 'type' => 'string'],
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
                $this->ordersFolder(),
                $this->salesAgentFolder(),
                $this->sellerKycFolder(),
                $this->sellerApplicationsFolder(),
                $this->chatFolder(),
                $this->adminModerationAndRbacFolder(),
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
            'name' => '3. Media & High-Resolution File Storage (AWS EFS / Local)',
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

    private function carsMarketplaceFolder(): array
    {
        return [
            'name' => '5. Cars Marketplace (Public)',
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
            'name' => '6. Seller Cars Inventory (CRUD & Workflow)',
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
            'name' => '7. Parts & Accessories Marketplace (Public)',
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
            'name' => '8. Seller Parts & Accessories Inventory (CRUD & Workflow)',
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

    private function ordersFolder(): array
    {
        $saveOrderNumberScript = [
            'listen' => 'test',
            'script' => [
                'exec' => [
                    'pm.test("Order placed successfully (201)", function () {',
                    '    pm.response.to.have.status(201);',
                    '    const res = pm.response.json();',
                    '    if (res.data && res.data.order_number) {',
                    '        pm.collectionVariables.set("orderNumber", String(res.data.order_number));',
                    '    }',
                    '});',
                ],
                'type' => 'text/javascript',
            ],
        ];

        return [
            'name' => '9. Checkout & Orders',
            'item' => [
                [
                    'name' => 'POST Create Checkout Order (Customer / Guest / Auth)',
                    'event' => [$saveOrderNumberScript],
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
                                'customer_name' => 'Juan Dela Cruz',
                                'customer_email' => 'buyer@example.com',
                                'customer_phone' => '09171234567',
                                'shipping_address' => 'Unit 1204 High Street South, BGC, Taguig City, Metro Manila',
                                'notes' => 'Please coordinate delivery ahead of time.',
                                'items' => [
                                    [
                                        'part_id' => 1,
                                        'quantity' => 1,
                                    ],
                                ],
                                'agent_referral_code' => 'AGENT-DEMO',
                            ], JSON_PRETTY_PRINT),
                        ],
                        'url' => ['raw' => '{{baseUrl}}/api/v1/orders', 'host' => ['{{baseUrl}}'], 'path' => ['api', 'v1', 'orders']],
                        'description' => 'Places an order for marketplace parts/items with customer details and optional agent referral code. Sets {{orderNumber}} variable.',
                    ],
                ],
                [
                    'name' => 'GET Public Order Details Lookup',
                    'event' => [$this->testStatus200('pm.test("Order details returned", function () { const d = pm.response.json().data; pm.expect(d.order_number).to.be.a("string"); });')],
                    'request' => [
                        'auth' => ['type' => 'noauth'],
                        'method' => 'GET',
                        'header' => [['key' => 'Accept', 'value' => 'application/json']],
                        'url' => ['raw' => '{{baseUrl}}/api/v1/orders/{{orderNumber}}', 'host' => ['{{baseUrl}}'], 'path' => ['api', 'v1', 'orders', '{{orderNumber}}']],
                        'description' => 'Fetches order summary, line items, and fulfillment status using order number or UUID identifier.',
                    ],
                ],
                [
                    'name' => 'GET User Orders History (Authenticated)',
                    'event' => [$this->testStatus200('pm.test("Orders array present", function () { const d = pm.response.json(); pm.expect(d.data).to.be.an("array"); });')],
                    'request' => [
                        'method' => 'GET',
                        'header' => [['key' => 'Accept', 'value' => 'application/json']],
                        'url' => ['raw' => '{{baseUrl}}/api/v1/orders', 'host' => ['{{baseUrl}}'], 'path' => ['api', 'v1', 'orders']],
                        'description' => 'Returns order history for the currently authenticated buyer or seller.',
                    ],
                ],
            ],
        ];
    }

    private function salesAgentFolder(): array
    {
        return [
            'name' => '10. Sales Agent Portal',
            'item' => [
                [
                    'name' => 'GET Verify Sales Agent Referral Code (Public)',
                    'event' => [$this->testStatus200('pm.test("Agent verification response", function () { const d = pm.response.json(); pm.expect(d).to.have.property("valid"); });')],
                    'request' => [
                        'auth' => ['type' => 'noauth'],
                        'method' => 'GET',
                        'header' => [['key' => 'Accept', 'value' => 'application/json']],
                        'url' => ['raw' => '{{baseUrl}}/api/v1/agents/verify/{{agentCode}}', 'host' => ['{{baseUrl}}'], 'path' => ['api', 'v1', 'agents', 'verify', '{{agentCode}}']],
                        'description' => 'Verifies whether a sales agent referral code is active and valid for checkout attribution.',
                    ],
                ],
                [
                    'name' => 'GET Sales Agent Performance & Commission Stats (Authenticated)',
                    'event' => [$this->testStatus200('pm.test("Agent stats data loaded", function () { const d = pm.response.json.data; pm.expect(d).to.be.an("object"); });')],
                    'request' => [
                        'method' => 'GET',
                        'header' => [['key' => 'Accept', 'value' => 'application/json']],
                        'url' => ['raw' => '{{baseUrl}}/api/v1/agent/stats', 'host' => ['{{baseUrl}}'], 'path' => ['api', 'v1', 'agent', 'stats']],
                        'description' => 'Returns performance metrics, referred orders count, and commission earnings for the agent.',
                    ],
                ],
                [
                    'name' => 'POST Update Agent Profile & Payout Settings (Authenticated)',
                    'event' => [$this->testStatus200('pm.test("Profile updated successfully", function () { const d = pm.response.json(); pm.expect(d.status).to.eql("success"); });')],
                    'request' => [
                        'method' => 'POST',
                        'header' => [
                            ['key' => 'Accept', 'value' => 'application/json'],
                            ['key' => 'Content-Type', 'value' => 'application/json'],
                        ],
                        'body' => [
                            'mode' => 'raw',
                            'raw' => json_encode([
                                'bio' => 'Certified Japanese Domestic Market (JDM) and Performance Parts Specialist.',
                                'commission_payout_details' => 'GCash: 0917-555-8888 | BDO Checking: 0012-3456-7890',
                            ], JSON_PRETTY_PRINT),
                        ],
                        'url' => ['raw' => '{{baseUrl}}/api/v1/agent/profile', 'host' => ['{{baseUrl}}'], 'path' => ['api', 'v1', 'agent', 'profile']],
                        'description' => 'Updates agent bio, specialties, and commission disbursement payout account.',
                    ],
                ],
            ],
        ];
    }

    private function sellerKycFolder(): array
    {
        return [
            'name' => '11. Seller KYC & Verification Badging',
            'item' => [
                [
                    'name' => 'GET KYC Status & Verification Credentials (Authenticated)',
                    'event' => [$this->testStatus200('pm.test("KYC status loaded", function () { const d = pm.response.json(); pm.expect(d.kyc).to.be.an("object"); });')],
                    'request' => [
                        'method' => 'GET',
                        'header' => [['key' => 'Accept', 'value' => 'application/json']],
                        'url' => ['raw' => '{{baseUrl}}/api/v1/kyc/status', 'host' => ['{{baseUrl}}'], 'path' => ['api', 'v1', 'kyc', 'status']],
                        'description' => 'Returns the authenticated seller\'s KYC accreditation status, document credentials, and approval timestamps.',
                    ],
                ],
                [
                    'name' => 'POST Submit KYC Verification Documents (Authenticated)',
                    'event' => [$this->testStatus200('pm.test("KYC submitted for compliance review", function () { const d = pm.response.json(); pm.expect(d.kyc.status).to.eql("pending"); });')],
                    'request' => [
                        'method' => 'POST',
                        'header' => [
                            ['key' => 'Accept', 'value' => 'application/json'],
                            ['key' => 'Content-Type', 'value' => 'application/json'],
                        ],
                        'body' => [
                            'mode' => 'raw',
                            'raw' => json_encode([
                                'document_type' => 'drivers_license',
                                'document_number' => 'N02-18-992140',
                                'document_url' => 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=800',
                                'selfie_url' => 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800',
                                'notes' => 'Official Philippine Driver\'s License for Makati Showroom verification.',
                            ], JSON_PRETTY_PRINT),
                        ],
                        'url' => ['raw' => '{{baseUrl}}/api/v1/kyc/submit', 'host' => ['{{baseUrl}}'], 'path' => ['api', 'v1', 'kyc', 'submit']],
                        'description' => 'Submits government ID or business permit credentials for compliance review to unlock the Verified Seller Badge.',
                    ],
                ],
            ],
        ];
    }

    private function sellerApplicationsFolder(): array
    {
        return [
            'name' => '12. Buyer-to-Seller Upgrade Applications & Seller Dashboard',
            'item' => [
                [
                    'name' => 'POST Submit Seller Upgrade Application (Buyer)',
                    'event' => [$this->testStatus201('pm.test("Application pending", function () { const d = pm.response.json(); pm.expect(d.application.status).to.eql("pending"); pm.collectionVariables.set("applicationId", String(d.application.id)); });')],
                    'request' => [
                        'method' => 'POST',
                        'header' => [
                            ['key' => 'Accept', 'value' => 'application/json'],
                            ['key' => 'Content-Type', 'value' => 'application/json'],
                        ],
                        'body' => [
                            'mode' => 'raw',
                            'raw' => json_encode([
                                'requested_role' => 'seller',
                                'shop_name' => 'Calamaya Garage',
                                'contact_phone' => '09175551234',
                                'city' => 'Makati City',
                                'address' => '123 Osmena Highway',
                                'reason' => 'Restored classic builds for the marketplace.',
                            ], JSON_PRETTY_PRINT),
                        ],
                        'url' => ['raw' => '{{baseUrl}}/api/v1/seller-applications', 'host' => ['{{baseUrl}}'], 'path' => ['api', 'v1', 'seller-applications']],
                        'description' => 'Buyer submits a seller/dealer/parts_seller upgrade request. One pending application per buyer; sellers and staff are rejected with 422.',
                    ],
                ],
                [
                    'name' => 'GET My Applications & Upgrade Eligibility (Buyer)',
                    'event' => [$this->testStatus200('pm.test("Eligibility flags present", function () { const d = pm.response.json(); pm.expect(d.eligibility).to.be.an("object"); });')],
                    'request' => [
                        'method' => 'GET',
                        'header' => [['key' => 'Accept', 'value' => 'application/json']],
                        'url' => ['raw' => '{{baseUrl}}/api/v1/seller-applications', 'host' => ['{{baseUrl}}'], 'path' => ['api', 'v1', 'seller-applications']],
                        'description' => 'Lists the authenticated buyer\'s own applications plus can_apply / kyc_verified eligibility flags and the pending application.',
                    ],
                ],
                [
                    'name' => 'POST Withdraw Own Pending Application (Buyer)',
                    'event' => [$this->testStatus200()],
                    'request' => [
                        'method' => 'POST',
                        'header' => [['key' => 'Accept', 'value' => 'application/json']],
                        'url' => ['raw' => '{{baseUrl}}/api/v1/seller-applications/{{applicationId}}/withdraw', 'host' => ['{{baseUrl}}'], 'path' => ['api', 'v1', 'seller-applications', '{{applicationId}}', 'withdraw']],
                        'description' => 'Withdraws the buyer\'s own pending application. Withdrawn applicants may submit a fresh request.',
                    ],
                ],
                [
                    'name' => 'GET Seller Dashboard Summary (Per-Status Counts)',
                    'event' => [$this->testStatus200('pm.test("Per-status counts present", function () { const d = pm.response.json(); pm.expect(d.cars).to.be.an("object"); pm.expect(d.parts).to.be.an("object"); });')],
                    'request' => [
                        'method' => 'GET',
                        'header' => [['key' => 'Accept', 'value' => 'application/json']],
                        'url' => ['raw' => '{{baseUrl}}/api/v1/seller/summary', 'host' => ['{{baseUrl}}'], 'path' => ['api', 'v1', 'seller', 'summary']],
                        'description' => 'Per-status inventory counts across the seller\'s own cars (draft, pending_inspection, inspected, active, rejected, sold, archived) and parts.',
                    ],
                ],
                [
                    'name' => 'GET Admin Seller Application Queue (Staff)',
                    'event' => [$this->testStatus200('pm.test("Queue stats present", function () { const d = pm.response.json(); pm.expect(d.stats).to.be.an("object"); });')],
                    'request' => [
                        'method' => 'GET',
                        'header' => [['key' => 'Accept', 'value' => 'application/json']],
                        'url' => ['raw' => '{{baseUrl}}/api/v1/admin/seller-applications?status=pending', 'host' => ['{{baseUrl}}'], 'path' => ['api', 'v1', 'admin', 'seller-applications']],
                        'description' => 'Staff queue of upgrade applications with pending/approved/rejected/withdrawn stats. Filters: status, requested_role, q.',
                    ],
                ],
                [
                    'name' => 'POST Admin Approve Application & Upgrade Role (Staff)',
                    'event' => [$this->testStatus200('pm.test("Role upgraded", function () { const d = pm.response.json(); pm.expect(d.application.status).to.eql("approved"); });')],
                    'request' => [
                        'method' => 'POST',
                        'header' => [
                            ['key' => 'Accept', 'value' => 'application/json'],
                            ['key' => 'Content-Type', 'value' => 'application/json'],
                        ],
                        'body' => [
                            'mode' => 'raw',
                            'raw' => json_encode(['review_notes' => 'Docs check out.'], JSON_PRETTY_PRINT),
                        ],
                        'url' => ['raw' => '{{baseUrl}}/api/v1/admin/seller-applications/{{applicationId}}/approve', 'host' => ['{{baseUrl}}'], 'path' => ['api', 'v1', 'admin', 'seller-applications', '{{applicationId}}', 'approve']],
                        'description' => 'Approves the upgrade and atomically grants the requested seller role. SECURITY GATE: 422 unless the applicant holds a verified KYC badge.',
                    ],
                ],
                [
                    'name' => 'POST Admin Reject Application (Staff)',
                    'event' => [$this->testStatus200()],
                    'request' => [
                        'method' => 'POST',
                        'header' => [
                            ['key' => 'Accept', 'value' => 'application/json'],
                            ['key' => 'Content-Type', 'value' => 'application/json'],
                        ],
                        'body' => [
                            'mode' => 'raw',
                            'raw' => json_encode(['reason' => 'Business permit is expired. Please re-apply with valid documents.'], JSON_PRETTY_PRINT),
                        ],
                        'url' => ['raw' => '{{baseUrl}}/api/v1/admin/seller-applications/{{applicationId}}/reject', 'host' => ['{{baseUrl}}'], 'path' => ['api', 'v1', 'admin', 'seller-applications', '{{applicationId}}', 'reject']],
                        'description' => 'Rejects the upgrade with a formal reason. Buyer role is kept; the applicant may re-apply.',
                    ],
                ],
            ],
        ];
    }

    private function chatFolder(): array
    {
        $saveConversationIdScript = [
            'listen' => 'test',
            'script' => [
                'exec' => [
                    'pm.test("Conversation created or resolved (200/201)", function () {',
                    '    pm.expect([200, 201]).to.include(pm.response.code);',
                    '    const res = pm.response.json();',
                    '    if (res.data && res.data.id) {',
                    '        pm.collectionVariables.set("conversationId", String(res.data.id));',
                    '    }',
                    '});',
                ],
                'type' => 'text/javascript',
            ],
        ];

        return [
            'name' => '13. Chat & Direct Messaging (1:1 + PII Safety Engine)',
            'item' => [
                [
                    'name' => 'GET Unread Messages Total Count',
                    'event' => [$this->testStatus200('pm.test("Unread count integer present", function () { const d = pm.response.json(); pm.expect(d.unread_count).to.be.a("number"); });')],
                    'request' => [
                        'method' => 'GET',
                        'header' => [['key' => 'Accept', 'value' => 'application/json']],
                        'url' => ['raw' => '{{baseUrl}}/api/v1/chat/unread-count', 'host' => ['{{baseUrl}}'], 'path' => ['api', 'v1', 'chat', 'unread-count']],
                        'description' => 'Returns total count of unread incoming direct messages for navigation badge updates.',
                    ],
                ],
                [
                    'name' => 'GET List Inbox Conversations',
                    'event' => [$this->testStatus200('pm.test("Inbox list array present", function () { const d = pm.response.json(); pm.expect(d.data).to.be.an("array"); });')],
                    'request' => [
                        'method' => 'GET',
                        'header' => [['key' => 'Accept', 'value' => 'application/json']],
                        'url' => [
                            'raw' => '{{baseUrl}}/api/v1/chat/conversations?per_page=15',
                            'host' => ['{{baseUrl}}'],
                            'path' => ['api', 'v1', 'chat', 'conversations'],
                            'query' => [['key' => 'per_page', 'value' => '15']],
                        ],
                        'description' => 'Retrieves user inbox conversations with latest message preview, unread status, and recipient profile.',
                    ],
                ],
                [
                    'name' => 'POST Start / Resolve 1:1 Conversation (With Listing Context)',
                    'event' => [$saveConversationIdScript],
                    'request' => [
                        'method' => 'POST',
                        'header' => [
                            ['key' => 'Accept', 'value' => 'application/json'],
                            ['key' => 'Content-Type', 'value' => 'application/json'],
                        ],
                        'body' => [
                            'mode' => 'raw',
                            'raw' => json_encode([
                                'recipient_id' => 2,
                                'initial_message' => 'Hello! Is this car build still available for inspection and test drive?',
                                'listing_type' => 'car',
                                'listing_id' => 1,
                            ], JSON_PRETTY_PRINT),
                        ],
                        'url' => ['raw' => '{{baseUrl}}/api/v1/chat/conversations', 'host' => ['{{baseUrl}}'], 'path' => ['api', 'v1', 'chat', 'conversations']],
                        'description' => 'Finds existing or creates a new strictly 1:1 conversation thread between two users. Attaches listing context card and sets {{conversationId}} variable.',
                    ],
                ],
                [
                    'name' => 'GET Single Conversation Details',
                    'event' => [$this->testStatus200('pm.test("Conversation metadata and recipient data returned", function () { const d = pm.response.json().data; pm.expect(d.id).to.be.a("number"); pm.expect(d.other_user).to.be.an("object"); });')],
                    'request' => [
                        'method' => 'GET',
                        'header' => [['key' => 'Accept', 'value' => 'application/json']],
                        'url' => ['raw' => '{{baseUrl}}/api/v1/chat/conversations/{{conversationId}}', 'host' => ['{{baseUrl}}'], 'path' => ['api', 'v1', 'chat', 'conversations', '{{conversationId}}']],
                        'description' => 'Retrieves conversation details, participant info, and pinned listing summary.',
                    ],
                ],
                [
                    'name' => 'GET Conversation Message History (Paginated)',
                    'event' => [$this->testStatus200('pm.test("Messages array returned", function () { const d = pm.response.json(); pm.expect(d.data).to.be.an("array"); });')],
                    'request' => [
                        'method' => 'GET',
                        'header' => [['key' => 'Accept', 'value' => 'application/json']],
                        'url' => [
                            'raw' => '{{baseUrl}}/api/v1/chat/conversations/{{conversationId}}/messages?per_page=30',
                            'host' => ['{{baseUrl}}'],
                            'path' => ['api', 'v1', 'chat', 'conversations', '{{conversationId}}', 'messages'],
                            'query' => [['key' => 'per_page', 'value' => '30']],
                        ],
                        'description' => 'Fetches paginated chronological messages for a conversation thread.',
                    ],
                ],
                [
                    'name' => 'POST Send Message (Clean Text)',
                    'event' => [$this->testStatus201('pm.test("Message dispatched", function () { const d = pm.response.json().data; pm.expect(d.is_redacted).to.eql(false); });')],
                    'request' => [
                        'method' => 'POST',
                        'header' => [
                            ['key' => 'Accept', 'value' => 'application/json'],
                            ['key' => 'Content-Type', 'value' => 'application/json'],
                        ],
                        'body' => [
                            'mode' => 'raw',
                            'raw' => json_encode([
                                'body' => 'Can you provide dyno tuning charts and maintenance records for this build?',
                                'listing_type' => 'car',
                                'listing_id' => 1,
                            ], JSON_PRETTY_PRINT),
                        ],
                        'url' => ['raw' => '{{baseUrl}}/api/v1/chat/conversations/{{conversationId}}/messages', 'host' => ['{{baseUrl}}'], 'path' => ['api', 'v1', 'chat', 'conversations', '{{conversationId}}', 'messages']],
                        'description' => 'Sends a standard clean message to the conversation and triggers WebSocket broadcasts.',
                    ],
                ],
                [
                    'name' => 'POST Send Message (Automatic PII Redaction Verification)',
                    'event' => [$this->testStatus201('pm.test("PII was automatically redacted", function () { const d = pm.response.json().data; pm.expect(d.is_redacted).to.eql(true); pm.expect(d.body).to.include("[Phone Number Redacted for Safety]"); });')],
                    'request' => [
                        'method' => 'POST',
                        'header' => [
                            ['key' => 'Accept', 'value' => 'application/json'],
                            ['key' => 'Content-Type', 'value' => 'application/json'],
                        ],
                        'body' => [
                            'mode' => 'raw',
                            'raw' => json_encode([
                                'body' => 'Call me directly at 0917-555-1234 or email me at seller@example.com for off-platform payment.',
                            ], JSON_PRETTY_PRINT),
                        ],
                        'url' => ['raw' => '{{baseUrl}}/api/v1/chat/conversations/{{conversationId}}/messages', 'host' => ['{{baseUrl}}'], 'path' => ['api', 'v1', 'chat', 'conversations', '{{conversationId}}', 'messages']],
                        'description' => 'Demonstrates server-side PII filter redacting phone numbers, emails, social handles, and payment cards.',
                    ],
                ],
                [
                    'name' => 'POST Mark Conversation as Read',
                    'event' => [$this->testStatus200('pm.test("Mark read status returned", function () { const d = pm.response.json(); pm.expect(d.status).to.eql("success"); });')],
                    'request' => [
                        'method' => 'POST',
                        'header' => [
                            ['key' => 'Accept', 'value' => 'application/json'],
                        ],
                        'url' => ['raw' => '{{baseUrl}}/api/v1/chat/conversations/{{conversationId}}/read', 'host' => ['{{baseUrl}}'], 'path' => ['api', 'v1', 'chat', 'conversations', '{{conversationId}}', 'read']],
                        'description' => 'Marks all unread messages from the other user in this conversation as read and broadcasts MessageRead event.',
                    ],
                ],
            ],
        ];
    }

    private function broadcastingFolder(): array
    {
        return [
            'name' => '15. Real-time WebSockets & Broadcasting (Laravel Reverb)',
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
                    'name' => 'POST Authorize Private Conversation Channel (private-conversation.{id})',
                    'event' => [$this->testStatus200('pm.test("Conversation channel auth signature", function () { const d = pm.response.json(); pm.expect(d.auth).to.be.a("string"); });')],
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
                                'channel_name' => 'private-conversation.{{conversationId}}',
                            ], JSON_PRETTY_PRINT),
                        ],
                        'url' => ['raw' => '{{baseUrl}}/api/v1/broadcasting/auth', 'host' => ['{{baseUrl}}'], 'path' => ['api', 'v1', 'broadcasting', 'auth']],
                        'description' => 'Authenticates WebSocket connection to private 1:1 conversation message stream.',
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

    private function adminModerationAndRbacFolder(): array
    {
        return [
            'name' => '14. Administrator, KYC Review & Moderation Portal',
            'item' => [
                [
                    'name' => 'GET Moderation Cars Queue',
                    'event' => [$this->testStatus200('pm.test("Returns car queue", function () { const d = pm.response.json(); pm.expect(d.data).to.be.an("array"); });')],
                    'request' => [
                        'method' => 'GET',
                        'header' => [['key' => 'Accept', 'value' => 'application/json']],
                        'url' => [
                            'raw' => '{{baseUrl}}/api/v1/admin/moderation/cars?status=pending_inspection',
                            'host' => ['{{baseUrl}}'],
                            'path' => ['api', 'v1', 'admin', 'moderation', 'cars'],
                            'query' => [['key' => 'status', 'value' => 'pending_inspection']],
                        ],
                        'description' => 'Fetches cars in pending inspection or moderation queue.',
                    ],
                ],
                [
                    'name' => 'POST Schedule Inspection (Garage Drop-off / On-Site)',
                    'event' => [$this->testStatus200('pm.test("Inspection scheduled", function () { const d = pm.response.json(); pm.expect(d.data.inspection_status).to.eql("scheduled"); });')],
                    'request' => [
                        'method' => 'POST',
                        'header' => [
                            ['key' => 'Accept', 'value' => 'application/json'],
                            ['key' => 'Content-Type', 'value' => 'application/json'],
                        ],
                        'body' => [
                            'mode' => 'raw',
                            'raw' => json_encode([
                                'inspection_type' => 'garage_dropoff',
                                'inspection_date' => date('Y-m-d H:i:s', strtotime('+2 days')),
                                'inspection_location' => 'Makati Certified Bay 1',
                                'notes' => 'Underside rust and turbo manifold inspection',
                            ], JSON_PRETTY_PRINT),
                        ],
                        'url' => ['raw' => '{{baseUrl}}/api/v1/admin/moderation/cars/{{carId}}/schedule-inspection', 'host' => ['{{baseUrl}}'], 'path' => ['api', 'v1', 'admin', 'moderation', 'cars', '{{carId}}', 'schedule-inspection']],
                        'description' => 'Schedules an inspection slot (garage drop-off or mobile on-site visit).',
                    ],
                ],
                [
                    'name' => 'POST Record Inspection Results & Score',
                    'event' => [$this->testStatus200('pm.test("Inspection recorded", function () { const d = pm.response.json(); pm.expect(d.data.score).to.be.a("string"); });')],
                    'request' => [
                        'method' => 'POST',
                        'header' => [
                            ['key' => 'Accept', 'value' => 'application/json'],
                            ['key' => 'Content-Type', 'value' => 'application/json'],
                        ],
                        'body' => [
                            'mode' => 'raw',
                            'raw' => json_encode([
                                'passed' => true,
                                'inspection_score' => '96/100',
                                'inspector_notes' => 'Structural integrity and engine compression verified.',
                            ], JSON_PRETTY_PRINT),
                        ],
                        'url' => ['raw' => '{{baseUrl}}/api/v1/admin/moderation/cars/{{carId}}/record-inspection', 'host' => ['{{baseUrl}}'], 'path' => ['api', 'v1', 'admin', 'moderation', 'cars', '{{carId}}', 'record-inspection']],
                        'description' => 'Records inspection checklist result, condition score, and notes.',
                    ],
                ],
                [
                    'name' => 'POST Approve Vehicle Listing',
                    'event' => [$this->testStatus200('pm.test("Approved and active", function () { const d = pm.response.json(); pm.expect(d.data.status).to.eql("active"); pm.expect(d.data.is_approved).to.eql(true); });')],
                    'request' => [
                        'method' => 'POST',
                        'header' => [['key' => 'Accept', 'value' => 'application/json']],
                        'url' => ['raw' => '{{baseUrl}}/api/v1/admin/moderation/cars/{{carId}}/approve', 'host' => ['{{baseUrl}}'], 'path' => ['api', 'v1', 'admin', 'moderation', 'cars', '{{carId}}', 'approve']],
                        'description' => 'Approves vehicle build and publishes it live to public marketplace.',
                    ],
                ],
                [
                    'name' => 'POST Reject Vehicle Listing',
                    'event' => [$this->testStatus200('pm.test("Rejected listing", function () { const d = pm.response.json(); pm.expect(d.data.status).to.eql("rejected"); });')],
                    'request' => [
                        'method' => 'POST',
                        'header' => [
                            ['key' => 'Accept', 'value' => 'application/json'],
                            ['key' => 'Content-Type', 'value' => 'application/json'],
                        ],
                        'body' => [
                            'mode' => 'raw',
                            'raw' => json_encode([
                                'reason' => 'Failed roadworthiness braking test.',
                            ], JSON_PRETTY_PRINT),
                        ],
                        'url' => ['raw' => '{{baseUrl}}/api/v1/admin/moderation/cars/{{carId}}/reject', 'host' => ['{{baseUrl}}'], 'path' => ['api', 'v1', 'admin', 'moderation', 'cars', '{{carId}}', 'reject']],
                        'description' => 'Rejects listing with clear reason feedback to seller.',
                    ],
                ],
                [
                    'name' => 'GET Inspection Appointments',
                    'event' => [$this->testStatus200('pm.test("Appointments list", function () { const d = pm.response.json(); pm.expect(d.data).to.be.an("array"); });')],
                    'request' => [
                        'method' => 'GET',
                        'header' => [['key' => 'Accept', 'value' => 'application/json']],
                        'url' => ['raw' => '{{baseUrl}}/api/v1/admin/appointments', 'host' => ['{{baseUrl}}'], 'path' => ['api', 'v1', 'admin', 'appointments']],
                        'description' => 'Lists scheduled and completed inspection appointments with method filters.',
                    ],
                ],
                [
                    'name' => 'GET Chat Moderation Conversations',
                    'event' => [$this->testStatus200('pm.test("Chat audit list", function () { const d = pm.response.json(); pm.expect(d.data).to.be.an("array"); });')],
                    'request' => [
                        'method' => 'GET',
                        'header' => [['key' => 'Accept', 'value' => 'application/json']],
                        'url' => ['raw' => '{{baseUrl}}/api/v1/admin/chat/conversations?redacted_only=false', 'host' => ['{{baseUrl}}'], 'path' => ['api', 'v1', 'admin', 'chat', 'conversations']],
                        'description' => 'Audits conversations and identifies flagged/redacted PII messages.',
                    ],
                ],
                [
                    'name' => 'GET KYC Seller Verification Queue',
                    'event' => [$this->testStatus200('pm.test("KYC queue loaded", function () { const d = pm.response.json(); pm.expect(d.data).to.be.an("array"); });')],
                    'request' => [
                        'method' => 'GET',
                        'header' => [['key' => 'Accept', 'value' => 'application/json']],
                        'url' => [
                            'raw' => '{{baseUrl}}/api/v1/admin/kyc-verifications?status=pending',
                            'host' => ['{{baseUrl}}'],
                            'path' => ['api', 'v1', 'admin', 'kyc-verifications'],
                            'query' => [['key' => 'status', 'value' => 'pending']],
                        ],
                        'description' => 'Retrieves pending seller & dealer KYC submissions awaiting compliance document review.',
                    ],
                ],
                [
                    'name' => 'POST Approve KYC Verification & Grant Verified Badge',
                    'event' => [$this->testStatus200('pm.test("KYC approved and badge granted", function () { const d = pm.response.json(); pm.expect(d.user.is_kyc_verified).to.eql(true); });')],
                    'request' => [
                        'method' => 'POST',
                        'header' => [['key' => 'Accept', 'value' => 'application/json']],
                        'url' => ['raw' => '{{baseUrl}}/api/v1/admin/kyc-verifications/{{userId}}/approve', 'host' => ['{{baseUrl}}'], 'path' => ['api', 'v1', 'admin', 'kyc-verifications', '{{userId}}', 'approve']],
                        'description' => 'Approves seller identity credentials and assigns the official Verified Seller Badge.',
                    ],
                ],
                [
                    'name' => 'POST Reject KYC Verification with Reason',
                    'event' => [$this->testStatus200('pm.test("KYC rejected with feedback", function () { const d = pm.response.json(); pm.expect(d.user.is_kyc_verified).to.eql(false); });')],
                    'request' => [
                        'method' => 'POST',
                        'header' => [
                            ['key' => 'Accept', 'value' => 'application/json'],
                            ['key' => 'Content-Type', 'value' => 'application/json'],
                        ],
                        'body' => [
                            'mode' => 'raw',
                            'raw' => json_encode([
                                'reason' => 'Blurry photo scan. Please submit a clearer image of your government ID.',
                            ], JSON_PRETTY_PRINT),
                        ],
                        'url' => ['raw' => '{{baseUrl}}/api/v1/admin/kyc-verifications/{{userId}}/reject', 'host' => ['{{baseUrl}}'], 'path' => ['api', 'v1', 'admin', 'kyc-verifications', '{{userId}}', 'reject']],
                        'description' => 'Rejects KYC verification with formal compliance feedback to the seller.',
                    ],
                ],
                [
                    'name' => 'GET Admin User List with Roles',
                    'event' => [$this->testStatus200('pm.test("User list", function () { const d = pm.response.json(); pm.expect(d.data).to.be.an("array"); });')],
                    'request' => [
                        'method' => 'GET',
                        'header' => [['key' => 'Accept', 'value' => 'application/json']],
                        'url' => ['raw' => '{{baseUrl}}/api/v1/admin/users', 'host' => ['{{baseUrl}}'], 'path' => ['api', 'v1', 'admin', 'users']],
                        'description' => 'Lists buyers, sellers, dealers, and staff accounts.',
                    ],
                ],
                [
                    'name' => 'PATCH Update User Role (RBAC)',
                    'event' => [$this->testStatus200('pm.test("Role updated", function () { const d = pm.response.json(); pm.expect(d.user.role).to.eql("inspector"); });')],
                    'request' => [
                        'method' => 'PATCH',
                        'header' => [
                            ['key' => 'Accept', 'value' => 'application/json'],
                            ['key' => 'Content-Type', 'value' => 'application/json'],
                        ],
                        'body' => [
                            'mode' => 'raw',
                            'raw' => json_encode([
                                'role' => 'inspector',
                            ], JSON_PRETTY_PRINT),
                        ],
                        'url' => ['raw' => '{{baseUrl}}/api/v1/admin/users/{{userId}}/role', 'host' => ['{{baseUrl}}'], 'path' => ['api', 'v1', 'admin', 'users', '{{userId}}', 'role']],
                        'description' => 'Elevates or modifies user role across Super Admin, Admin, Inspector, Dealer, Seller, or Buyer.',
                    ],
                ],
            ],
        ];
    }

    private function nginxCachingFolder(): array
    {
        return [
            'name' => '16. Nginx Caching & Edge Performance',
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
