<?php

use Illuminate\Support\Facades\Broadcast;

/*
|--------------------------------------------------------------------------
| Broadcast Channels (Laravel Reverb — WebSocket)
|--------------------------------------------------------------------------
| Scalable authorization rules for private and presence channels.
*/

// Authenticated user private channel (supports both standard formats)
Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

Broadcast::channel('user.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

// Seller-specific private channel
Broadcast::channel('seller.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id && in_array($user->role->value ?? $user->role, ['seller', 'admin'], true);
});

// Presence channel for marketplace activity (who is currently browsing)
Broadcast::channel('marketplace', function ($user) {
    if ($user) {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'role' => $user->role->value ?? $user->role,
        ];
    }
    return false;
});

Broadcast::channel('presence.marketplace', function ($user) {
    if ($user) {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'role' => $user->role->value ?? $user->role,
        ];
    }
    return false;
});
