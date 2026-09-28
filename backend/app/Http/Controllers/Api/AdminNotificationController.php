<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class AdminNotificationController extends Controller
{
    public function __construct(private NotificationService $notifications) {}

    /** GET /admin/notifications/stats — totals for the admin page header. */
    public function stats(): JsonResponse
    {
        $today = Notification::whereDate('created_at', today())->count();

        $byType = Notification::query()
            ->selectRaw('type, COUNT(*) as total')
            ->groupBy('type')
            ->pluck('total', 'type')
            ->all();

        return response()->json([
            'status' => 'success',
            'data' => [
                'total' => Notification::count(),
                'sent_today' => $today,
                'unread' => Notification::unread()->count(),
                'by_type' => $byType,
            ],
        ]);
    }

    /** GET /admin/notifications — latest across all users (ledger). */
    public function index(Request $request): JsonResponse
    {
        $query = Notification::query()
            ->with(['user:id,name,username,email', 'sender:id,name,username'])
            ->when($request->input('type'), fn ($q, $t) => $q->ofType($t))
            ->when($request->boolean('unread'), fn ($q) => $q->unread())
            ->when($request->input('search'), function ($q, $s) {
                $like = "%{$s}%";
                $q->where(fn ($inner) => $inner
                    ->where('title', 'like', $like)
                    ->orWhere('body', 'like', $like)
                    ->orWhereHas('user', fn ($uq) => $uq
                        ->where('username', 'like', $like)
                        ->orWhere('email', 'like', $like)));
            })
            ->latest();

        $notifications = $query->paginate(min(max((int) $request->input('per_page', 20), 1), 50));

        return response()->json([
            'status' => 'success',
            'data' => $notifications->items(),
            'meta' => [
                'current_page' => $notifications->currentPage(),
                'per_page' => $notifications->perPage(),
                'total' => $notifications->total(),
                'last_page' => $notifications->lastPage(),
            ],
        ]);
    }

    /**
     * POST /admin/notifications/broadcast — real dispatch to an audience.
     * Audience: all users, one role, or a single user id. Each recipient
     * gets a persistent row + realtime push via NotificationService.
     */
    public function broadcast(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:200'],
            'body' => ['required', 'string', 'max:2000'],
            'type' => ['sometimes', 'string', 'in:' . implode(',', Notification::TYPES)],
            'audience' => ['required', 'string', 'in:all,role,user'],
            'role' => ['required_if:audience,role', 'nullable', 'string', 'max:60'],
            'user_id' => ['required_if:audience,user', 'nullable', 'integer', 'exists:users,id'],
            'link' => ['sometimes', 'nullable', 'string', 'max:500'],
        ]);

        $query = User::query();
        if ($data['audience'] === 'role') {
            $query->where('role', $data['role']);
        } elseif ($data['audience'] === 'user') {
            $query->where('id', $data['user_id']);
        }

        $recipientIds = $query->pluck('id')->all();
        if (count($recipientIds) === 0) {
            throw ValidationException::withMessages([
                'audience' => ['No recipients match this audience.'],
            ]);
        }
        if (count($recipientIds) > 5000) {
            throw ValidationException::withMessages([
                'audience' => ['Audience too large — narrow it by role or user.'],
            ]);
        }

        $sent = $this->notifications->sendMany(
            $recipientIds,
            $data['type'] ?? 'broadcast',
            $data['title'],
            $data['body'],
            ['source' => 'admin_broadcast', 'audience' => $data['audience']],
            $data['link'] ?? null,
            $request->user(),
        );

        return (response()->json([
            'status' => 'success',
            'data' => ['sent_count' => $sent, 'audience' => $data['audience']],
        ]))->setStatusCode(201);
    }

    /** DELETE /admin/notifications/{notification} — remove any row (moderation). */
    public function destroy(Notification $notification): JsonResponse
    {
        $notification->delete();

        return response()->json(['status' => 'success', 'message' => 'Notification removed.']);
    }
}
