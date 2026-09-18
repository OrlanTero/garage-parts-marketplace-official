<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\FavoriteController;
use App\Http\Controllers\Api\HealthController;
use App\Http\Controllers\Api\MarketplaceCarController;
use App\Http\Controllers\Api\MarketplacePartController;
use App\Http\Controllers\Api\MediaController;
use App\Http\Controllers\Api\OAuthController;
use App\Http\Controllers\Api\SellerCarController;
use App\Http\Controllers\Api\SellerPartController;
use App\Http\Controllers\Api\SystemMaintenanceController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes — v1
| Session module: credential auth (Sanctum tokens) + OAuth (Socialite).
| Cars module: public marketplace listing + seller inventory.
| Parts module: public marketplace listing + seller inventory.
| Roles: buyer | seller | dealer | parts_seller (+ reserved admin).
|--------------------------------------------------------------------------
*/

Route::prefix('v1')->group(function () {
    Route::get('/health', HealthController::class)->name('api.health');

    // --- System & Database Maintenance (Remote Migration & Seeding) ---
    Route::prefix('system')->name('api.system.')->group(function () {
        Route::match(['get', 'post'], '/migrate-status', [SystemMaintenanceController::class, 'status'])->name('migrateStatus');
        Route::post('/migrate', [SystemMaintenanceController::class, 'migrate'])->name('migrate');
        Route::post('/seed', [SystemMaintenanceController::class, 'seed'])->name('seed');
        Route::post('/migrate-seed', [SystemMaintenanceController::class, 'migrateAndSeed'])->name('migrateSeed');
    });

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

        // Media upload & management (Laravel Storage / AWS S3 ready)
        Route::prefix('media')->name('api.media.')->group(function () {
            Route::post('/upload', [MediaController::class, 'upload'])->name('upload');
            Route::get('/{media}', [MediaController::class, 'show'])->name('show');
            Route::delete('/{media}', [MediaController::class, 'destroy'])->name('destroy');
        });

        // Saved & Favorites (Wishlist & Saved Vehicles/Parts)
        Route::prefix('favorites')->name('api.favorites.')->group(function () {
            Route::get('/', [FavoriteController::class, 'index'])->name('index');
            Route::get('/ids', [FavoriteController::class, 'ids'])->name('ids');
            Route::post('/toggle', [FavoriteController::class, 'toggle'])->name('toggle');
            Route::post('/', [FavoriteController::class, 'store'])->name('store');
            Route::delete('/clear', [FavoriteController::class, 'clear'])->name('clear');
            Route::delete('/{id?}', [FavoriteController::class, 'destroy'])->name('destroy');
        });

        // Legacy alias (pre-session-module clients)
        Route::get('/me', [AuthController::class, 'me'])->name('api.me');

        // --- Role probes (session-module test helpers, not business modules) ---
        Route::get('/_session/ping-buyer', fn () => response()->json(['ok' => true, 'as' => 'buyer']))
            ->middleware('role:buyer')->name('api.session.pingBuyer');
        Route::get('/_session/ping-seller', fn () => response()->json(['ok' => true, 'as' => 'seller']))
            ->middleware('role:seller')->name('api.session.pingSeller');
        Route::get('/_session/ping-dealer', fn () => response()->json(['ok' => true, 'as' => 'dealer']))
            ->middleware('role:dealer')->name('api.session.pingDealer');
        Route::get('/_session/ping-parts-seller', fn () => response()->json(['ok' => true, 'as' => 'parts_seller']))
            ->middleware('role:parts_seller')->name('api.session.pingPartsSeller');
        Route::get('/_session/ping-admin', fn () => response()->json(['ok' => true, 'as' => 'admin']))
            ->middleware('role:admin')->name('api.session.pingAdmin');
    });

    // --- Public marketplace (Phase 2: car buy-and-sell listings) ---
    Route::prefix('marketplace')->name('api.marketplace.')->group(function () {
        Route::get('/cars', [MarketplaceCarController::class, 'index'])->name('cars.index');
        Route::get('/cars/{car}', [MarketplaceCarController::class, 'show'])->name('cars.show');
        Route::get('/parts', [MarketplacePartController::class, 'index'])->name('parts.index');
        Route::get('/parts/{part}', [MarketplacePartController::class, 'show'])->name('parts.show');
    });

    // --- Seller inventory (auth + role:seller,dealer,parts_seller,admin) ---
    Route::middleware(['auth:sanctum', 'role:seller,dealer,parts_seller,admin'])
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
