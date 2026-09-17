<?php

return [

    'default' => env('REVERB_SERVER', 'reverb'),

    'servers' => [
        'reverb' => [
            'host' => env('REVERB_HOST', '127.0.0.1'),
            'port' => env('REVERB_PORT', 8080),
            'hostname' => env('REVERB_HOSTNAME', 'localhost'),
            'options' => ['tls' => []],
            'max_request_size' => 10_000,
            'scaling' => [
                'enabled' => env('REVERB_SCALING_ENABLED', false),
                'channel' => env('REVERB_SCALING_CHANNEL', 'reverb'),
                'server' => [
                    'url' => env('REDIS_URL'),
                    'host' => env('REDIS_HOST', '127.0.0.1'),
                    'port' => env('REDIS_PORT', '6379'),
                    'username' => env('REDIS_USERNAME'),
                    'password' => env('REDIS_PASSWORD'),
                    'database' => env('REDIS_DB', '0'),
                ],
            ],
        ],
    ],

    'apps' => [
        [
            'app_id' => env('REVERB_APP_ID', '1001'),
            'key' => env('REVERB_APP_KEY', 'local-key'),
            'secret' => env('REVERB_APP_SECRET', 'local-secret'),
            'ping_interval' => 60,
            'activity_timeout' => 30,
            'allowed_origins' => ['*'],
            'max_message_size' => 10_000,
        ],
    ],
];
