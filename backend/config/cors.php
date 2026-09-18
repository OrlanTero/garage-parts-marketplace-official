<?php

$rawOrigins = array_merge(
    explode(',', (string) env('CORS_ALLOWED_ORIGINS', '')),
    explode(',', (string) env('FRONTEND_URL', '')),
    explode(',', (string) env('ADMIN_URL', ''))
);

$sanitizedOrigins = array_values(array_unique(array_filter(array_map(function ($origin) {
    return rtrim(trim($origin), '/');
}, $rawOrigins))));

if (empty($sanitizedOrigins)) {
    $sanitizedOrigins = [
        'http://localhost:5173',
        'http://localhost:5174',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:5174',
    ];
}

return [

    'paths' => ['api/*', 'sanctum/csrf-cookie', 'broadcasting/*'],

    'allowed_methods' => ['*'],

    'allowed_origins' => $sanitizedOrigins,

    'allowed_origins_patterns' => [
        '#^https?://localhost(:\d+)?$#',
        '#^https?://127\.0\.0\.1(:\d+)?$#',
        '#^https?://.*\.vercel\.app$#',
        '#^https?://.*\.pages\.dev$#',
        '#^https?://.*\.onrender\.com$#',
    ],

    'allowed_headers' => ['*'],

    'exposed_headers' => ['*'],

    'max_age' => 86400,

    'supports_credentials' => true,

];
