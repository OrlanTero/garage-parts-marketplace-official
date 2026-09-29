<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Services\MediaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class KycController extends Controller
{
    public function __construct(
        protected MediaService $mediaService
    ) {}

    /**
     * Get the authenticated user's KYC verification status and history.
     */
    public function status(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'kyc' => [
                'status' => $user->kyc_status ?? 'not_submitted',
                'is_verified' => (bool) ($user->is_kyc_verified && $user->kyc_status === 'approved'),
                'document_type' => $user->kyc_document_type,
                'document_number' => $user->kyc_document_number,
                'document_url' => $user->kyc_document_url,
                'selfie_url' => $user->kyc_selfie_url,
                'notes' => $user->kyc_notes,
                'rejection_reason' => $user->kyc_rejection_reason,
                'submitted_at' => $user->kyc_submitted_at?->toISOString(),
                'verified_at' => $user->kyc_verified_at?->toISOString(),
            ],
            'user' => (new UserResource($user))->resolve(),
        ]);
    }

    /**
     * Submit or re-submit KYC verification documents for seller account accreditation.
     */
    public function submit(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'document_type' => ['required', 'string', 'max:50'],
            'document_number' => ['required', 'string', 'max:100'],
            'document_file' => ['nullable', 'file', 'mimes:jpeg,png,jpg,webp,pdf', 'max:10240'],
            'document_url' => ['nullable', 'string', 'max:500'],
            'selfie_file' => ['nullable', 'file', 'mimes:jpeg,png,jpg,webp', 'max:10240'],
            'selfie_url' => ['nullable', 'string', 'max:500'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $user = $request->user();
        $docUrl = $validated['document_url'] ?? $user->kyc_document_url;
        $selfieUrl = $validated['selfie_url'] ?? $user->kyc_selfie_url;

        // Process uploaded ID document if present
        if ($request->hasFile('document_file')) {
            $media = $this->mediaService->upload($request->file('document_file'), [
                'folder' => 'kyc/documents/' . date('Y/m'),
            ]);
            $docUrl = $media->url;
        }

        // Process uploaded selfie with ID if present
        if ($request->hasFile('selfie_file')) {
            $media = $this->mediaService->upload($request->file('selfie_file'), [
                'folder' => 'kyc/selfies/' . date('Y/m'),
            ]);
            $selfieUrl = $media->url;
        }

        if (!$docUrl) {
            return response()->json([
                'message' => 'A valid government-issued ID or business documentation is required.',
                'errors' => ['document_file' => ['Document file or document URL must be provided.']],
            ], 422);
        }

        $user->forceFill([
            'kyc_status' => 'pending',
            'is_kyc_verified' => false,
            'kyc_document_type' => $validated['document_type'],
            'kyc_document_number' => $validated['document_number'],
            'kyc_document_url' => $docUrl,
            'kyc_selfie_url' => $selfieUrl,
            'kyc_notes' => $validated['notes'] ?? $user->kyc_notes,
            'kyc_rejection_reason' => null,
            'kyc_submitted_at' => now(),
        ])->save();

        return response()->json([
            'message' => 'KYC verification submitted successfully. Our compliance team will review your credentials.',
            'kyc' => [
                'status' => $user->kyc_status,
                'is_verified' => false,
                'document_type' => $user->kyc_document_type,
                'document_number' => $user->kyc_document_number,
                'document_url' => $user->kyc_document_url,
                'selfie_url' => $user->kyc_selfie_url,
                'submitted_at' => $user->kyc_submitted_at->toISOString(),
            ],
            'user' => (new UserResource($user->refresh()))->resolve(),
        ], 200);
    }
}
