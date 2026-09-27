<?php

namespace App\Services;

use App\Http\Resources\ConversationResource;
use App\Http\Resources\MessageResource;
use App\Models\Car;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\Part;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class ListingInboxService
{
    /**
     * Listing-focused inbox: every listing the user is selling or buying.
     */
    public function inbox(User $user, Request $request): array
    {
        $userId = (int) $user->id;

        $conversations = Conversation::query()
            ->where(function ($q) use ($userId) {
                $q->where('user_one_id', $userId)->orWhere('user_two_id', $userId);
            })
            ->where('listing_key', '!=', 'none')
            ->with(['userOne', 'userTwo', 'lastMessage.sender'])
            ->orderByDesc('last_message_at')
            ->get();

        $unreadByConv = Message::query()
            ->selectRaw('conversation_id, COUNT(*) as unread')
            ->whereIn('conversation_id', $conversations->pluck('id'))
            ->where('sender_id', '!=', $userId)
            ->whereNull('read_at')
            ->groupBy('conversation_id')
            ->pluck('unread', 'conversation_id');

        $carIdsFromConv = $conversations->where('listing_type', 'car')->pluck('listing_id')->unique()->filter()->values();
        $partIdsFromConv = $conversations->where('listing_type', 'part')->pluck('listing_id')->unique()->filter()->values();

        $ownedCars = Car::with('media')->where('seller_id', $userId)->get();
        $ownedParts = Part::with('media')->where('seller_id', $userId)->get();

        $buyingCars = Car::with('media')->withTrashed()
            ->whereIn('id', $carIdsFromConv)
            ->where('seller_id', '!=', $userId)
            ->get();
        $buyingParts = Part::with('media')->withTrashed()
            ->whereIn('id', $partIdsFromConv)
            ->where('seller_id', '!=', $userId)
            ->get();

        $convsByKey = $conversations->groupBy('listing_key');
        $items = [];

        foreach ($ownedCars as $car) {
            $key = Conversation::makeListingKey('car', $car->id);
            if ($this->shouldHideOwnedListing($car, $convsByKey->get($key))) {
                continue;
            }
            $items[] = $this->buildItem('car', $car, 'selling', $convsByKey, $unreadByConv, $request);
        }

        foreach ($ownedParts as $part) {
            $key = Conversation::makeListingKey('part', $part->id);
            if ($this->shouldHideOwnedListing($part, $convsByKey->get($key))) {
                continue;
            }
            $items[] = $this->buildItem('part', $part, 'selling', $convsByKey, $unreadByConv, $request);
        }

        foreach ($buyingCars as $car) {
            $items[] = $this->buildItem('car', $car, 'buying', $convsByKey, $unreadByConv, $request);
        }

        foreach ($buyingParts as $part) {
            $items[] = $this->buildItem('part', $part, 'buying', $convsByKey, $unreadByConv, $request);
        }

        usort($items, function (array $a, array $b) {
            $ta = $a['last_message_at'] ?? '';
            $tb = $b['last_message_at'] ?? '';
            if ($ta === $tb) {
                return ((int) ($b['listing']['id'] ?? 0)) <=> ((int) ($a['listing']['id'] ?? 0));
            }

            return $tb <=> $ta;
        });

        return $items;
    }

    /**
     * Conversations + messages the current user may see for one listing.
     *
     * Sellers see every buyer thread. Buyers see only their own thread.
     */
    public function listingThread(User $user, string $listingType, int $listingId): array
    {
        $this->assertListingType($listingType);
        $listing = $this->findListing($listingType, $listingId);
        if (!$listing) {
            abort(404, 'Listing not found.');
        }

        $isSeller = (int) $listing->seller_id === (int) $user->id;
        $key = Conversation::makeListingKey($listingType, $listingId);

        $query = Conversation::query()
            ->where('listing_key', $key)
            ->with(['userOne', 'userTwo', 'lastMessage.sender'])
            ->orderByDesc('last_message_at')
            ->orderByDesc('id');

        if (!$isSeller) {
            $query->where(function ($q) use ($user) {
                $q->where('user_one_id', $user->id)->orWhere('user_two_id', $user->id);
            });
        }

        $conversations = $query->get();

        if (!$isSeller && $conversations->isEmpty()) {
            abort(403, 'You do not have a conversation on this listing.');
        }

        return [
            'listing' => $this->listingCard($listingType, $listing),
            'role' => $isSeller ? 'selling' : 'buying',
            'conversations' => $conversations,
        ];
    }

    public function listingMessages(User $user, string $listingType, int $listingId): Collection
    {
        $thread = $this->listingThread($user, $listingType, $listingId);
        $convIds = $thread['conversations']->pluck('id');
        if ($convIds->isEmpty()) {
            return collect();
        }

        return Message::query()
            ->whereIn('conversation_id', $convIds)
            ->with(['sender', 'offer.buyer', 'offer.seller', 'offer.part', 'offer.car', 'reservation'])
            ->orderBy('created_at', 'asc')
            ->orderBy('id', 'asc')
            ->get();
    }

    public function markListingRead(User $user, string $listingType, int $listingId): int
    {
        $thread = $this->listingThread($user, $listingType, $listingId);
        $convIds = $thread['conversations']->pluck('id');
        if ($convIds->isEmpty()) {
            return 0;
        }

        return Message::query()
            ->whereIn('conversation_id', $convIds)
            ->where('sender_id', '!=', $user->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);
    }

    public function listingCard(string $type, Car|Part $listing): array
    {
        $uuid = $listing->uuid ?? $listing->id;
        $status = is_object($listing->status) ? $listing->status->value : $listing->status;

        return [
            'type' => $type,
            'id' => $listing->id,
            'uuid' => $listing->uuid ?? null,
            'title' => $listing->title ?? ($listing->name ?? 'Listing'),
            'price' => (float) $listing->price,
            'primary_image_url' => $listing->primary_image_url ?? ($listing->media?->first()?->url ?? null),
            'status' => $status,
            'seller_id' => $listing->seller_id,
            'condition' => is_object($listing->condition) ? $listing->condition->value : $listing->condition,
            'inspection_score' => $listing->inspection_score ?? null,
            'url' => $type === 'car' ? "/marketplace/{$uuid}" : "/parts/{$uuid}",
        ];
    }

    public function findListing(string $type, int $id): Car|Part|null
    {
        $this->assertListingType($type);

        return $type === 'car'
            ? Car::with('media')->withTrashed()->find($id)
            : Part::with('media')->withTrashed()->find($id);
    }

    public function assertListingType(string $type): void
    {
        if (!in_array($type, ['car', 'part'], true)) {
            abort(404, 'Listing type must be car or part.');
        }
    }

    public function serializeConversations(Collection $conversations, Request $request): array
    {
        return ConversationResource::collection($conversations)->resolve($request);
    }

    public function serializeMessages(Collection $messages, Request $request): array
    {
        return MessageResource::collection($messages)->resolve($request);
    }

    private function shouldHideOwnedListing(Car|Part $listing, ?Collection $convs): bool
    {
        if ($convs && $convs->isNotEmpty()) {
            return false;
        }

        $status = is_object($listing->status) ? $listing->status->value : (string) $listing->status;

        return in_array($status, ['draft', 'rejected', 'archived'], true);
    }

    private function buildItem(
        string $type,
        Car|Part $listing,
        string $role,
        Collection $convsByKey,
        Collection $unreadByConv,
        Request $request
    ): array {
        $key = Conversation::makeListingKey($type, $listing->id);
        $convs = $convsByKey->get($key, collect());
        $unread = (int) $convs->sum(fn (Conversation $c) => (int) ($unreadByConv[$c->id] ?? 0));
        $latest = $convs->sortByDesc(fn (Conversation $c) => $c->last_message_at?->timestamp ?? 0)->first();

        return [
            'key' => $key,
            'listing_type' => $type,
            'listing_id' => $listing->id,
            'listing' => $this->listingCard($type, $listing),
            'role' => $role,
            'inquiry_count' => $convs->count(),
            'unread_count' => $unread,
            'last_message' => $latest?->lastMessage
                ? (new MessageResource($latest->lastMessage))->toArray($request)
                : null,
            'last_message_at' => $latest?->last_message_at?->toISOString(),
            'conversations' => $this->serializeConversations($convs, $request),
        ];
    }
}
