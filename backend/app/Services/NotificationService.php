<?php

namespace App\Services;

use App\Events\NotificationSent;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Support\Facades\Log;

/**
 * Persistent in-app notifications with best-effort realtime delivery.
 * Every send() writes a database row (the source of truth for badges,
 * centers, and polling fallbacks) and emits `notification.sent` on the
 * recipient's private user channel. A downed socket server must never
 * break the triggering request.
 */
class NotificationService
{
    /**
     * @param User|int $user recipient model or id
     * @param array<string,mixed> $data extra payload (order_number, etc.)
     */
    public function send(
        User|int $user,
        string $type,
        string $title,
        ?string $body = null,
        array $data = [],
        ?string $link = null,
        User|int|null $sender = null,
    ): ?Notification {
        $userId = $user instanceof User ? (int) $user->id : (int) $user;
        if ($userId <= 0) {
            return null;
        }

        $notification = Notification::create([
            'user_id' => $userId,
            'sender_id' => $sender instanceof User ? (int) $sender->id : ($sender !== null ? (int) $sender : null),
            'type' => in_array($type, Notification::TYPES, true) ? $type : 'info',
            'title' => mb_substr($title, 0, 200),
            'body' => $body,
            'data' => $data,
            'link' => $link ? mb_substr($link, 0, 500) : null,
        ]);

        try {
            broadcast(new NotificationSent(
                $notification->user_id,
                $notification->title,
                (string) ($notification->body ?? ''),
                $notification->type,
                array_merge($notification->data ?? [], ['notification_id' => $notification->id]),
                $notification->link,
                $notification->id,
            ));
        } catch (\Throwable $e) {
            Log::warning('Notification broadcast failed (row persisted): ' . $e->getMessage(), [
                'notification_id' => $notification->id,
            ]);
        }

        return $notification;
    }

    /**
     * Fan-out to many users in chunks (admin broadcasts). Returns count.
     *
     * @param iterable<int> $userIds
     */
    public function sendMany(
        iterable $userIds,
        string $type,
        string $title,
        ?string $body = null,
        array $data = [],
        ?string $link = null,
        User|int|null $sender = null,
    ): int {
        $sent = 0;
        foreach (array_chunk(is_array($userIds) ? $userIds : iterator_to_array($userIds), 200) as $chunk) {
            foreach ($chunk as $userId) {
                if ($this->send($userId, $type, $title, $body, $data, $link, $sender)) {
                    $sent++;
                }
            }
        }

        return $sent;
    }

    public function unreadCount(User|int $user): int
    {
        $userId = $user instanceof User ? (int) $user->id : (int) $user;

        return Notification::where('user_id', $userId)->unread()->count();
    }
}
