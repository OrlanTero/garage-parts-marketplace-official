<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ConversationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $currentUser = $request->user();
        $otherUser = $currentUser ? $this->getOtherUser($currentUser) : null;
        $unreadCount = $currentUser ? $this->unreadCountFor($currentUser->id) : 0;

        return [
            'id' => $this->id,
            'user_one_id' => $this->user_one_id,
            'user_two_id' => $this->user_two_id,
            'other_user' => $otherUser ? [
                'id' => $otherUser->id,
                'username' => $otherUser->username,
                'avatar_url' => $otherUser->avatar_url,
                'is_kyc_verified' => (bool) ($otherUser->is_kyc_verified && $otherUser->kyc_status === 'approved'),
                'kyc_status' => $otherUser->kyc_status ?? 'not_submitted',
                'role' => is_object($otherUser->role) ? $otherUser->role->value : $otherUser->role,
                'is_agent' => (bool) $otherUser->is_agent,
                'agent_code' => $otherUser->agent_code,
            ] : null,
            'last_message' => $this->lastMessage ? new MessageResource($this->lastMessage) : null,
            'last_message_at' => $this->last_message_at?->toISOString(),
            'unread_count' => $unreadCount,
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
