<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Every /api/* response must be JSON — including auth failures.
 * Without this, a browser/curl request (Accept: text/html) that hits
 * auth:sanctum takes the redirect branch inside Authenticate, which
 * calls route('login') and fatals with "Route [login] not defined"
 * because this API-only app has no web login route.
 */
class ForceJsonResponse
{
    public function handle(Request $request, Closure $next): Response
    {
        if (!$request->is('api/*')) {
            return $next($request);
        }

        $request->headers->set('Accept', 'application/json');

        return $next($request);
    }
}
