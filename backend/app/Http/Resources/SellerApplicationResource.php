<?php

namespace App\Http\Resources;

use App\Enums\SellerApplicationStatus;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** Canonical seller-upgrade application shape — backend ↔ frontend/admin contract. */
class SellerApplicationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $status = $this->status instanceof SellerApplicationStatus
            ? $this->status->value
            : $this->status;

        return [
            'id' => $this->id,
            'requested_role' => $this->requested_role,
            'status' => $status,
            'shop_name' => $this->shop_name,
            'contact_phone' => $this->contact_phone,
            'city' => $this->city,
            'address' => $this->address,
            'reason' => $this->reason,
            'review_notes' => $this->review_notes,
            'reviewed_at' => $this->reviewed_at?->toISOString(),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
            'applicant' => $this->whenLoaded('user', function () {
                $applicant = $this->user;

                return [
                    'id' => $applicant->id,
                    'name' => $applicant->name,
                    'username' => $applicant->username,
                    'email' => $applicant->email,
                    'role' => $applicant->role instanceof \App\Enums\UserRole ? $applicant->role->value : $applicant->role,
                    'avatar_url' => $applicant->avatar_url,
                    'kyc_status' => $applicant->kyc_status ?? 'not_submitted',
                    'is_kyc_verified' => (bool) ($applicant->is_kyc_verified && $applicant->kyc_status === 'approved'),
                    'kyc_document_type' => $applicant->kyc_document_type,
                    'kyc_document_number' => $applicant->kyc_document_number,
                    'kyc_submitted_at' => $applicant->kyc_submitted_at?->toISOString(),
                    'kyc_verified_at' => $applicant->kyc_verified_at?->toISOString(),
                ];
            }),
            'reviewer' => $this->whenLoaded('reviewer', function () {
                return [
                    'id' => $this->reviewer->id,
                    'name' => $this->reviewer->name,
                    'username' => $this->reviewer->username,
                ];
            }),
        ];
    }
}
