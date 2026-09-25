<?php

namespace App\Http\Controllers\Api;

use App\Enums\CarStatus;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\Car;
use App\Models\Order;
use App\Models\Part;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminUserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $role = $request->query('role');
        $search = $request->query('q');

        $query = User::query()
            ->with(['orders' => fn ($q) => $q->latest()->limit(5), 'cars' => fn ($q) => $q->latest()->limit(5), 'parts' => fn ($q) => $q->latest()->limit(5)])
            ->withCount(['cars', 'parts', 'orders', 'favorites'])
            ->when($role && $role !== 'all', function ($q) use ($role) {
                if ($role === 'staff_admin') {
                    $q->whereIn('role', [UserRole::SuperAdmin->value, UserRole::Admin->value, UserRole::Inspector->value]);
                } else {
                    $q->where('role', $role);
                }
            })
            ->when($search, function ($q, $s) {
                $q->where(fn ($sub) => $sub->where('name', 'like', "%{$s}%")
                    ->orWhere('email', 'like', "%{$s}%")
                    ->orWhere('agent_code', 'like', "%{$s}%")
                );
            })
            ->orderByDesc('created_at');

        $users = $query->paginate((int) ($request->query('per_page', 25)));

        $data = collect($users->items())->map(function (User $user) {
            $userRole = $user->role instanceof UserRole ? $user->role->value : $user->role;

            // Buyer specific calculations
            $totalSpend = (float) $user->orders->sum('total_amount');
            $latestOrder = $user->orders->first();
            $primaryCity = $latestOrder?->shipping_city ?? $user->cars->first()?->city ?? 'Metro Manila';

            // Seller & Builder specific calculations
            $activeCars = $user->cars->filter(fn ($c) => ($c->status instanceof CarStatus ? $c->status->value : $c->status) === 'active')->count();
            $pendingCars = $user->cars->filter(fn ($c) => in_array($c->status instanceof CarStatus ? $c->status->value : $c->status, ['pending_inspection', 'draft']))->count();
            $soldCars = $user->cars->filter(fn ($c) => ($c->status instanceof CarStatus ? $c->status->value : $c->status) === 'sold')->count();
            $carsValuation = (float) $user->cars->sum('price');
            $averageRating = (float) ($user->cars->avg('rating') ?: 5.0);

            // Dealer specific calculations
            $partsValuation = (float) $user->parts->sum(fn ($p) => (float) $p->price * max(1, (int) ($p->stock_quantity ?? 1)));
            $portfolioValuation = $carsValuation + $partsValuation;

            return [
                'id' => $user->id,
                'name' => $user->name,
                'username' => $user->username,
                'email' => $user->email,
                'role' => $userRole,
                'avatar_url' => $user->avatar_url,
                'agent_code' => $user->agent_code,
                'agent_tagline' => $user->agent_tagline,
                'is_agent' => (bool) $user->is_agent,
                'commission_rate' => (float) ($user->commission_rate ?? 5.00),
                'verified' => !is_null($user->email_verified_at),
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
                'created_at' => $user->created_at?->toISOString(),

                // Aggregated Counts & Stats
                'orders_count' => $user->orders_count ?? 0,
                'total_spend' => $totalSpend,
                'wishlist_count' => $user->favorites_count ?? 0,
                'primary_city' => $primaryCity,
                'latest_orders' => $user->orders->take(3)->map(fn ($o) => [
                    'id' => $o->id,
                    'order_number' => $o->order_number,
                    'item_name' => $o->item_name,
                    'total_amount' => (float) $o->total_amount,
                    'status' => $o->status,
                    'payment_status' => $o->payment_status,
                    'shipping_city' => $o->shipping_city,
                    'created_at' => $o->created_at?->toISOString(),
                ]),

                // Cars & Inventory
                'cars_count' => $user->cars_count ?? 0,
                'active_cars_count' => $activeCars,
                'pending_cars_count' => $pendingCars,
                'sold_cars_count' => $soldCars,
                'cars_valuation' => $carsValuation,
                'average_rating' => $averageRating,
                'latest_cars' => $user->cars->take(3)->map(fn ($c) => [
                    'id' => $c->id,
                    'title' => $c->title,
                    'brand' => $c->brand,
                    'model' => $c->model,
                    'year' => $c->year,
                    'price' => (float) $c->price,
                    'status' => $c->status instanceof CarStatus ? $c->status->value : $c->status,
                    'inspection_status' => $c->inspection_status,
                    'vin' => $c->vin,
                ]),

                // Parts Catalog
                'parts_count' => $user->parts_count ?? 0,
                'parts_valuation' => $partsValuation,
                'portfolio_valuation' => $portfolioValuation,
                'latest_parts' => $user->parts->take(3)->map(fn ($p) => [
                    'id' => $p->id,
                    'title' => $p->title,
                    'brand' => $p->brand,
                    'price' => (float) $p->price,
                    'part_number' => $p->part_number,
                    'stock_quantity' => $p->stock_quantity,
                ]),
            ];
        });

        // Compute role-specific KPI cards
        $stats = $this->calculateRoleStats($role);

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

    public function show(User $user): JsonResponse
    {
        $user->load(['orders.part', 'cars', 'parts', 'favorites']);
        $userRole = $user->role instanceof UserRole ? $user->role->value : $user->role;

        return response()->json([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'username' => $user->username,
                'email' => $user->email,
                'role' => $userRole,
                'avatar_url' => $user->avatar_url,
                'agent_code' => $user->agent_code,
                'agent_tagline' => $user->agent_tagline,
                'is_agent' => (bool) $user->is_agent,
                'commission_rate' => (float) ($user->commission_rate ?? 5.00),
                'verified' => !is_null($user->email_verified_at),
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
                'created_at' => $user->created_at?->toISOString(),
                'orders' => $user->orders,
                'cars' => $user->cars,
                'parts' => $user->parts,
                'favorites_count' => $user->favorites->count(),
            ],
        ]);
    }

    public function updateRole(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'role' => ['required', 'string', 'in:buyer,seller,dealer,parts_seller,super_admin,admin,inspector'],
            'commission_rate' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'is_agent' => ['nullable', 'boolean'],
            'agent_tagline' => ['nullable', 'string', 'max:255'],
        ]);

        $user->forceFill(array_filter([
            'role' => $validated['role'],
            'commission_rate' => $validated['commission_rate'] ?? $user->commission_rate,
            'is_agent' => isset($validated['is_agent']) ? $validated['is_agent'] : $user->is_agent,
            'agent_tagline' => $validated['agent_tagline'] ?? $user->agent_tagline,
        ], fn ($v) => !is_null($v)))->save();

        return response()->json([
            'message' => 'User profile & clearance updated successfully.',
            'user' => (new UserResource($user->refresh()))->resolve(),
        ]);
    }

    private function calculateRoleStats(?string $role): array
    {
        if ($role === 'buyer') {
            $totalBuyers = User::where('role', UserRole::Buyer->value)->count();
            $activeShoppers = User::where('role', UserRole::Buyer->value)->has('orders')->count();
            $totalOrders = Order::count();
            $totalSpend = (float) Order::sum('total_amount');

            return [
                'total_count' => $totalBuyers,
                'active_shoppers' => $activeShoppers,
                'total_orders' => $totalOrders,
                'total_spend' => $totalSpend,
            ];
        }

        if ($role === 'seller') {
            $totalSellers = User::where('role', UserRole::Seller->value)->count();
            $activeCars = Car::where('status', CarStatus::Active->value)
                ->whereHas('seller', fn ($q) => $q->where('role', UserRole::Seller->value))
                ->count();
            $pendingCars = Car::whereIn('status', [CarStatus::PendingInspection->value, CarStatus::Draft->value])
                ->whereHas('seller', fn ($q) => $q->where('role', UserRole::Seller->value))
                ->count();
            $valuation = (float) Car::whereHas('seller', fn ($q) => $q->where('role', UserRole::Seller->value))->sum('price');

            return [
                'total_count' => $totalSellers,
                'active_cars' => $activeCars,
                'pending_cars' => $pendingCars,
                'total_valuation' => $valuation,
            ];
        }

        if ($role === 'dealer') {
            $totalDealers = User::where('role', UserRole::Dealer->value)->count();
            $dealerCars = Car::whereHas('seller', fn ($q) => $q->where('role', UserRole::Dealer->value))->count();
            $dealerParts = Part::whereHas('seller', fn ($q) => $q->where('role', UserRole::Dealer->value))->count();
            $carsVal = (float) Car::whereHas('seller', fn ($q) => $q->where('role', UserRole::Dealer->value))->sum('price');
            $partsVal = (float) Part::whereHas('seller', fn ($q) => $q->where('role', UserRole::Dealer->value))->sum('price');

            return [
                'total_count' => $totalDealers,
                'fleet_size' => $dealerCars,
                'parts_catalog' => $dealerParts,
                'portfolio_valuation' => $carsVal + $partsVal,
            ];
        }

        if ($role === 'staff_admin') {
            $superAdmins = User::where('role', UserRole::SuperAdmin->value)->count();
            $admins = User::where('role', UserRole::Admin->value)->count();
            $inspectors = User::where('role', UserRole::Inspector->value)->count();

            return [
                'total_count' => $superAdmins + $admins + $inspectors,
                'super_admins' => $superAdmins,
                'admins' => $admins,
                'inspectors' => $inspectors,
            ];
        }

        return [
            'total_users' => User::count(),
            'total_buyers' => User::where('role', UserRole::Buyer->value)->count(),
            'total_sellers' => User::where('role', UserRole::Seller->value)->count(),
            'total_dealers' => User::where('role', UserRole::Dealer->value)->count(),
            'total_staff' => User::whereIn('role', [UserRole::SuperAdmin->value, UserRole::Admin->value, UserRole::Inspector->value])->count(),
        ];
    }
}
