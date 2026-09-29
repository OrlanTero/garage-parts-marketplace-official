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

        // All /api/* traffic speaks JSON (see ForceJsonResponse). Global
        // (path-guarded inside) so it can never be skipped by group
        // resolution quirks on auth-failing requests.
        $middleware->append(\App\Http\Middleware\ForceJsonResponse::class);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        // API-only app: no web `login` route exists, so the framework's
        // default redirect for unauthenticated requests fatals with
        // "Route [login] not defined". Answer JSON 401 on /api/* instead.
        $exceptions->render(function (\Illuminate\Auth\AuthenticationException $e, \Illuminate\Http\Request $request) {
            if ($request->is('api/*')) {
                return response()->json(['message' => 'Unauthenticated.'], 401);
            }
        });
    })->create();
