<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json([
        'service' => config('app.name'),
        'message' => 'API is running. See /api/v1/health.',
    ]);
});
