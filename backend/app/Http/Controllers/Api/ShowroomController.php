<?php

namespace App\Http\Controllers\Api;

use App\Enums\CarStatus;
use App\Enums\UserRole;
use App\Http\Controllers\Controller;
use App\Http\Resources\CarResource;
use App\Models\Car;
use App\Models\Review;
use App\Models\ShowroomSetting;
use App\Models\User;
use BackedEnum;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ShowroomController extends Controller
{
    /**
     * List all accredited sellers & builders who have activated their showroom
     * and have approved parking slots in the Showroom, along with Official Garage Highlights.
     */
    public function index(Request $request): JsonResponse
    {
        $search = $request->input('search') ?: $request->input('q');
        $role = $request->input('role') ?: $request->input('type');
        $verifiedOnly = filter_var($request->input('verified_only'), FILTER_VALIDATE_BOOLEAN);
        $sort = $request->input('sort', 'most_cars');
        $city = $request->input('city');

        // 1. Fetch Official Garage Highlight Cars (Main Seed / Admin / Official Garage Account)
        $officialGarageSellerIds = User::whereIn('email', [
            'seller@garagemarket.ph',
            'admin@garagemarket.ph',
            'superadmin@garagemarket.ph',
        ])->orWhere('role', UserRole::Admin->value)
          ->orWhere('role', UserRole::SuperAdmin->value)
          ->pluck('id')
          ->all();

        // If no official IDs found by email/role, fallback to seller ID 1 or first seller
        if (empty($officialGarageSellerIds)) {
            $firstSeller = User::where('role', UserRole::Seller->value)->first();
            if ($firstSeller) {
                $officialGarageSellerIds = [$firstSeller->id];
            }
        }

        // Active cars for our Official Garage highlights
        $garageHighlights = Car::query()
            ->whereIn('seller_id', $officialGarageSellerIds)
            ->where('status', CarStatus::Active->value)
            ->where('is_approved', true)
            ->with(['seller:id,username,avatar_url,is_kyc_verified,kyc_status,role', 'media'])
            ->latest('published_at')
            ->get();

        // If specific garage cars are empty, pick top approved showroom cars as highlights
        if ($garageHighlights->isEmpty()) {
            $garageHighlights = Car::query()
                ->where('status', CarStatus::Active->value)
                ->where('is_approved', true)
                ->where('is_in_showroom', true)
                ->with(['seller:id,username,avatar_url,is_kyc_verified,kyc_status,role', 'media'])
                ->latest('published_at')
                ->take(6)
                ->get();
        }

        // 2. Query accredited sellers whose showroom has been activated and have active showroom cars
        $query = User::query()
            ->where(function (Builder $q) {
                $q->where('is_showroom_active', true)
                  ->orWhereHas('cars', fn ($c) => $c->where('is_in_showroom', true)->where('status', CarStatus::Active->value));
            })
            ->withCount([
                'cars as active_cars_count' => fn ($c) => $c->where('status', CarStatus::Active->value)->where('is_approved', true)->where('is_in_showroom', true),
            ]);

        // Search filter: username, tagline, or car brand/model listed
        if (!empty($search)) {
            $like = "%{$search}%";
            $query->where(function (Builder $inner) use ($like) {
                $inner->where('username', 'like', $like)
                    ->orWhere('agent_tagline', 'like', $like)
                    ->orWhereHas('cars', fn ($c) => $c->where('brand', 'like', $like)->orWhere('model', 'like', $like)->orWhere('city', 'like', $like));
            });
        }

        // Role filter (cars-only)
        if (!empty($role) && $role !== 'all') {
            if ($role === 'verified') {
                $query->where('is_kyc_verified', true)->where('kyc_status', 'approved');
            } elseif ($role === 'dealers') {
                $query->where('role', UserRole::Dealer->value);
            } elseif ($role === 'builders' || $role === 'sellers') {
                $query->where('role', UserRole::Seller->value);
            }
        }

        if ($verifiedOnly) {
            $query->where('is_kyc_verified', true)->where('kyc_status', 'approved');
        }

        if (!empty($city)) {
            $query->whereHas('cars', fn ($c) => $c->where('city', 'like', "%{$city}%")->where('is_in_showroom', true));
        }

        $sellers = $query->get();

        // Transform and format seller cards (strictly cars-only)
        $formatted = $sellers->map(function (User $seller) use ($officialGarageSellerIds) {
            $enumRole = $seller->role instanceof BackedEnum ? $seller->role->value : (string) $seller->role;
            $carsCount = (int) ($seller->active_cars_count ?? 0);
            $isOfficialGarage = in_array($seller->id, $officialGarageSellerIds, true);

            // Fetch top preview items on the showroom floor (strictly cars)
            $previewCars = Car::query()
                ->where('seller_id', $seller->id)
                ->where('status', CarStatus::Active->value)
                ->where('is_approved', true)
                ->where('is_in_showroom', true)
                ->with('media')
                ->latest('published_at')
                ->take(3)
                ->get()
                ->map(fn ($c) => [
                    'id' => $c->id,
                    'uuid' => $c->uuid,
                    'title' => $c->title,
                    'brand' => $c->brand,
                    'model' => $c->model,
                    'year' => $c->year,
                    'price' => (float) $c->price,
                    'image_url' => $c->primary_image_url,
                    'type' => 'car',
                ]);

            // Determine primary location from cars
            $location = Car::where('seller_id', $seller->id)->whereNotNull('city')->value('city') ?: 'Metro Manila';

            // Extract brand specialties
            $specialties = Car::where('seller_id', $seller->id)
                ->whereNotNull('brand')
                ->distinct()
                ->pluck('brand')
                ->take(4)
                ->all();

            // Calculate reviews & rating
            $reviewStats = Review::where('seller_id', $seller->id)
                ->selectRaw('COUNT(*) as total_reviews, AVG(rating) as avg_rating')
                ->first();

            $rating = $reviewStats && $reviewStats->total_reviews > 0 
                ? round((float) $reviewStats->avg_rating, 1) 
                : 5.0;
            $reviewsCount = $reviewStats ? (int) $reviewStats->total_reviews : 0;

            // Generate seller tagline / bio
            $tagline = $seller->agent_tagline;
            if (empty($tagline)) {
                if ($isOfficialGarage) {
                    $tagline = 'Our Official Garage & Flagship Performance Collection';
                } elseif ($enumRole === UserRole::Dealer->value) {
                    $tagline = 'Premier Dealership & Verified Performance Fleet';
                } else {
                    $tagline = 'Custom Automotive Builder & Track Spec Platform';
                }
            }

            return [
                'id' => $seller->id,
                'username' => $seller->username ?: 'builder_' . $seller->id,
                'avatar_url' => $seller->avatar_url ?: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=300&auto=format&fit=crop',
                'role' => $enumRole,
                'is_official_garage' => $isOfficialGarage,
                'is_kyc_verified' => (bool) ($seller->is_kyc_verified && $seller->kyc_status === 'approved'),
                'kyc_status' => $seller->kyc_status ?? 'not_submitted',
                'is_showroom_active' => (bool) $seller->is_showroom_active,
                'location' => $location,
                'tagline' => $tagline,
                'specialties' => $specialties,
                'rating' => $rating,
                'reviews_count' => $reviewsCount,
                'member_since' => $seller->created_at ? $seller->created_at->format('M Y') : '2025',
                'stats' => [
                    'active_cars' => $carsCount,
                    'total_listings' => $carsCount,
                ],
                'preview_cars' => $previewCars,
            ];
        });

        // Apply sort: official garage comes first, then by chosen criteria
        $sorted = match ($sort) {
            'highest_rated' => $formatted->sortByDesc('rating')->values(),
            'newest' => $formatted->sortByDesc('id')->values(),
            default => $formatted->sortByDesc(fn ($s) => ($s['is_official_garage'] ? 1000 : 0) + $s['stats']['active_cars'])->values(),
        };

        return response()->json([
            'status' => 'success',
            'garage_highlights' => CarResource::collection($garageHighlights),
            'data' => $sorted,
            'meta' => [
                'total_sellers' => $sorted->count(),
                'verified_count' => $sorted->where('is_kyc_verified', true)->count(),
                'parking_fee_percentage' => ShowroomSetting::getParkingFeePercentage(),
                'total_cars' => Car::where('is_in_showroom', true)->where('status', CarStatus::Active->value)->count(),
            ],
        ]);
    }

    /**
     * Show detailed profile and complete vehicle inventory for a specific seller showroom.
     */
    public function show(Request $request, string $usernameOrId): JsonResponse
    {
        $seller = User::query()
            ->where('username', $usernameOrId)
            ->orWhere('id', is_numeric($usernameOrId) ? (int) $usernameOrId : 0)
            ->firstOrFail();

        $enumRole = $seller->role instanceof BackedEnum ? $seller->role->value : (string) $seller->role;

        $officialGarageSellerIds = User::whereIn('email', [
            'seller@garagemarket.ph',
            'admin@garagemarket.ph',
            'superadmin@garagemarket.ph',
        ])->pluck('id')->all();
        $isOfficialGarage = in_array($seller->id, $officialGarageSellerIds, true);

        // Active Cars placed in Showroom (or all active approved cars if official garage)
        $carsQuery = Car::query()
            ->where('seller_id', $seller->id)
            ->where('status', CarStatus::Active->value)
            ->where('is_approved', true);

        if (!$isOfficialGarage) {
            $carsQuery->where('is_in_showroom', true);
        }

        $cars = $carsQuery->with(['seller:id,username,avatar_url,is_kyc_verified,kyc_status,role', 'media'])
            ->latest('published_at')
            ->get();

        // Reviews for this seller
        $reviews = Review::query()
            ->where('seller_id', $seller->id)
            ->with('buyer:id,username,avatar_url')
            ->latest()
            ->take(10)
            ->get()
            ->map(fn ($r) => [
                'id' => $r->id,
                'rating' => (int) $r->rating,
                'comment' => $r->comment,
                'created_at' => $r->created_at ? $r->created_at->diffForHumans() : 'Recently',
                'buyer' => [
                    'username' => $r->buyer?->username ?: 'verified_buyer',
                    'avatar_url' => $r->buyer?->avatar_url,
                ],
            ]);

        $location = Car::where('seller_id', $seller->id)->whereNotNull('city')->value('city') ?: 'Metro Manila';
        $carBrands = Car::where('seller_id', $seller->id)->whereNotNull('brand')->distinct()->pluck('brand')->all();
        $specialties = array_values(array_unique(array_filter($carBrands)));

        $reviewStats = Review::where('seller_id', $seller->id)
            ->selectRaw('COUNT(*) as total_reviews, AVG(rating) as avg_rating')
            ->first();

        $rating = $reviewStats && $reviewStats->total_reviews > 0 
            ? round((float) $reviewStats->avg_rating, 1) 
            : 5.0;

        return response()->json([
            'status' => 'success',
            'data' => [
                'seller' => [
                    'id' => $seller->id,
                    'username' => $seller->username ?: 'builder_' . $seller->id,
                    'avatar_url' => $seller->avatar_url ?: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=300&auto=format&fit=crop',
                    'role' => $enumRole,
                    'is_official_garage' => $isOfficialGarage,
                    'is_kyc_verified' => (bool) ($seller->is_kyc_verified && $seller->kyc_status === 'approved'),
                    'kyc_status' => $seller->kyc_status ?? 'not_submitted',
                    'is_showroom_active' => (bool) $seller->is_showroom_active,
                    'location' => $location,
                    'tagline' => $seller->agent_tagline ?: ($isOfficialGarage ? 'Our Official Garage & Flagship Performance Collection' : ($enumRole === UserRole::Dealer->value ? 'Verified Premier Dealership' : 'Custom Automotive Platform Builder')),
                    'specialties' => $specialties,
                    'rating' => $rating,
                    'reviews_count' => $reviewStats ? (int) $reviewStats->total_reviews : 0,
                    'member_since' => $seller->created_at ? $seller->created_at->format('M Y') : '2025',
                    'stats' => [
                        'active_cars' => $cars->count(),
                        'total_listings' => $cars->count(),
                    ],
                ],
                'cars' => CarResource::collection($cars),
                'reviews' => $reviews,
            ],
        ]);
    }

    /**
     * Get platform showroom stats (strictly cars).
     */
    public function stats(): JsonResponse
    {
        $totalSellers = User::query()
            ->where(function (Builder $q) {
                $q->where('is_showroom_active', true)
                  ->orWhereHas('cars', fn ($c) => $c->where('is_in_showroom', true)->where('status', CarStatus::Active->value));
            })
            ->count();

        $verifiedSellers = User::query()
            ->where('is_showroom_active', true)
            ->where('is_kyc_verified', true)
            ->where('kyc_status', 'approved')
            ->count();

        $activeCars = Car::where('status', CarStatus::Active->value)
            ->where('is_approved', true)
            ->where('is_in_showroom', true)
            ->count();

        return response()->json([
            'status' => 'success',
            'data' => [
                'total_builders' => $totalSellers,
                'verified_builders' => $verifiedSellers,
                'active_cars' => $activeCars,
                'total_inventory' => $activeCars,
                'parking_fee_percentage' => ShowroomSetting::getParkingFeePercentage(),
            ],
        ]);
    }
}
