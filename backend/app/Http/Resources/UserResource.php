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
            'role' => $role,
            'provider' => $this->provider,
            'avatar_url' => $this->avatar_url,
            'agent_code' => $this->agent_code,
            'commission_rate' => (float) ($this->commission_rate ?? 5.00),
            'is_agent' => (bool) ($this->is_agent ?? true),
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
