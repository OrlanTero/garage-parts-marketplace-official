<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Services\AuthService;
use Illuminate\Http\Request;
use Laravel\Socialite\Facades\Socialite;

/**
 * OAuth login (Google + allowlisted providers) for SPA + Postman.
 *
 * - GET .../redirect → JSON { url } by default (Postman-friendly).
 *   Add ?frontend=1 to 302-redirect instead (browser flow).
 * - GET .../callback → exchanges code, mints Sanctum token, JSON { token, user }.
 *   Add ?frontend=1 (or a text/html Accept) to 302 to FRONTEND_URL/oauth/callback?token=...
 */
class OAuthController extends Controller
{
    /** Providers this session module supports. Keys must exist in config/services.php. */
    public const ALLOWED = ['google', 'facebook', 'github'];

    public function __construct(private AuthService $auth) {}

    private function guard(string $provider): ?\Illuminate\Http\JsonResponse
    {
        if (! in_array($provider, self::ALLOWED, true)) {
            return response()->json([
                'message' => "Unsupported OAuth provider '{$provider}'.",
                'supported' => self::ALLOWED,
            ], 422);
        }

        if (! config("services.{$provider}.client_id")) {
            return response()->json([
                'message' => "Provider '{$provider}' is not configured. Set "
                    .strtoupper($provider).'_CLIENT_ID/_SECRET/_REDIRECT_URI in backend .env.',
            ], 503);
        }

        return null;
    }

    public function redirect(Request $request, string $provider)
    {
        if ($error = $this->guard($provider)) {
            return $error;
        }

        $request->validate(['role' => ['sometimes', 'in:buyer,seller']]);

        // Stateless: no session needed for pure API/SPA. Role intent is
        // round-tripped via `state` so signup keeps buyer/seller choice.
        $driver = Socialite::driver($provider)->stateless();
        if ($role = $request->query('role')) {
            $driver->with(['state' => $role]);
        }

        $url = $driver->redirect()->getTargetUrl();

        if ($request->boolean('frontend')) {
            return redirect($url);
        }

        return response()->json(['url' => $url]);
    }

    public function callback(Request $request, string $provider)
    {
        if ($error = $this->guard($provider)) {
            return $error;
        }

        $request->validate(['role' => ['sometimes', 'in:buyer,seller']]);

        try {
            $oauthUser = Socialite::driver($provider)->stateless()->user();
        } catch (\Throwable $e) {
            return response()->json([
                'message' => 'OAuth exchange failed.',
                'error' => config('app.debug') ? $e->getMessage() : null,
            ], 401);
        }

        $role = $request->input('role', $request->query('state', 'buyer'));

        $user = $this->auth->findOrCreateOAuthUser(
            provider: $provider,
            providerId: (string) $oauthUser->getId(),
            email: (string) $oauthUser->getEmail(),
            name: (string) ($oauthUser->getName() ?: $oauthUser->getNickname() ?: 'User'),
            avatar: $oauthUser->getAvatar(),
            role: $role,
        );

        $token = $this->auth->issueToken($user, "oauth:{$provider}");

        // Browser flow → hand the token to the SPA via redirect.
        if ($request->boolean('frontend') || str_contains($request->header('Accept', ''), 'text/html')) {
            $target = rtrim((string) env('FRONTEND_URL', 'http://localhost:5173'), '/')
                .'/oauth/callback?'.http_build_query(['token' => $token, 'provider' => $provider]);

            return redirect($target);
        }

        return response()->json([
            'token' => $token,
            'token_type' => 'Bearer',
            'provider' => $provider,
            'user' => new UserResource($user),
        ]);
    }
}
