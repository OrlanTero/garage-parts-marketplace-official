<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ConversationResource;
use App\Http\Resources\MessageResource;
use App\Models\Conversation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminChatModerationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $search = $request->query('q');
        $redactedOnly = filter_var($request->query('redacted_only', false), FILTER_VALIDATE_BOOLEAN);

        $query = Conversation::query()
            ->with(['userOne:id,name,email,role', 'userTwo:id,name,email,role', 'lastMessage.sender:id,name'])
            ->when($redactedOnly, function ($q) {
                $q->whereHas('messages', fn ($m) => $m->where('is_redacted', true));
            })
            ->when($search, function ($q, $s) {
                $q->whereHas('userOne', fn ($u) => $u->where('name', 'like', "%{$s}%")->orWhere('email', 'like', "%{$s}%"))
                    ->orWhereHas('userTwo', fn ($u) => $u->where('name', 'like', "%{$s}%")->orWhere('email', 'like', "%{$s}%"));
            })
            ->withCount([
                'messages',
                'messages as redacted_messages_count' => fn ($q) => $q->where('is_redacted', true),
            ])
            ->orderByDesc('last_message_at');

        $conversations = $query->paginate((int) ($request->query('per_page', 25)));

        $data = collect($conversations->items())->map(function (Conversation $conv) {
            return [
                'id' => $conv->id,
                'user_one' => $conv->userOne ? [
                    'id' => $conv->userOne->id,
                    'name' => $conv->userOne->name,
                    'email' => $conv->userOne->email,
                    'role' => $conv->userOne->role?->value ?? $conv->userOne->role,
                ] : null,
                'user_two' => $conv->userTwo ? [
                    'id' => $conv->userTwo->id,
                    'name' => $conv->userTwo->name,
                    'email' => $conv->userTwo->email,
                    'role' => $conv->userTwo->role?->value ?? $conv->userTwo->role,
                ] : null,
                'last_message' => $conv->lastMessage ? (new MessageResource($conv->lastMessage))->resolve() : null,
                'total_messages' => $conv->messages_count ?? 0,
                'redacted_messages_count' => $conv->redacted_messages_count ?? 0,
                'has_pii_alerts' => ($conv->redacted_messages_count ?? 0) > 0,
                'last_message_at' => $conv->last_message_at?->toISOString(),
                'created_at' => $conv->created_at?->toISOString(),
            ];
        });

        return response()->json([
            'data' => $data,
            'meta' => [
                'current_page' => $conversations->currentPage(),
                'last_page' => $conversations->lastPage(),
                'per_page' => $conversations->perPage(),
                'total' => $conversations->total(),
            ],
        ]);
    }

    public function show(Request $request, Conversation $conversation): JsonResponse
    {
        $conversation->loadMissing(['userOne:id,name,email,role', 'userTwo:id,name,email,role']);

        $messages = $conversation->messages()
            ->with('sender:id,name,email,role')
            ->orderBy('created_at', 'asc')
            ->paginate((int) ($request->query('per_page', 100)));

        return response()->json([
            'conversation' => (new ConversationResource($conversation))->resolve(),
            'messages' => MessageResource::collection($messages),
        ]);
    }
}
