<?php

namespace App\Http\Controllers\Api;

use App\Events\MessageRead;
use App\Events\MessageSent;
use App\Http\Controllers\Controller;
use App\Http\Requests\Chat\SendMessageRequest;
use App\Http\Requests\Chat\StartConversationRequest;
use App\Http\Resources\ConversationResource;
use App\Http\Resources\MessageResource;
use App\Models\Conversation;
use App\Models\Message;
use App\Services\PiiSecurityService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Log;

class ChatController extends Controller
{
    /**
     * List all conversations for the authenticated user.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $userId = $request->user()->id;

        $conversations = Conversation::where('user_one_id', $userId)
            ->orWhere('user_two_id', $userId)
            ->with(['userOne', 'userTwo', 'lastMessage.sender'])
            ->orderByDesc('last_message_at')
            ->orderByDesc('updated_at')
            ->paginate(30);

        return ConversationResource::collection($conversations);
    }

    /**
     * Start or retrieve a 1:1 conversation with a recipient.
     */
    public function store(StartConversationRequest $request, PiiSecurityService $piiService): JsonResponse
    {
        $user = $request->user();
        $recipientId = (int) $request->validated('recipient_id');

        $conversation = Conversation::findOrCreateBetween($user->id, $recipientId);
        $conversation->load(['userOne', 'userTwo', 'lastMessage.sender']);

        // If an initial message was provided, create and dispatch it
        $initialMessage = $request->validated('initial_message');
        if (!empty($initialMessage)) {
            $sanitized = $piiService->sanitize($initialMessage);

            $message = $conversation->messages()->create([
                'sender_id' => $user->id,
                'body' => $sanitized['sanitized'],
                'is_redacted' => $sanitized['is_redacted'],
                'listing_type' => $request->validated('listing_type'),
                'listing_id' => $request->validated('listing_id'),
            ]);

            $conversation->update([
                'last_message_id' => $message->id,
                'last_message_at' => now(),
            ]);

            $message->load('sender');
            $this->safeBroadcast(new MessageSent($message, $recipientId));
            $conversation->load('lastMessage.sender');
        }

        return (new ConversationResource($conversation))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Show conversation details.
     */
    public function show(Conversation $conversation, Request $request): JsonResponse
    {
        $this->authorizeParticipant($conversation, $request->user()->id);

        $conversation->load(['userOne', 'userTwo', 'lastMessage.sender']);

        return (new ConversationResource($conversation))->response();
    }

    /**
     * Get paginated messages for a conversation.
     */
    public function messages(Conversation $conversation, Request $request): AnonymousResourceCollection
    {
        $this->authorizeParticipant($conversation, $request->user()->id);

        $messages = $conversation->messages()
            ->with('sender')
            ->orderBy('created_at', 'asc')
            ->paginate($request->integer('per_page', 50));

        return MessageResource::collection($messages);
    }

    /**
     * Send a new message in an existing conversation.
     */
    public function sendMessage(SendMessageRequest $request, Conversation $conversation, PiiSecurityService $piiService): JsonResponse
    {
        $user = $request->user();
        $this->authorizeParticipant($conversation, $user->id);

        $body = $request->validated('body');
        $sanitized = $piiService->sanitize($body);

        $message = $conversation->messages()->create([
            'sender_id' => $user->id,
            'body' => $sanitized['sanitized'],
            'is_redacted' => $sanitized['is_redacted'],
            'listing_type' => $request->validated('listing_type'),
            'listing_id' => $request->validated('listing_id'),
        ]);

        $conversation->update([
            'last_message_id' => $message->id,
            'last_message_at' => now(),
        ]);

        $otherUser = $conversation->getOtherUser($user);
        $message->load('sender');

        if ($otherUser) {
            $this->safeBroadcast(new MessageSent($message, $otherUser->id));
        }

        return (new MessageResource($message))
            ->response()
            ->setStatusCode(201);
    }

    /**
     * Mark all unread messages in a conversation as read.
     */
    public function markRead(Conversation $conversation, Request $request): JsonResponse
    {
        $user = $request->user();
        $this->authorizeParticipant($conversation, $user->id);

        $updated = $conversation->messages()
            ->where('sender_id', '!=', $user->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        $otherUser = $conversation->getOtherUser($user);
        if ($updated > 0 && $otherUser) {
            $this->safeBroadcast(new MessageRead($conversation->id, $user->id, $otherUser->id));
        }

        return response()->json([
            'message' => 'Messages marked as read',
            'marked_count' => $updated,
        ]);
    }

    /**
     * Get the total unread messages count for the current user.
     */
    public function unreadCount(Request $request): JsonResponse
    {
        $userId = $request->user()->id;

        $userConversations = Conversation::where('user_one_id', $userId)
            ->orWhere('user_two_id', $userId)
            ->pluck('id');

        $unreadCount = Message::whereIn('conversation_id', $userConversations)
            ->where('sender_id', '!=', $userId)
            ->whereNull('read_at')
            ->count();

        return response()->json([
            'unread_count' => $unreadCount,
        ]);
    }

    /**
     * Ensure the user is a participant in the conversation.
     */
    private function authorizeParticipant(Conversation $conversation, int $userId): void
    {
        if (!$conversation->hasParticipant($userId)) {
            abort(403, 'You are not authorized to access this conversation.');
        }
    }

    /**
     * Safely broadcast an event without failing the request if the broadcast server is unreachable.
     */
    private function safeBroadcast(object $event): void
    {
        try {
            broadcast($event);
        } catch (\Throwable $e) {
            Log::warning('Broadcast dispatch failed (broadcaster may be offline): ' . $e->getMessage(), [
                'event' => get_class($event),
            ]);
        }
    }
}
