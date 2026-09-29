<?php

namespace App\Services;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

/**
 * Session core: credential register/login + OAuth find-or-create + token minting.
 * Controllers stay thin; all session rules live here.
 */
class AuthService
{
    public function register(array $data): User
    {
        // Agent recruitment referral: ?ref=AGENT-CODE captured at signup.
        // Any valid agent_code qualifies as referrer; the ₱50 wallet reward
        // is only paid later when this user ALSO becomes an active agent
        // (verified KYC + paid yearly subscription).
        $referralInput = trim((string) ($data['referral_code'] ?? $data['ref'] ?? $data['agent_code'] ?? ''));
        $referredById = null;
        if ($referralInput !== '') {
            $referrer = User::where('agent_code', $referralInput)->first();
            if ($referrer && empty($data['__skip_self_referral_check'])) {
                $referredById = $referrer->id;
            }
        }

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => $data['password'], // 'hashed' cast handles bcrypt
            'role' => $data['role'] ?? UserRole::Buyer->value,
            'referred_by_user_id' => $referredById,
            'is_agent' => false,
            'agent_subscription_status' => 'inactive',
        ]);

        // Guard against self-referral on code collision (agent_code is random, but be safe).
        if ($referredById && (int) $referredById === (int) $user->id) {
            $user->forceFill(['referred_by_user_id' => null])->save();
        }

        return $user->refresh();
    }

    /** @throws ValidationException on bad credentials */
    public function login(string $email, string $password): User
    {
        $user = User::where('email', $email)->first();

        if (! $user || ! Hash::check($password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        $user->forceFill(['last_login_at' => now()])->save();

        return $user;
    }

    public function issueToken(User $user, ?string $device = null): string
    {
        $name = $device ?: request()->header('User-Agent', 'api-token');
        $role = $user->role instanceof UserRole ? $user->role->value : $user->role;

        return $user->createToken("{$role}|{$name}")->plainTextToken;
    }

    /**
     * OAuth find-or-create: same provider+id wins; otherwise link by email
     * (fills provider fields on a password account); otherwise create.
     */
    public function findOrCreateOAuthUser(
        string $provider,
        string $providerId,
        string $email,
        string $name,
        ?string $avatar = null,
        string $role = 'buyer',
    ): User {
        $role = in_array($role, UserRole::selfSelectable(), true) ? $role : UserRole::Buyer->value;

        $user = User::where('provider', $provider)
            ->where('provider_id', $providerId)
            ->first();

        if ($user) {
            $user->forceFill([
                'avatar_url' => $avatar ?? $user->avatar_url,
                'last_login_at' => now(),
            ])->save();

            return $user;
        }

        $user = User::where('email', $email)->first();

        if ($user) {
            $user->forceFill([
                'provider' => $provider,
                'provider_id' => $providerId,
                'avatar_url' => $avatar ?? $user->avatar_url,
                'last_login_at' => now(),
            ])->save();

            return $user;
        }

        return User::create([
            'name' => $name,
            'email' => $email,
            'password' => str()->random(32), // unusable random; OAuth-only until reset
            'role' => $role,
            'provider' => $provider,
            'provider_id' => $providerId,
            'avatar_url' => $avatar,
            'email_verified_at' => now(), // provider-verified email
            'last_login_at' => now(),
        ]);
    }
}
