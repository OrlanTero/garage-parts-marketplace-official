<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    /** GET /notifications — newest first, optional ?unread=1 / ?type=. */
    public function index(Request $request): JsonResponse
    {
        $query = Notification::query()
            ->where('user_id', $request->user()->id)
            ->when($request->boolean('unread'), fn ($q) => $q->unread())
            ->when(
                $request->input('type'),
                fn ($q, $type) => in_array($type, Notification::TYPES, true) ? $q->ofType($type) : $q
            )
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
            'unread_count' => Notification::where('user_id', $request->user()->id)->unread()->count(),
        ]);
    }

    /** GET /notifications/unread-count — badge number. */
    public function unreadCount(Request $request): JsonResponse
    {
        return response()->json([
            'status' => 'success',
            'unread_count' => Notification::where('user_id', $request->user()->id)->unread()->count(),
        ]);
    }

    /** POST /notifications/{notification}/read. */
    public function markRead(Request $request, Notification $notification): JsonResponse
    {
        $this->ensureOwner($request, $notification);
        $notification->markAsRead();

        return response()->json(['status' => 'success', 'data' => $notification->refresh()]);
    }

    /** POST /notifications/read-all. */
    public function markAllRead(Request $request): JsonResponse
    {
        $marked = Notification::where('user_id', $request->user()->id)
            ->unread()
            ->update(['read_at' => now()]);

        return response()->json(['status' => 'success', 'marked_count' => $marked]);
    }

    /** DELETE /notifications/{notification} — remove one of mine. */
    public function destroy(Request $request, Notification $notification): JsonResponse
    {
        $this->ensureOwner($request, $notification);
        $notification->delete();

        return response()->json(['status' => 'success', 'message' => 'Notification removed.']);
    }

    /** DELETE /notifications — clear all read notifications of mine. */
    public function clearRead(Request $request): JsonResponse
    {
        $deleted = Notification::where('user_id', $request->user()->id)
            ->whereNotNull('read_at')
            ->delete();

        return response()->json(['status' => 'success', 'deleted_count' => $deleted]);
    }

    private function ensureOwner(Request $request, Notification $notification): void
    {
        if ((int) $notification->user_id !== (int) $request->user()->id) {
            abort(403, 'This notification belongs to another user.');
        }
    }
}
