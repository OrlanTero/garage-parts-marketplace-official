<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminKycController extends Controller
{
    /**
     * List users and KYC verification queue with filtering and summary metrics.
     */
    public function index(Request $request): JsonResponse
    {
        $status = $request->query('status', 'all');
        $role = $request->query('role');
        $search = $request->query('q');

        $query = User::query()
            ->withCount(['cars', 'parts', 'orders'])
            ->when($status && $status !== 'all', function ($q) use ($status) {
                if ($status === 'pending') {
                    $q->where('kyc_status', 'pending');
                } elseif ($status === 'approved') {
                    $q->where('kyc_status', 'approved')->where('is_kyc_verified', true);
                } elseif ($status === 'rejected') {
                    $q->where('kyc_status', 'rejected');
                } elseif ($status === 'not_submitted') {
                    $q->where(fn ($sub) => $sub->whereNull('kyc_status')->orWhere('kyc_status', 'not_submitted'));
                }
            })
            ->when($role && $role !== 'all', fn ($q) => $q->where('role', $role))
            ->when($search, function ($q, $s) {
                $q->where(fn ($sub) => $sub->where('name', 'like', "%{$s}%")
                    ->orWhere('username', 'like', "%{$s}%")
                    ->orWhere('email', 'like', "%{$s}%")
                    ->orWhere('kyc_document_number', 'like', "%{$s}%")
                );
            })
            ->orderByRaw("CASE WHEN kyc_status = 'pending' THEN 1 WHEN kyc_status = 'rejected' THEN 2 ELSE 3 END")
            ->orderByDesc('kyc_submitted_at')
            ->orderByDesc('created_at');

        $users = $query->paginate((int) ($request->query('per_page', 25)));

        $data = collect($users->items())->map(function (User $user) {
            $userRole = is_object($user->role) ? $user->role->value : $user->role;

            return [
                'id' => $user->id,
                'name' => $user->name,
                'username' => $user->username,
                'email' => $user->email,
                'role' => $userRole,
                'avatar_url' => $user->avatar_url,
                'agent_code' => $user->agent_code,
                'kyc_status' => $user->kyc_status ?? 'not_submitted',
                'is_kyc_verified' => (bool) ($user->is_kyc_verified && $user->kyc_status === 'approved'),
                'kyc_document_type' => $user->kyc_document_type,
                'kyc_document_number' => $user->kyc_document_number,
                'kyc_document_url' => $user->kyc_document_url,
                'kyc_selfie_url' => $user->kyc_selfie_url,
                'kyc_notes' => $user->kyc_notes,
                'kyc_rejection_reason' => $user->kyc_rejection_reason,
                'kyc_submitted_at' => $user->kyc_submitted_at?->toISOString(),
                'kyc_verified_at' => $user->kyc_verified_at?->toISOString(),
                'cars_count' => $user->cars_count ?? 0,
                'parts_count' => $user->parts_count ?? 0,
                'created_at' => $user->created_at?->toISOString(),
            ];
        });

        $stats = [
            'pending_verifications' => User::where('kyc_status', 'pending')->count(),
            'approved_merchants' => User::where('kyc_status', 'approved')->where('is_kyc_verified', true)->count(),
            'rejected_submissions' => User::where('kyc_status', 'rejected')->count(),
            'total_registered_sellers' => User::whereIn('role', ['seller', 'dealer', 'parts_seller'])->count(),
        ];

        return response()->json([
            'data' => $data,
            'stats' => $stats,
            'meta' => [
                'current_page' => $users->currentPage(),
                'last_page' => $users->lastPage(),
                'per_page' => $users->perPage(),
                'total' => $users->total(),
            ],
        ]);
    }

    /**
     * Approve user KYC verification and grant verified seller badge.
     */
    public function approve(Request $request, User $user): JsonResponse
    {
        $user->forceFill([
            'kyc_status' => 'approved',
            'is_kyc_verified' => true,
            'kyc_verified_at' => now(),
            'kyc_verified_by' => $request->user()?->id,
            'kyc_rejection_reason' => null,
        ])->save();

        return response()->json([
            'message' => "KYC verification for @{$user->username} approved successfully. Verified Seller Badge granted.",
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'username' => $user->username,
                'email' => $user->email,
                'kyc_status' => $user->kyc_status,
                'is_kyc_verified' => true,
                'kyc_verified_at' => $user->kyc_verified_at->toISOString(),
            ],
        ]);
    }

    /**
     * Reject user KYC verification with formal compliance reason.
     */
    public function reject(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'reason' => ['required', 'string', 'max:1000'],
        ]);

        $user->forceFill([
            'kyc_status' => 'rejected',
            'is_kyc_verified' => false,
            'kyc_rejection_reason' => $validated['reason'],
            'kyc_verified_by' => $request->user()?->id,
        ])->save();

        return response()->json([
            'message' => "KYC verification for @{$user->username} rejected.",
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'username' => $user->username,
                'email' => $user->email,
                'kyc_status' => $user->kyc_status,
                'is_kyc_verified' => false,
                'kyc_rejection_reason' => $user->kyc_rejection_reason,
            ],
        ]);
    }
}
