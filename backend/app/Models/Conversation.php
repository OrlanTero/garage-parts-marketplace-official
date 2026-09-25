<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Conversation extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_one_id',
        'user_two_id',
        'last_message_id',
        'last_message_at',
    ];

    protected function casts(): array
    {
        return [
            'last_message_at' => 'datetime',
        ];
    }

    public function userOne(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_one_id');
    }

    public function userTwo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_two_id');
    }

    public function lastMessage(): BelongsTo
    {
        return $this->belongsTo(Message::class, 'last_message_id');
    }

    public function messages(): HasMany
    {
        return $this->hasMany(Message::class);
    }

    /**
     * Get or create a 1:1 conversation between two users with ordered IDs.
     */
    public static function findOrCreateBetween(int $userAId, int $userBId): self
    {
        $userOneId = min($userAId, $userBId);
        $userTwoId = max($userAId, $userBId);

        return static::firstOrCreate(
            ['user_one_id' => $userOneId, 'user_two_id' => $userTwoId]
        );
    }

    /**
     * Check if a user is a participant of this conversation.
     */
    public function hasParticipant(int $userId): bool
    {
        return $this->user_one_id === $userId || $this->user_two_id === $userId;
    }

    /**
     * Get the other participant in the conversation.
     */
    public function getOtherUser(int|User $user): ?User
    {
        $userId = $user instanceof User ? $user->id : $user;

        if ($this->user_one_id === $userId) {
            return $this->userTwo;
        }

        if ($this->user_two_id === $userId) {
            return $this->userOne;
        }

        return null;
    }

    /**
     * Count unread messages for a given user in this conversation.
     */
    public function unreadCountFor(int $userId): int
    {
        return $this->messages()
            ->where('sender_id', '!=', $userId)
            ->whereNull('read_at')
            ->count();
    }
}
