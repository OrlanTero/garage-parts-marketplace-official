<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        // Pure Bearer-token API (Personal Access Tokens) — stateless.
        // Do NOT call $middleware->statefulApi() here: that makes every
        // request from SANCTUM_STATEFUL_DOMAINS require a CSRF/XSRF token
        // and is the cause of 419 "CSRF token mismatch" on register/login.
        // If you later switch to SPA cookie auth, re-enable statefulApi()
        // and make the frontend fetch /sanctum/csrf-cookie before auth calls.

        // Session module: role guard — use as `role:buyer`, `role:seller`, ...
        $middleware->alias(['role' => \App\Http\Middleware\EnsureUserRole::class]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();
