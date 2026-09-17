<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Usage: Route::middleware('role:seller')->... or 'role:buyer,seller'.
 * Returns 403 JSON when the authenticated user lacks the role.
 */
class EnsureUserRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (! $user || ! $user->hasRole(...$roles)) {
            return response()->json([
                'message' => 'Forbidden — insufficient role.',
                'required' => $roles,
            ], 403);
        }

        return $next($request);
    }
}
