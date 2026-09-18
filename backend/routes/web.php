<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;

Route::get('/', function () {
    return response()->json([
        'service' => config('app.name'),
        'message' => 'API is running. See /api/v1/health.',
    ]);
});

// Direct storage fallback route to guarantee media access across all development servers & environments
Route::get('/storage/{path}', function (string $path) {
    $disk = config('filesystems.default', 'public');
    
    if ($disk === 'public' || $disk === 'local') {
        if (!Storage::disk('public')->exists($path)) {
            abort(404);
        }
        return Storage::disk('public')->response($path);
    }

    return redirect(Storage::disk($disk)->url($path));
})->where('path', '.*')->name('storage.serve');
