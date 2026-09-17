<?php

use Illuminate\Support\Facades\Broadcast;

/*
|--------------------------------------------------------------------------
| Broadcast Channels (Laravel Reverb — WebSocket)
|--------------------------------------------------------------------------
| No business channels yet. Authenticated user channel proves wiring.
*/

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});
