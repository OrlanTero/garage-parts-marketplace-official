<?php

namespace App\Http\Controllers\Api;

use App\Enums\SellerApplicationStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\SellerApplicationResource;
use App\Models\SellerApplication;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminSellerApplicationController extends Controller
{
    /**
     * List buyer-to-seller upgrade applications with filtering and summary metrics.
     */
    public function index(Request $request): JsonResponse
    {
        $status = $request->query('status', 'all');
        $role = $request->query('requested_role');
        $search = $request->query('q');

        $query = SellerApplication::query()
            ->with(['user', 'reviewer:id,name,username'])
            ->when($status && $status !== 'all', fn ($q) => $q->where('status', $status))
            ->when($role && $role !== 'all', fn ($q) => $q->where('requested_role', $role))
            ->when($search, function ($q) use ($search) {
                $q->where(function ($group) use ($search) {
                    $group->where(fn ($sub) => $sub->where('shop_name', 'like', "%{$search}%")
                        ->orWhere('contact_phone', 'like', "%{$search}%")
                        ->orWhere('city', 'like', "%{$search}%"))
                        ->orWhereHas('user', fn ($u) => $u
                            ->where('name', 'like', "%{$search}%")
                            ->orWhere('username', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%"));
                });
            })
            ->orderByRaw("CASE WHEN status = 'pending' THEN 1 WHEN status = 'rejected' THEN 2 ELSE 3 END")
            ->orderByDesc('created_at');

        $applications = $query->paginate((int) ($request->query('per_page', 25)));

        $stats = [
            'pending_applications' => SellerApplication::where('status', SellerApplicationStatus::Pending->value)->count(),
            'approved_applications' => SellerApplication::where('status', SellerApplicationStatus::Approved->value)->count(),
            'rejected_applications' => SellerApplication::where('status', SellerApplicationStatus::Rejected->value)->count(),
            'withdrawn_applications' => SellerApplication::where('status', SellerApplicationStatus::Withdrawn->value)->count(),
        ];

        return response()->json([
            'data' => SellerApplicationResource::collection($applications),
            'stats' => $stats,
            'meta' => [
                'current_page' => $applications->currentPage(),
                'last_page' => $applications->lastPage(),
                'per_page' => $applications->perPage(),
                'total' => $applications->total(),
            ],
        ]);
    }

    /**
     * Approve an upgrade application and atomically grant the requested seller role.
     * Security gate: the applicant must hold a verified KYC badge.
     */
    public function approve(Request $request, SellerApplication $application): JsonResponse
    {
        $validated = $request->validate([
            'review_notes' => ['nullable', 'string', 'max:1000'],
        ]);

        if (!$application->isPending()) {
            return response()->json([
                'message' => 'Only pending applications can be approved.',
            ], 422);
        }

        $applicant = $application->user;

        if (!$applicant || !$applicant->isKycVerified()) {
            return response()->json([
                'message' => 'Applicant KYC verification is required before granting seller privileges. Approve the KYC submission first.',
                'errors' => ['kyc' => ['Verified KYC badge required.']],
                'code' => 'kyc_verification_required',
            ], 422);
        }

        DB::transaction(function () use ($application, $applicant, $validated, $request) {
            $application->forceFill([
                'status' => SellerApplicationStatus::Approved->value,
                'review_notes' => $validated['review_notes'] ?? null,
                'reviewed_by' => $request->user()?->id,
                'reviewed_at' => now(),
            ])->save();

            $applicant->forceFill(['role' => $application->requested_role])->save();
        });

        return response()->json([
            'message' => "@{$applicant->username} approved and upgraded to {$application->requested_role}.",
            'application' => (new SellerApplicationResource($application->fresh(['user', 'reviewer'])))->resolve(),
        ]);
    }

    /**
     * Reject an upgrade application with a formal reason. Buyer role is kept.
     */
    public function reject(Request $request, SellerApplication $application): JsonResponse
    {
        $validated = $request->validate([
            'reason' => ['required', 'string', 'max:1000'],
            'review_notes' => ['nullable', 'string', 'max:1000'],
        ]);

        if (!$application->isPending()) {
            return response()->json([
                'message' => 'Only pending applications can be rejected.',
            ], 422);
        }

        $application->forceFill([
            'status' => SellerApplicationStatus::Rejected->value,
            'review_notes' => trim($validated['reason'] . ($validated['review_notes'] ?? '' ? "\n\n{$validated['review_notes']}" : '')),
            'reviewed_by' => $request->user()?->id,
            'reviewed_at' => now(),
        ])->save();

        return response()->json([
            'message' => "Seller application for @{$application->user->username} rejected.",
            'application' => (new SellerApplicationResource($application->fresh(['user', 'reviewer'])))->resolve(),
        ]);
    }
}
