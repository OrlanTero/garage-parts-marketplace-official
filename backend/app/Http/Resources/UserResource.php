<?php

namespace App\Http\Resources;

use App\Enums\UserRole;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** Canonical session user shape — backend ↔ frontend contract. */
class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $role = $this->role instanceof UserRole ? $this->role->value : $this->role;

        return [
            'id' => $this->id,
            'name' => $this->name,
            'username' => $this->username,
            'email' => $this->email,
            'phone' => $this->phone,
            'is_house' => (bool) $this->isHouse(),
            'is_house_staff' => (bool) ($this->is_house_staff ?? false),
            'manages_house_catalog' => (bool) $this->managesHouseCatalog(),
            'role' => $role,
            'provider' => $this->provider,
            'avatar_url' => $this->avatar_url,
            'interests' => $this->interests ?? [],
            'has_address' => \App\Models\Address::where('user_id', $this->id)->exists(),
            'onboarding_completed_at' => $this->onboarding_completed_at,
            'needs_onboarding' => $this->onboarding_completed_at === null,
            'perks_status' => $this->perks_status ?? 'inactive',
            'is_perks_member' => (bool) \App\Services\PerksService::isActive($this->resource),
            'perks_expires_at' => $this->perks_expires_at,
            'agent_code' => $this->agent_code,
            'commission_rate' => $this->commission_rate !== null ? (float) $this->commission_rate : null,
            'commission_car_pct' => \App\Services\AgentService::commissionFor('car', $this->commission_rate !== null ? (float) $this->commission_rate : null),
            'commission_part_pct' => \App\Services\AgentService::commissionFor('part', $this->commission_rate !== null ? (float) $this->commission_rate : null),
            'is_agent' => (bool) $this->isAgentActive(),
            'is_agent_active' => (bool) $this->isAgentActive(),
            'agent_subscription_status' => $this->agent_subscription_status ?? 'inactive',
            'agent_expires_at' => $this->agent_expires_at?->toISOString(),
            'referred_by_user_id' => $this->referred_by_user_id,
            'agent_tagline' => $this->agent_tagline,
            'kyc_status' => $this->kyc_status ?? 'not_submitted',
            'is_kyc_verified' => (bool) ($this->is_kyc_verified && $this->kyc_status === 'approved'),
            'kyc_document_type' => $this->kyc_document_type,
            'kyc_submitted_at' => $this->kyc_submitted_at?->toISOString(),
            'kyc_verified_at' => $this->kyc_verified_at?->toISOString(),
            'kyc_rejection_reason' => $this->kyc_rejection_reason,
            'email_verified_at' => $this->email_verified_at,
            'last_login_at' => $this->last_login_at,
        ];
    }
}
