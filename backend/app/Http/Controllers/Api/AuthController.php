<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Resources\UserResource;
use App\Services\AuthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AuthController extends Controller
{
    public function __construct(private AuthService $auth) {}

    public function register(RegisterRequest $request): JsonResponse
    {
        $user = $this->auth->register($request->validated());
        $token = $this->auth->issueToken($user, $request->input('device_name'));

        return response()->json([
            'token' => $token,
            'token_type' => 'Bearer',
            'user' => new UserResource($user),
        ], 201);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $user = $this->auth->login($request->email, $request->password);
        $token = $this->auth->issueToken($user, $request->input('device_name'));

        return response()->json([
            'token' => $token,
            'token_type' => 'Bearer',
            'user' => new UserResource($user),
        ]);
    }

    /** Revoke only the token used for this request. */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();

        return response()->json(['message' => 'Logged out.']);
    }

    /** Revoke ALL tokens (log out everywhere). */
    public function logoutAll(Request $request): JsonResponse
    {
        $request->user()->tokens()->delete();

        return response()->json(['message' => 'Logged out of all sessions.']);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json(new UserResource($request->user()));
    }

    /** PATCH /auth/profile — update own display profile. */
    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user();

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'username' => ['sometimes', 'string', 'max:50', 'alpha_dash', Rule::unique('users', 'username')->ignore($user->id)],
            'phone' => ['sometimes', 'nullable', 'string', 'max:50'],
            'avatar_url' => ['sometimes', 'nullable', 'url', 'max:500'],
            'agent_tagline' => ['sometimes', 'nullable', 'string', 'max:255'],
        ]);

        $user->update($data);

        return response()->json(new UserResource($user->refresh()));
    }

    /** POST /auth/password — change own password. */
    public function changePassword(Request $request): JsonResponse
    {
        $user = $request->user();

        $data = $request->validate([
            'current_password' => ['required', 'string', 'current_password'],
            'password' => ['required', 'string', 'min:8', 'max:100', 'confirmed'],
        ]);

        $user->forceFill(['password' => $data['password']])->save();

        return response()->json(['message' => 'Password updated.']);
    }

    /**
     * POST /auth/onboarding — setup wizard persistence.
     * Saves interest picks anytime; stamps completion when { complete: true }.
     * Everything else in the wizard (KYC, agent) is optional and skippable.
     */
    public function saveOnboarding(Request $request): JsonResponse
    {
        $user = $request->user();

        $data = $request->validate([
            'interests' => ['sometimes', 'array', 'max:30'],
            'interests.*' => ['string', 'max:60'],
            'complete' => ['sometimes', 'boolean'],
        ]);

        if (array_key_exists('interests', $data)) {
            $user->interests = array_values(array_unique($data['interests']));
        }
        if (! empty($data['complete'])) {
            $user->onboarding_completed_at = $user->onboarding_completed_at ?? now();
        }
        $user->save();

        return response()->json(new UserResource($user->refresh()));
    }
}
