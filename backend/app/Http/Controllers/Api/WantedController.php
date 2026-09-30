<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\WantedOffer;
use App\Models\WantedRequest;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Wanted ads: buyers post hard-to-find requests, sellers reply with quotes.
 *
 * Public: index + show (open/quoted requests only, unless owner/admin).
 * Auth: store, my, close/reopen, offer, accept-offer, destroy.
 */
class WantedController extends Controller
{
    public function __construct(private NotificationService $notify) {}

    /** GET /wanted-requests — public board (open + quoted). */
    public function index(Request $request): JsonResponse
    {
        $data = $request->validate([
            'q' => ['nullable', 'string', 'max:120'],
            'category' => ['nullable', 'string', 'max:60'],
            'status' => ['nullable', 'string', 'in:open,quoted,fulfilled,closed,cancelled,all'],
            'mine' => ['nullable', 'boolean'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:50'],
        ]);

        $user = $request->user();
        $mine = !empty($data['mine']) && $user;
        $status = $data['status'] ?? ($mine ? 'all' : 'open');
        if ($status === 'open' && !$mine) {
            $status = 'all_open';
        }

        $query = WantedRequest::query()
            ->with(['user:id,name,username,avatar_url'])
            ->withCount('offers')
            ->when($mine, fn ($q) => $q->where('user_id', $user->id))
            ->when(!$mine && $user === null, fn ($q) => $q->whereIn('status', [
                WantedRequest::STATUS_OPEN, WantedRequest::STATUS_QUOTED,
            ]))
            ->when($status === 'all_open', fn ($q) => $q->whereIn('status', [
                WantedRequest::STATUS_OPEN, WantedRequest::STATUS_QUOTED,
            ]))
            ->when($status !== 'all' && $status !== 'all_open', fn ($q) => $q->where('status', $status))
            ->when(!empty($data['category']) && $data['category'] !== 'all',
                fn ($q) => $q->where('category', $data['category']))
            ->when(!empty($data['q']), fn ($q, $s) => $q->where(fn ($sub) => $sub
                ->where('title', 'like', "%{$s}%")
                ->orWhere('engine_code', 'like', "%{$s}%")
                ->orWhere('part_number', 'like', "%{$s}%")
                ->orWhere('specs', 'like', "%{$s}%")))
            ->orderByDesc('updated_at');

        $paginator = $query->paginate((int) ($data['per_page'] ?? 20));

        return response()->json([
            'status' => 'success',
            'data' => $paginator->items(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }

    /** GET /wanted-requests/{wantedRequest} — full thread with offers. */
    public function show(Request $request, WantedRequest $wantedRequest): JsonResponse
    {
        $user = $request->user();
        $isOwner = $user && (int) $wantedRequest->user_id === (int) $user->id;
        $isStaff = $user && method_exists($user, 'isAdmin') && $user->isAdmin();

        if (
            !in_array($wantedRequest->status, [WantedRequest::STATUS_OPEN, WantedRequest::STATUS_QUOTED], true)
            && !$isOwner && !$isStaff
        ) {
            abort(404, 'Wanted request not found.');
        }

        $wantedRequest->load([
            'user:id,name,username,avatar_url',
            'offers.seller:id,name,username,avatar_url',
        ]);

        return response()->json(['status' => 'success', 'data' => $wantedRequest]);
    }

    /** POST /wanted-requests — publish a wanted ad. */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:160'],
            'category' => ['nullable', 'string', 'max:60'],
            'engine_code' => ['nullable', 'string', 'max:80'],
            'part_number' => ['nullable', 'string', 'max:80'],
            'specs' => ['nullable', 'string', 'max:2000'],
            'budget_min' => ['nullable', 'numeric', 'min:0'],
            'budget_max' => ['nullable', 'numeric', 'min:0'],
            'condition' => ['nullable', 'string', 'in:any,new,used,refurbished'],
            'city' => ['nullable', 'string', 'max:120'],
            'contact_phone' => ['nullable', 'string', 'max:50'],
        ]);

        $ad = WantedRequest::create([
            ...$data,
            'user_id' => $request->user()->id,
            'status' => WantedRequest::STATUS_OPEN,
        ]);

        return response()->json(['status' => 'success', 'data' => $ad->load('user:id,name,username,avatar_url')], 201);
    }

    /** PATCH /wanted-requests/{wantedRequest} — owner edits open ads. */
    public function update(Request $request, WantedRequest $wantedRequest): JsonResponse
    {
        $this->authorizeOwner($request, $wantedRequest);

        $data = $request->validate([
            'title' => ['sometimes', 'string', 'max:160'],
            'category' => ['sometimes', 'nullable', 'string', 'max:60'],
            'engine_code' => ['sometimes', 'nullable', 'string', 'max:80'],
            'part_number' => ['sometimes', 'nullable', 'string', 'max:80'],
            'specs' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'budget_min' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'budget_max' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'condition' => ['sometimes', 'nullable', 'string', 'in:any,new,used,refurbished'],
            'city' => ['sometimes', 'nullable', 'string', 'max:120'],
            'contact_phone' => ['sometimes', 'nullable', 'string', 'max:50'],
            'status' => ['sometimes', 'string', 'in:open,closed,cancelled'],
        ]);

        $wantedRequest->update($data);

        return response()->json(['status' => 'success', 'data' => $wantedRequest->refresh()]);
    }

    /** POST /wanted-requests/{wantedRequest}/close — owner closes or reopens. */
    public function setStatus(Request $request, WantedRequest $wantedRequest): JsonResponse
    {
        $this->authorizeOwner($request, $wantedRequest);

        $data = $request->validate([
            'status' => ['required', 'string', 'in:open,closed,cancelled'],
        ]);

        $wantedRequest->update(['status' => $data['status']]);

        return response()->json(['status' => 'success', 'data' => $wantedRequest->refresh()]);
    }

    /** POST /wanted-requests/{wantedRequest}/offers — seller quotes a price. */
    public function offer(Request $request, WantedRequest $wantedRequest): JsonResponse
    {
        $user = $request->user();
        if ((int) $wantedRequest->user_id === (int) $user->id) {
            abort(422, 'You cannot quote your own wanted ad.');
        }
        if (!in_array($wantedRequest->status, [WantedRequest::STATUS_OPEN, WantedRequest::STATUS_QUOTED], true)) {
            abort(422, 'This wanted ad is no longer accepting quotes.');
        }

        $data = $request->validate([
            'price' => ['required', 'numeric', 'min:1'],
            'message' => ['nullable', 'string', 'max:1000'],
        ]);

        $offer = WantedOffer::create([
            'wanted_request_id' => $wantedRequest->id,
            'seller_id' => $user->id,
            'price' => $data['price'],
            'message' => $data['message'] ?? null,
            'status' => WantedOffer::STATUS_PENDING,
        ]);

        if ($wantedRequest->status === WantedRequest::STATUS_OPEN) {
            $wantedRequest->update(['status' => WantedRequest::STATUS_QUOTED]);
        }

        try {
            $this->notify->send(
                $wantedRequest->user_id,
                'wanted_offer',
                "New quote on “{$wantedRequest->title}”",
                '₱ ' . number_format((float) $offer->price, 2) . ' from @' . ($user->username ?? $user->name),
                ['wanted_request_id' => $wantedRequest->id, 'offer_id' => $offer->id],
                "/wanted/{$wantedRequest->id}",
                $user,
            );
        } catch (\Throwable) {
            // Quotes work even if notifications are down.
        }

        return response()->json(['status' => 'success', 'data' => $offer->load('seller:id,name,username,avatar_url')], 201);
    }

    /** POST /wanted-requests/{wantedRequest}/accept — owner accepts one offer. */
    public function accept(Request $request, WantedRequest $wantedRequest): JsonResponse
    {
        $this->authorizeOwner($request, $wantedRequest);

        $data = $request->validate([
            'offer_id' => ['required', 'integer', 'exists:wanted_offers,id'],
        ]);

        $offer = WantedOffer::where('id', $data['offer_id'])
            ->where('wanted_request_id', $wantedRequest->id)
            ->firstOrFail();

        $offer->update(['status' => WantedOffer::STATUS_ACCEPTED]);
        WantedOffer::where('wanted_request_id', $wantedRequest->id)
            ->where('id', '!=', $offer->id)
            ->where('status', WantedOffer::STATUS_PENDING)
            ->update(['status' => WantedOffer::STATUS_DECLINED]);
        $wantedRequest->update(['status' => WantedRequest::STATUS_FULFILLED]);

        try {
            $this->notify->send(
                $offer->seller_id,
                'wanted_accepted',
                "Your quote on “{$wantedRequest->title}” was accepted",
                'Coordinate with the buyer in Messages to close the deal.',
                ['wanted_request_id' => $wantedRequest->id, 'offer_id' => $offer->id],
                "/wanted/{$wantedRequest->id}",
                $request->user(),
            );
        } catch (\Throwable) {
            // Acceptance stands even if notifications are down.
        }

        return response()->json(['status' => 'success', 'data' => $wantedRequest->refresh()->load('offers.seller:id,name,username,avatar_url')]);
    }

    /** DELETE /wanted-requests/{wantedRequest} — owner removes (admins via admin route). */
    public function destroy(Request $request, WantedRequest $wantedRequest): JsonResponse
    {
        $this->authorizeOwner($request, $wantedRequest);
        $wantedRequest->delete();

        return response()->json(['status' => 'success', 'message' => 'Wanted ad removed.']);
    }

    /** DELETE /admin/wanted-requests/{wantedRequest} — staff moderation remove. */
    public function adminDestroy(Request $request, WantedRequest $wantedRequest): JsonResponse
    {
        $user = $request->user();
        if (!$user || !method_exists($user, 'isAdmin') || !$user->isAdmin()) {
            abort(403, 'Admin access required.');
        }
        $wantedRequest->delete();

        return response()->json(['status' => 'success', 'message' => 'Wanted ad removed by moderation.']);
    }

    private function authorizeOwner(Request $request, WantedRequest $wantedRequest): void
    {
        $user = $request->user();
        if (!$user || (int) $wantedRequest->user_id !== (int) $user->id) {
            abort(403, 'Only the request owner can do this.');
        }
    }
}
