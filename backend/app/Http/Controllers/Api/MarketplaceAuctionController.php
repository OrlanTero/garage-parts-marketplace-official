<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CarAuction;
use App\Models\CarBid;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class MarketplaceAuctionController extends Controller
{
    /**
     * List public car auctions (active, upcoming, or ended).
     */
    public function index(Request $request): JsonResponse
    {
        $status = $request->query('status', 'active'); // active, upcoming, ended, all

        // First, finalize any expired active auctions
        $expiredAuctions = CarAuction::where('status', 'active')
            ->whereNotNull('end_time')
            ->where('end_time', '<=', now())
            ->get();

        foreach ($expiredAuctions as $expired) {
            $expired->checkAndFinalizeStatus();
        }

        $query = CarAuction::with(['car', 'bids' => function ($q) {
            $q->orderByDesc('bid_amount')->limit(5);
        }]);

        if ($status === 'active') {
            $query->active()->orderBy('end_time', 'asc');
        } elseif ($status === 'upcoming') {
            $query->upcoming()->orderBy('start_time', 'asc');
        } elseif ($status === 'ended') {
            $query->ended()->orderByDesc('end_time');
        } else {
            $query->orderByDesc('created_at');
        }

        if ($request->has('featured')) {
            $query->where('featured', filter_var($request->featured, FILTER_VALIDATE_BOOLEAN));
        }

        if ($request->has('brand')) {
            $query->where('brand', $request->brand);
        }

        $auctions = $query->paginate($request->integer('per_page', 12));

        return response()->json([
            'data' => $auctions->items(),
            'meta' => [
                'current_page' => $auctions->currentPage(),
                'last_page' => $auctions->lastPage(),
                'per_page' => $auctions->perPage(),
                'total' => $auctions->total(),
            ],
        ]);
    }

    /**
     * Get single car auction with full details and bid history.
     */
    public function show($id): JsonResponse
    {
        $auction = CarAuction::with(['car', 'bids' => function ($q) {
            $q->orderByDesc('bid_amount')->orderByDesc('created_at');
        }])->where('uuid', $id)->orWhere('id', is_numeric($id) ? (int)$id : 0)->firstOrFail();

        $auction->checkAndFinalizeStatus();

        return response()->json([
            'data' => $auction,
        ]);
    }

    /**
     * Place a bid on a car auction.
     */
    public function bid(Request $request, $id): JsonResponse
    {
        $auction = CarAuction::where('uuid', $id)->orWhere('id', is_numeric($id) ? (int)$id : 0)->firstOrFail();

        $auction->checkAndFinalizeStatus();

        if ($auction->is_ended || $auction->status !== 'active') {
            return response()->json([
                'message' => 'This auction has ended or is not currently active.',
            ], 422);
        }

        if ($auction->start_time && Carbon::now()->lessThan($auction->start_time)) {
            return response()->json([
                'message' => 'This auction has not started yet.',
            ], 422);
        }

        $minNextBid = $auction->min_next_bid;

        $validator = Validator::make($request->all(), [
            'bid_amount' => ['required', 'numeric', 'min:' . $minNextBid],
            'bidder_name' => ['nullable', 'string', 'max:100'],
            'bidder_email' => ['nullable', 'email', 'max:150'],
            'bidder_phone' => ['nullable', 'string', 'max:30'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Bid validation failed.',
                'errors' => $validator->errors(),
                'min_required_bid' => $minNextBid,
            ], 422);
        }

        $user = $request->user('sanctum');
        $bidderName = $request->input('bidder_name') ?: ($user ? $user->name : 'Anonymous Bidder');
        $bidderEmail = $request->input('bidder_email') ?: ($user ? $user->email : null);
        $bidderPhone = $request->input('bidder_phone') ?: ($user ? $user->phone : null);
        $bidAmount = (float) $request->input('bid_amount');

        $result = DB::transaction(function () use ($auction, $user, $bidderName, $bidderEmail, $bidderPhone, $bidAmount, $request) {
            // Mark previous active/winning bids as outbid
            CarBid::where('car_auction_id', $auction->id)
                ->whereIn('status', ['active', 'winning'])
                ->update(['status' => 'outbid']);

            // Create new bid record
            $bid = CarBid::create([
                'car_auction_id' => $auction->id,
                'user_id' => $user?->id,
                'bidder_name' => $bidderName,
                'bidder_email' => $bidderEmail,
                'bidder_phone' => $bidderPhone,
                'bid_amount' => $bidAmount,
                'status' => 'winning',
                'ip_address' => $request->ip(),
            ]);

            // Auto-extend auction time if bid is made within last 2 minutes (Anti-sniping protection)
            if ($auction->end_time && Carbon::now()->diffInMinutes($auction->end_time, false) < 2) {
                $auction->end_time = Carbon::now()->addMinutes(2);
            }

            // Update auction stats
            $auction->current_bid = $bidAmount;
            $auction->total_bids = $auction->total_bids + 1;
            $auction->winner_id = $user?->id;
            $auction->winner_name = $bidderName;
            $auction->winner_email = $bidderEmail;
            $auction->winner_phone = $bidderPhone;
            $auction->winning_bid = $bidAmount;
            $auction->save();

            return $bid;
        });

        // Load fresh details
        $auction->load(['bids' => function ($q) {
            $q->orderByDesc('bid_amount')->orderByDesc('created_at');
        }]);

        return response()->json([
            'message' => 'Bid placed successfully! You are currently the highest bidder.',
            'data' => [
                'bid' => $result,
                'auction' => $auction,
            ],
        ], 201);
    }

    /**
     * Get Winner's Circle / Hall of Fame (recently concluded auctions and winners).
     */
    public function winners(): JsonResponse
    {
        // Finalize expired active auctions first
        CarAuction::where('status', 'active')
            ->whereNotNull('end_time')
            ->where('end_time', '<=', now())
            ->get()
            ->each(fn ($a) => $a->checkAndFinalizeStatus());

        $winners = CarAuction::with(['car', 'winner', 'bids' => function ($q) {
            $q->orderByDesc('bid_amount')->limit(3);
        }])
            ->whereIn('status', ['ended', 'awarded'])
            ->whereNotNull('winning_bid')
            ->orderByDesc('end_time')
            ->limit(10)
            ->get();

        return response()->json([
            'data' => $winners,
        ]);
    }
}
