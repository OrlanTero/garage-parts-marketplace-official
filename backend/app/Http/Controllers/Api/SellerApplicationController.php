<?php

namespace App\Http\Controllers\Api;

use App\Enums\SellerApplicationStatus;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Resources\SellerApplicationResource;
use App\Models\SellerApplication;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SellerApplicationController extends Controller
{
    /**
     * List the authenticated user's own upgrade applications (latest first)
     * plus eligibility flags consumed by the Become-a-Seller flow.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $applications = SellerApplication::query()
            ->where('user_id', $user->id)
            ->with(['user', 'reviewer:id,name,username'])
            ->orderByDesc('created_at')
            ->paginate((int) ($request->query('per_page', 10)));

        $pending = SellerApplication::query()
            ->where('user_id', $user->id)
            ->where('status', SellerApplicationStatus::Pending->value)
            ->latest()
            ->first();

        return response()->json([
            'data' => SellerApplicationResource::collection($applications),
            'meta' => [
                'current_page' => $applications->currentPage(),
                'last_page' => $applications->lastPage(),
                'per_page' => $applications->perPage(),
                'total' => $applications->total(),
            ],
            'eligibility' => [
                'current_role' => $user->role instanceof UserRole ? $user->role->value : $user->role,
                'can_apply' => $this->canApply($user),
                'kyc_verified' => $user->isKycVerified(),
                'kyc_status' => $user->kyc_status ?? 'not_submitted',
                'pending_application' => $pending ? (new SellerApplicationResource($pending))->resolve() : null,
            ],
        ]);
    }

    /**
     * Submit a buyer-to-seller upgrade application for admin review.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'requested_role' => ['required', 'string', 'in:seller,dealer,parts_seller'],
            'shop_name' => ['required', 'string', 'max:120'],
            'contact_phone' => ['required', 'string', 'max:30'],
            'city' => ['required', 'string', 'max:100'],
            'address' => ['nullable', 'string', 'max:255'],
            'reason' => ['nullable', 'string', 'max:1000'],
        ]);

        $user = $request->user();

        if (!$this->canApply($user)) {
            $role = $user->role instanceof UserRole ? $user->role->value : $user->role;

            return response()->json([
                'message' => 'Only buyer accounts may apply for a seller upgrade.',
                'errors' => ['role' => ["Accounts with role '{$role}' already have selling privileges or are staff."]],
            ], 422);
        }

        $existing = SellerApplication::query()
            ->where('user_id', $user->id)
            ->where('status', SellerApplicationStatus::Pending->value)
            ->first();

        if ($existing) {
            return response()->json([
                'message' => 'You already have a pending seller application under review.',
                'errors' => ['requested_role' => ['Withdraw the pending application before submitting a new one.']],
                'application' => (new SellerApplicationResource($existing))->resolve(),
            ], 422);
        }

        $application = SellerApplication::create([
            'user_id' => $user->id,
            'requested_role' => $validated['requested_role'],
            'status' => SellerApplicationStatus::Pending->value,
            'shop_name' => $validated['shop_name'],
            'contact_phone' => $validated['contact_phone'],
            'city' => $validated['city'],
            'address' => $validated['address'] ?? null,
            'reason' => $validated['reason'] ?? null,
        ]);

        return response()->json([
            'message' => 'Seller application submitted successfully. Our team will review your request.',
            'application' => (new SellerApplicationResource($application->load('user')))->resolve(),
        ], 201);
    }

    /**
     * Withdraw the applicant's own pending application.
     */
    public function withdraw(Request $request, SellerApplication $application): JsonResponse
    {
        if ((int) $application->user_id !== (int) $request->user()->id) {
            return response()->json(['message' => 'Forbidden — this application belongs to another account.'], 403);
        }

        if (!$application->isPending()) {
            return response()->json([
                'message' => 'Only pending applications can be withdrawn.',
            ], 422);
        }

        $application->forceFill(['status' => SellerApplicationStatus::Withdrawn->value])->save();

        return response()->json([
            'message' => 'Seller application withdrawn. You may submit a new application anytime.',
            'application' => (new SellerApplicationResource($application->fresh()))->resolve(),
        ]);
    }

    private function canApply($user): bool
    {
        $role = $user->role instanceof UserRole ? $user->role->value : $user->role;

        return $role === UserRole::Buyer->value;
    }
}
