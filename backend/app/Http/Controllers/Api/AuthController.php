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
     * Saves interest picks anytime; saves the required profile
     * (name/phone) and default delivery address when provided; stamps
     * completion when { complete: true } — refused until the required
     * profile info exists, so OAuth signups can't bypass registration
     * details by skipping the wizard.
     */
    public function saveOnboarding(Request $request): JsonResponse
    {
        $user = $request->user();

        $data = $request->validate([
            'interests' => ['sometimes', 'array', 'max:30'],
            'interests.*' => ['string', 'max:60'],
            'name' => ['sometimes', 'string', 'max:255'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:50'],
            'address' => ['sometimes', 'array'],
            'address.address_line' => ['required_with:address', 'string', 'max:500'],
            'address.city' => ['nullable', 'string', 'max:120'],
            'address.postal_code' => ['nullable', 'string', 'max:30'],
            'address.phone' => ['nullable', 'string', 'max:50'],
            'address.latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'address.longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'address.landmark' => ['nullable', 'string', 'max:500'],
            'complete' => ['sometimes', 'boolean'],
        ]);

        if (array_key_exists('interests', $data)) {
            $user->interests = array_values(array_unique($data['interests']));
        }
        if (!empty($data['name'])) {
            $user->name = trim($data['name']);
        }
        if (array_key_exists('phone', $data)) {
            $phone = trim((string) ($data['phone'] ?? ''));
            $user->phone = $phone !== '' ? $phone : $user->phone;
        }
        if (!empty($data['address'])) {
            $this->saveDefaultAddress($user, $data['address']);
        }
        $user->save();

        if (! empty($data['complete'])) {
            $user->refresh();
            if (empty($user->phone) || !\App\Models\Address::where('user_id', $user->id)->exists()) {
                return response()->json([
                    'message' => 'Complete your profile details first — mobile number and delivery address are required.',
                ], 422);
            }
            $user->onboarding_completed_at = $user->onboarding_completed_at ?? now();
            $user->save();
        }

        return response()->json(new UserResource($user->refresh()));
    }

    /** Create or refresh the user's default delivery address book entry. */
    private function saveDefaultAddress(\App\Models\User $user, array $address): void
    {
        $existing = \App\Models\Address::where('user_id', $user->id)
            ->orderByDesc('is_default')
            ->orderBy('id')
            ->first();

        $payload = [
            'recipient_name' => $user->name,
            'phone' => $address['phone'] ?? $user->phone,
            'address_line' => $address['address_line'],
            'city' => $address['city'] ?? null,
            'postal_code' => $address['postal_code'] ?? null,
            'latitude' => $address['latitude'] ?? null,
            'longitude' => $address['longitude'] ?? null,
            'landmark' => $address['landmark'] ?? null,
        ];

        if ($existing) {
            $existing->update($payload);
            return;
        }

        \App\Models\Address::create([
            ...$payload,
            'user_id' => $user->id,
            'label' => 'Home',
            'is_default' => true,
        ]);
    }
}
