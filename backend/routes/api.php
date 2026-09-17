<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\HealthController;
use App\Http\Controllers\Api\MarketplaceCarController;
use App\Http\Controllers\Api\MarketplacePartController;
use App\Http\Controllers\Api\OAuthController;
use App\Http\Controllers\Api\SellerCarController;
use App\Http\Controllers\Api\SellerPartController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes — v1
| Session module: credential auth (Sanctum tokens) + OAuth (Socialite).
| Cars module: public marketplace listing + seller inventory (role:seller,admin).
| Parts module: public marketplace listing + seller inventory (role:seller,admin).
| Roles: buyer | seller (+ reserved admin).
|--------------------------------------------------------------------------
*/

Route::prefix('v1')->group(function () {
    Route::get('/health', HealthController::class)->name('api.health');

    // --- Public session endpoints ---
    Route::prefix('auth')->name('api.auth.')->group(function () {
        Route::post('/register', [AuthController::class, 'register'])->name('register');
        Route::post('/login', [AuthController::class, 'login'])->name('login');

        // OAuth: JSON { url } by default; ?frontend=1 → real 302 redirect.
        Route::get('/oauth/{provider}/redirect', [OAuthController::class, 'redirect'])
            ->whereIn('provider', OAuthController::ALLOWED)
            ->name('oauth.redirect');
        Route::get('/oauth/{provider}/callback', [OAuthController::class, 'callback'])
            ->whereIn('provider', OAuthController::ALLOWED)
            ->name('oauth.callback');
    });

    // --- Authenticated session endpoints ---
    Route::middleware('auth:sanctum')->group(function () {
        // Canonical
        Route::get('/auth/me', [AuthController::class, 'me'])->name('api.auth.me');
        Route::post('/auth/logout', [AuthController::class, 'logout'])->name('api.auth.logout');
        Route::post('/auth/logout-all', [AuthController::class, 'logoutAll'])->name('api.auth.logoutAll');

        // WebSocket / Reverb Channel Authorization
        Route::post('/broadcasting/auth', function (\Illuminate\Http\Request $request) {
            return Broadcast::auth($request);
        })->name('api.broadcasting.auth');

        // Legacy alias (pre-session-module clients)
        Route::get('/me', [AuthController::class, 'me'])->name('api.me');

        // --- Role probes (session-module test helpers, not business modules) ---
        Route::get('/_session/ping-buyer', fn () => response()->json(['ok' => true, 'as' => 'buyer']))
            ->middleware('role:buyer')->name('api.session.pingBuyer');
        Route::get('/_session/ping-seller', fn () => response()->json(['ok' => true, 'as' => 'seller']))
            ->middleware('role:seller')->name('api.session.pingSeller');
    });

    // --- Public marketplace (Phase 2: car buy-and-sell listings) ---
    Route::prefix('marketplace')->name('api.marketplace.')->group(function () {
        Route::get('/cars', [MarketplaceCarController::class, 'index'])->name('cars.index');
        Route::get('/cars/{car}', [MarketplaceCarController::class, 'show'])->name('cars.show');
        Route::get('/parts', [MarketplacePartController::class, 'index'])->name('parts.index');
        Route::get('/parts/{part}', [MarketplacePartController::class, 'show'])->name('parts.show');
    });

    // --- Seller inventory (auth + role:seller,admin) ---
    Route::middleware(['auth:sanctum', 'role:seller,admin'])
        ->prefix('seller')->name('api.seller.')->group(function () {
            Route::get('/cars', [SellerCarController::class, 'index'])->name('cars.index');
            Route::post('/cars', [SellerCarController::class, 'store'])->name('cars.store');
            Route::get('/cars/{car}', [SellerCarController::class, 'show'])->name('cars.show');
            Route::match(['put', 'patch'], '/cars/{car}', [SellerCarController::class, 'update'])->name('cars.update');
            Route::delete('/cars/{car}', [SellerCarController::class, 'destroy'])->name('cars.destroy');
            Route::post('/cars/{car}/publish', [SellerCarController::class, 'publish'])->name('cars.publish');
            Route::post('/cars/{car}/unpublish', [SellerCarController::class, 'unpublish'])->name('cars.unpublish');
            Route::post('/cars/{car}/sold', [SellerCarController::class, 'markSold'])->name('cars.sold');

            Route::get('/parts', [SellerPartController::class, 'index'])->name('parts.index');
            Route::post('/parts', [SellerPartController::class, 'store'])->name('parts.store');
            Route::get('/parts/{part}', [SellerPartController::class, 'show'])->name('parts.show');
            Route::match(['put', 'patch'], '/parts/{part}', [SellerPartController::class, 'update'])->name('parts.update');
            Route::delete('/parts/{part}', [SellerPartController::class, 'destroy'])->name('parts.destroy');
            Route::post('/parts/{part}/publish', [SellerPartController::class, 'publish'])->name('parts.publish');
            Route::post('/parts/{part}/unpublish', [SellerPartController::class, 'unpublish'])->name('parts.unpublish');
            Route::post('/parts/{part}/sold', [SellerPartController::class, 'markSold'])->name('parts.sold');
        });
});
