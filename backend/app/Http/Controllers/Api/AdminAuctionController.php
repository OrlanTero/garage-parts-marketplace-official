<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CarAuction;
use App\Models\CarBid;
use App\Models\Car;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class AdminAuctionController extends Controller
{
    /**
     * List all auctions for admin dashboard with analytics stats and filters.
     */
    public function index(Request $request): JsonResponse
    {
        $query = CarAuction::with(['car', 'winner', 'bids' => function ($q) {
            $q->orderByDesc('bid_amount')->limit(3);
        }]);

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        if ($request->filled('q')) {
            $search = '%' . $request->q . '%';
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', $search)
                    ->orWhere('brand', 'like', $search)
                    ->orWhere('model', 'like', $search)
                    ->orWhere('vin', 'like', $search);
            });
        }

        $auctions = $query->orderByDesc('created_at')->paginate($request->integer('per_page', 20));

        // Stats summary
        $totalAuctions = CarAuction::count();
        $activeAuctions = CarAuction::where('status', 'active')->count();
        $endedAuctions = CarAuction::whereIn('status', ['ended', 'awarded'])->count();
        $totalBidsPlaced = CarBid::count();
        $totalVolume = CarAuction::whereNotNull('winning_bid')->sum('winning_bid');

        return response()->json([
            'data' => $auctions->items(),
            'stats' => [
                'total_auctions' => $totalAuctions,
                'active_auctions' => $activeAuctions,
                'ended_auctions' => $endedAuctions,
                'total_bids_placed' => $totalBidsPlaced,
                'total_volume_won' => (float) $totalVolume,
            ],
            'meta' => [
                'current_page' => $auctions->currentPage(),
                'last_page' => $auctions->lastPage(),
                'per_page' => $auctions->perPage(),
                'total' => $auctions->total(),
            ],
        ]);
    }

    /**
     * Store new car auction created by admin.
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'title' => ['required', 'string', 'max:255'],
            'brand' => ['required', 'string', 'max:100'],
            'model' => ['required', 'string', 'max:100'],
            'year' => ['required', 'integer', 'min:1900', 'max:' . (date('Y') + 2)],
            'mileage_km' => ['nullable', 'integer', 'min:0'],
            'body_style' => ['nullable', 'string'],
            'fuel_type' => ['nullable', 'string'],
            'transmission' => ['nullable', 'string'],
            'condition' => ['nullable', 'string'],
            'vin' => ['nullable', 'string', 'max:50'],
            'color' => ['nullable', 'string', 'max:50'],
            'city' => ['nullable', 'string', 'max:100'],
            'location' => ['nullable', 'string', 'max:150'],
            'description' => ['nullable', 'string'],
            'images' => ['nullable', 'array'],
            'car_id' => ['nullable', 'exists:cars,id'],
            'starting_price' => ['required', 'numeric', 'min:0'],
            'bid_increment' => ['nullable', 'numeric', 'min:100'],
            'reserve_price' => ['nullable', 'numeric', 'min:0'],
            'buy_now_price' => ['nullable', 'numeric', 'min:0'],
            'start_time' => ['nullable', 'date'],
            'end_time' => ['nullable', 'date'],
            'status' => ['nullable', 'string', 'in:draft,upcoming,active,ended,awarded,cancelled'],
            'featured' => ['nullable', 'boolean'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed for car auction parameters.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $data = $validator->validated();
        $data['created_by'] = $request->user()?->id;
        $data['current_bid'] = $data['starting_price'];
        $data['total_bids'] = 0;
        $data['status'] = $data['status'] ?? 'active';
        $data['bid_increment'] = $data['bid_increment'] ?? 5000;

        if (empty($data['start_time'])) {
            $data['start_time'] = now();
        }
        if (empty($data['end_time'])) {
            $data['end_time'] = now()->addDays(3);
        }

        $auction = CarAuction::create($data);

        return response()->json([
            'message' => 'Car auction listing created successfully.',
            'data' => $auction,
        ], 201);
    }

    /**
     * Show single car auction with full details and bid history for admin.
     */
    public function show($id): JsonResponse
    {
        $auction = CarAuction::with(['car', 'winner', 'creator', 'bids' => function ($q) {
            $q->orderByDesc('bid_amount')->orderByDesc('created_at');
        }])->where('uuid', $id)->orWhere('id', is_numeric($id) ? (int)$id : 0)->firstOrFail();

        $auction->checkAndFinalizeStatus();

        return response()->json([
            'data' => $auction,
        ]);
    }

    /**
     * Update car auction parameters.
     */
    public function update(Request $request, $id): JsonResponse
    {
        $auction = CarAuction::where('uuid', $id)->orWhere('id', is_numeric($id) ? (int)$id : 0)->firstOrFail();

        $validator = Validator::make($request->all(), [
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'brand' => ['sometimes', 'required', 'string', 'max:100'],
            'model' => ['sometimes', 'required', 'string', 'max:100'],
            'year' => ['sometimes', 'required', 'integer', 'min:1900'],
            'mileage_km' => ['nullable', 'integer', 'min:0'],
            'body_style' => ['nullable', 'string'],
            'fuel_type' => ['nullable', 'string'],
            'transmission' => ['nullable', 'string'],
            'condition' => ['nullable', 'string'],
            'vin' => ['nullable', 'string'],
            'color' => ['nullable', 'string'],
            'city' => ['nullable', 'string'],
            'location' => ['nullable', 'string'],
            'description' => ['nullable', 'string'],
            'images' => ['nullable', 'array'],
            'car_id' => ['nullable', 'exists:cars,id'],
            'starting_price' => ['sometimes', 'numeric', 'min:0'],
            'current_bid' => ['nullable', 'numeric', 'min:0'],
            'bid_increment' => ['nullable', 'numeric', 'min:100'],
            'reserve_price' => ['nullable', 'numeric'],
            'buy_now_price' => ['nullable', 'numeric'],
            'start_time' => ['nullable', 'date'],
            'end_time' => ['nullable', 'date'],
            'status' => ['nullable', 'string', 'in:draft,upcoming,active,ended,awarded,cancelled'],
            'featured' => ['nullable', 'boolean'],
            'winner_name' => ['nullable', 'string'],
            'winner_email' => ['nullable', 'string'],
            'winner_phone' => ['nullable', 'string'],
            'winning_bid' => ['nullable', 'numeric'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation error while updating auction.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $auction->update($validator->validated());

        return response()->json([
            'message' => 'Car auction parameters updated successfully.',
            'data' => $auction,
        ]);
    }

    /**
     * Delete car auction.
     */
    public function destroy($id): JsonResponse
    {
        $auction = CarAuction::where('uuid', $id)->orWhere('id', is_numeric($id) ? (int)$id : 0)->firstOrFail();
        $auction->delete();

        return response()->json([
            'message' => 'Car auction deleted successfully.',
        ]);
    }

    /**
     * Conclude / Manually End Auction and declare winner.
     */
    public function endAuction(Request $request, $id): JsonResponse
    {
        $auction = CarAuction::with('bids')->where('uuid', $id)->orWhere('id', is_numeric($id) ? (int)$id : 0)->firstOrFail();

        $topBid = $auction->bids()->orderByDesc('bid_amount')->first();

        $auction->status = 'ended';
        $auction->end_time = now();

        if ($topBid) {
            $auction->winner_id = $topBid->user_id;
            $auction->winner_name = $topBid->bidder_name;
            $auction->winner_email = $topBid->bidder_email;
            $auction->winner_phone = $topBid->bidder_phone;
            $auction->winning_bid = $topBid->bid_amount;
            $topBid->update(['status' => 'won']);
        } elseif ($request->filled('winner_name') && $request->filled('winning_bid')) {
            $auction->winner_name = $request->winner_name;
            $auction->winner_email = $request->winner_email;
            $auction->winner_phone = $request->winner_phone;
            $auction->winning_bid = (float) $request->winning_bid;
        }

        $auction->save();

        return response()->json([
            'message' => 'Auction concluded successfully and winner finalized.',
            'data' => $auction,
        ]);
    }

    /**
     * Quick Extend Auction Time (+minutes or hours).
     */
    public function extendTime(Request $request, $id): JsonResponse
    {
        $auction = CarAuction::where('uuid', $id)->orWhere('id', is_numeric($id) ? (int)$id : 0)->firstOrFail();

        $minutes = $request->integer('minutes', 60);
        $currentEnd = $auction->end_time ? Carbon::parse($auction->end_time) : now();

        if ($currentEnd->lessThan(now())) {
            $currentEnd = now();
        }

        $auction->end_time = $currentEnd->addMinutes($minutes);
        if ($auction->status === 'ended') {
            $auction->status = 'active';
        }
        $auction->save();

        return response()->json([
            'message' => "Auction extended by {$minutes} minutes.",
            'data' => $auction,
        ]);
    }
}
