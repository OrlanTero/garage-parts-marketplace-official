<?php

use App\Http\Controllers\Api\AdminAppointmentController;
use App\Http\Controllers\Api\AdminCarModerationController;
use App\Http\Controllers\Api\AdminChatModerationController;
use App\Http\Controllers\Api\AdminKycController;
use App\Http\Controllers\Api\AdminSellerApplicationController;
use App\Http\Controllers\Api\AdminUserController;
use App\Http\Controllers\Api\AgentController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\AddressController;
use App\Http\Controllers\Api\ChatController;
use App\Http\Controllers\Api\FavoriteController;
use App\Http\Controllers\Api\HealthController;
use App\Http\Controllers\Api\KycController;
use App\Http\Controllers\Api\MarketplaceCarController;
use App\Http\Controllers\Api\MarketplacePartController;
use App\Http\Controllers\Api\MediaController;
use App\Http\Controllers\Api\OAuthController;
use App\Http\Controllers\Api\OfferController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\ReviewController;
use App\Http\Controllers\Api\SellerApplicationController;
use App\Http\Controllers\Api\SellerCarController;
use App\Http\Controllers\Api\SellerDashboardController;
use App\Http\Controllers\Api\SellerOrderController;
use App\Http\Controllers\Api\SellerPartController;
use App\Http\Controllers\Api\SystemMaintenanceController;
use App\Http\Controllers\Api\TaxonomyController;
use App\Http\Controllers\Api\AdminTaxonomyController;
use App\Http\Controllers\Api\AdminReviewController;
use App\Http\Controllers\Api\InventoryController;
use App\Http\Controllers\Api\PartCatalogController;
use App\Http\Controllers\Api\SupplierController;
use App\Http\Controllers\Api\WarehouseController;
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
        Route::patch('/auth/profile', [AuthController::class, 'updateProfile'])->name('api.auth.profile');
        Route::post('/auth/password', [AuthController::class, 'changePassword'])->name('api.auth.password');
        Route::post('/auth/logout', [AuthController::class, 'logout'])->name('api.auth.logout');
        Route::post('/auth/logout-all', [AuthController::class, 'logoutAll'])->name('api.auth.logoutAll');

        // Address Book (delivery addresses with map pins)
        Route::get('/addresses', [AddressController::class, 'index'])->name('api.addresses.index');
        Route::post('/addresses', [AddressController::class, 'store'])->name('api.addresses.store');
        Route::match(['put', 'patch'], '/addresses/{address}', [AddressController::class, 'update'])->name('api.addresses.update');
        Route::delete('/addresses/{address}', [AddressController::class, 'destroy'])->name('api.addresses.destroy');
        Route::post('/addresses/{address}/default', [AddressController::class, 'makeDefault'])->name('api.addresses.default');

        // Chat & 1:1 Direct Messaging
        Route::prefix('chat')->name('api.chat.')->group(function () {
            Route::get('/unread-count', [ChatController::class, 'unreadCount'])->name('unreadCount');
            Route::get('/conversations', [ChatController::class, 'index'])->name('conversations.index');
            Route::post('/conversations', [ChatController::class, 'store'])->name('conversations.store');
            Route::get('/conversations/{conversation}', [ChatController::class, 'show'])->name('conversations.show');
            Route::get('/conversations/{conversation}/messages', [ChatController::class, 'messages'])->name('conversations.messages');
            Route::post('/conversations/{conversation}/messages', [ChatController::class, 'sendMessage'])->name('conversations.sendMessage');
            Route::post('/conversations/{conversation}/read', [ChatController::class, 'markRead'])->name('conversations.markRead');
        });

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

        // User Sales Orders History
        Route::get('/orders', [OrderController::class, 'index'])->name('api.orders.index');
        Route::patch('/orders/{identifier}/payment-method', [OrderController::class, 'updatePaymentMethod'])->name('api.orders.paymentMethod');
        Route::patch('/orders/{identifier}/delivery-location', [OrderController::class, 'updateDeliveryLocation'])->name('api.orders.deliveryLocation');

        // Buyer Price Offers (amount + comment on listings)
        Route::get('/offers', [OfferController::class, 'mine'])->name('api.offers.mine');
        Route::post('/offers', [OfferController::class, 'store'])->name('api.offers.store');
        Route::post('/offers/{offer}/withdraw', [OfferController::class, 'withdraw'])->name('api.offers.withdraw');

        // Listing Reviews (stars + comment, one per buyer per listing)
        Route::get('/reviews/mine', [ReviewController::class, 'mine'])->name('api.reviews.mine');
        Route::post('/reviews', [ReviewController::class, 'store'])->name('api.reviews.store');
        Route::match(['put', 'patch'], '/reviews/{review}', [ReviewController::class, 'update'])->name('api.reviews.update');
        Route::delete('/reviews/{review}', [ReviewController::class, 'destroy'])->name('api.reviews.destroy');

        // KYC Seller Verification & Status
        Route::prefix('kyc')->name('api.kyc.')->group(function () {
            Route::get('/status', [KycController::class, 'status'])->name('status');
            Route::post('/submit', [KycController::class, 'submit'])->name('submit');
        });

        // Buyer-to-Seller Upgrade Applications
        Route::prefix('seller-applications')->name('api.seller-applications.')->group(function () {
            Route::get('/', [SellerApplicationController::class, 'index'])->name('index');
            Route::post('/', [SellerApplicationController::class, 'store'])->name('store');
            Route::post('/{application}/withdraw', [SellerApplicationController::class, 'withdraw'])->name('withdraw');
        });

        // Sales Agent Portal & Performance
        Route::prefix('agent')->name('api.agent.')->group(function () {
            Route::get('/stats', [AgentController::class, 'stats'])->name('stats');
            Route::post('/profile', [AgentController::class, 'updateProfile'])->name('profile');
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

    // --- Public taxonomy (Brand / Model / Category — replaces hardcoded frontend) ---
    Route::prefix('taxonomy')->name('api.taxonomy.')->group(function () {
        Route::get('/brands', [TaxonomyController::class, 'brands'])->name('brands');
        Route::get('/brands/{brand}', [TaxonomyController::class, 'brand'])->name('brand');
        Route::get('/models', [TaxonomyController::class, 'models'])->name('models');
        Route::get('/categories', [TaxonomyController::class, 'categories'])->name('categories');
        Route::get('/part-brands', [TaxonomyController::class, 'partBrands'])->name('partBrands');
        Route::get('/meta', [TaxonomyController::class, 'meta'])->name('meta');
    });

    // --- Checkout & Sales Orders (Public / Customer) ---
    Route::post('/orders', [OrderController::class, 'store'])->name('api.orders.store');
    Route::get('/orders/{identifier}', [OrderController::class, 'show'])->name('api.orders.show');

    // --- Public Sales Agent Verification ---
    Route::get('/agents/verify/{code}', [AgentController::class, 'verify'])->name('api.agents.verify');

    // --- Public listing reviews (username + avatar identity only) ---
    Route::get('/reviews', [ReviewController::class, 'index'])->name('api.reviews.index');
    Route::get('/reviews/summary', [ReviewController::class, 'summary'])->name('api.reviews.summary');

    // --- Seller inventory (auth + role:seller,dealer,parts_seller,admin) ---
    Route::middleware(['auth:sanctum', 'role:seller,dealer,parts_seller,admin'])
        ->prefix('seller')->name('api.seller.')->group(function () {
            Route::get('/summary', [SellerDashboardController::class, 'summary'])->name('summary');
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

            // Incoming sales-order requests (verify one, auto-reject the rest)
            Route::get('/orders', [SellerOrderController::class, 'index'])->name('orders.index');
            Route::post('/orders/{order}/accept', [SellerOrderController::class, 'accept'])->name('orders.accept');
            Route::post('/orders/{order}/reject', [SellerOrderController::class, 'reject'])->name('orders.reject');

            // Incoming buyer offers (accept one, auto-reject the rest)
            Route::get('/offers', [OfferController::class, 'incoming'])->name('offers.incoming');
            Route::post('/offers/{offer}/accept', [OfferController::class, 'accept'])->name('offers.accept');
            Route::post('/offers/{offer}/reject', [OfferController::class, 'reject'])->name('offers.reject');

            // --- Parts & Catalog Inventory (§1–§11) ---
            // Suppliers & warehouses
            Route::get('/suppliers', [SupplierController::class, 'index'])->name('suppliers.index');
            Route::post('/suppliers', [SupplierController::class, 'store'])->name('suppliers.store');
            Route::get('/suppliers/{supplier}', [SupplierController::class, 'show'])->name('suppliers.show');
            Route::match(['put', 'patch'], '/suppliers/{supplier}', [SupplierController::class, 'update'])->name('suppliers.update');
            Route::delete('/suppliers/{supplier}', [SupplierController::class, 'destroy'])->name('suppliers.destroy');

            Route::get('/warehouses', [WarehouseController::class, 'index'])->name('warehouses.index');
            Route::post('/warehouses', [WarehouseController::class, 'store'])->name('warehouses.store');
            Route::match(['put', 'patch'], '/warehouses/{warehouse}', [WarehouseController::class, 'update'])->name('warehouses.update');
            Route::delete('/warehouses/{warehouse}', [WarehouseController::class, 'destroy'])->name('warehouses.destroy');
            Route::post('/warehouses/{warehouse}/bins', [WarehouseController::class, 'storeBin'])->name('bins.store');
            Route::delete('/bins/{bin}', [WarehouseController::class, 'destroyBin'])->name('bins.destroy');

            // Stock ledger, alerts, reports, catalog search
            Route::get('/inventory/movements', [InventoryController::class, 'movements'])->name('inventory.movements');
            Route::get('/inventory/low-stock', [InventoryController::class, 'lowStock'])->name('inventory.lowStock');
            Route::get('/inventory/summary', [InventoryController::class, 'summary'])->name('inventory.summary');
            Route::get('/catalog/search', [InventoryController::class, 'search'])->name('catalog.search');
            Route::post('/parts/{part}/stock-movements', [InventoryController::class, 'storeMovement'])->name('parts.movements.store');
            Route::post('/parts/{part}/transfer', [InventoryController::class, 'transfer'])->name('parts.transfer');

            // Per-part catalog extensions: suppliers, relations, serials
            Route::get('/parts/{part}/suppliers', [PartCatalogController::class, 'suppliers'])->name('parts.suppliers.index');
            Route::post('/parts/{part}/suppliers', [PartCatalogController::class, 'linkSupplier'])->name('parts.suppliers.link');
            Route::delete('/parts/{part}/suppliers/{supplier}', [PartCatalogController::class, 'unlinkSupplier'])->name('parts.suppliers.unlink');
            Route::get('/parts/{part}/relations', [PartCatalogController::class, 'relations'])->name('parts.relations.index');
            Route::post('/parts/{part}/relations', [PartCatalogController::class, 'linkRelation'])->name('parts.relations.link');
            Route::delete('/parts/{part}/relations/{relation}', [PartCatalogController::class, 'unlinkRelation'])->name('parts.relations.unlink');
            Route::get('/parts/{part}/serials', [PartCatalogController::class, 'serials'])->name('parts.serials.index');
            Route::post('/parts/{part}/serials', [PartCatalogController::class, 'storeSerials'])->name('parts.serials.store');
            Route::match(['put', 'patch'], '/serials/{serial}', [PartCatalogController::class, 'updateSerial'])->name('serials.update');
        });

    // --- Admin & Staff Moderation Portal (auth + role:admin,super_admin,inspector) ---
    Route::middleware(['auth:sanctum', 'role:admin,super_admin,inspector'])
        ->prefix('admin')->name('api.admin.')->group(function () {
            // Car Moderation & Vehicle Inspection Lifecycle
            Route::get('/moderation/cars', [AdminCarModerationController::class, 'index'])->name('moderation.cars.index');
            Route::post('/moderation/cars/{car}/schedule-inspection', [AdminCarModerationController::class, 'scheduleInspection'])->name('moderation.cars.schedule');
            Route::post('/moderation/cars/{car}/record-inspection', [AdminCarModerationController::class, 'recordInspection'])->name('moderation.cars.record');
            Route::post('/moderation/cars/{car}/approve', [AdminCarModerationController::class, 'approve'])->name('moderation.cars.approve');
            Route::post('/moderation/cars/{car}/reject', [AdminCarModerationController::class, 'reject'])->name('moderation.cars.reject');

            // Appointment Monitoring (Garage vs On-site)
            Route::get('/appointments', [AdminAppointmentController::class, 'index'])->name('appointments.index');

            // Basic Chat Moderation & PII Alert Logging
            Route::get('/chat/conversations', [AdminChatModerationController::class, 'index'])->name('chat.conversations.index');
            Route::get('/chat/conversations/{conversation}', [AdminChatModerationController::class, 'show'])->name('chat.conversations.show');

            // --- Admin-only: RBAC, KYC, applications, orders, reviews, taxonomy.
            // Inspectors keep moderation + appointments; everything below
            // requires admin/super_admin even though the outer group is wider.
            Route::middleware(['role:admin,super_admin'])->group(function () {
            // Users, Buyers, Sellers, Dealers & RBAC Permissions
            Route::get('/users', [AdminUserController::class, 'index'])->name('users.index');
            Route::get('/staff', [AdminUserController::class, 'staff'])->name('staff.index');
            Route::patch('/users/{user}/role', [AdminUserController::class, 'updateRole'])->name('users.updateRole');

            // KYC Seller Verification Review & Badging
            Route::get('/kyc-verifications', [AdminKycController::class, 'index'])->name('kyc.index');
            Route::post('/kyc-verifications/{user}/approve', [AdminKycController::class, 'approve'])->name('kyc.approve');
            Route::post('/kyc-verifications/{user}/reject', [AdminKycController::class, 'reject'])->name('kyc.reject');

            // Buyer-to-Seller Upgrade Application Review
            Route::get('/seller-applications', [AdminSellerApplicationController::class, 'index'])->name('seller-applications.index');
            Route::post('/seller-applications/{application}/approve', [AdminSellerApplicationController::class, 'approve'])->name('seller-applications.approve');
            Route::post('/seller-applications/{application}/reject', [AdminSellerApplicationController::class, 'reject'])->name('seller-applications.reject');

            // Sales Orders Management
            Route::get('/orders', [OrderController::class, 'index'])->name('orders.index');
            Route::patch('/orders/{order}/status', [OrderController::class, 'updateStatus'])->name('orders.updateStatus');

            // Listing Review Moderation (hide spam / restore)
            Route::get('/reviews', [AdminReviewController::class, 'index'])->name('reviews.index');
            Route::post('/reviews/{review}/visibility', [AdminReviewController::class, 'setVisibility'])->name('reviews.visibility');

            // Brand / Model / Category Taxonomy CRUD (Admin TaxonomyManagement page)
            Route::post('/taxonomy/brands', [AdminTaxonomyController::class, 'storeBrand'])->name('taxonomy.brands.store');
            Route::match(['put', 'patch'], '/taxonomy/brands/{brand}', [AdminTaxonomyController::class, 'updateBrand'])->name('taxonomy.brands.update');
            Route::delete('/taxonomy/brands/{brand}', [AdminTaxonomyController::class, 'destroyBrand'])->name('taxonomy.brands.destroy');
            Route::post('/taxonomy/brands/{brand}/models', [AdminTaxonomyController::class, 'storeModel'])->name('taxonomy.models.store');
            Route::match(['put', 'patch'], '/taxonomy/models/{model}', [AdminTaxonomyController::class, 'updateModel'])->name('taxonomy.models.update');
            Route::delete('/taxonomy/models/{model}', [AdminTaxonomyController::class, 'destroyModel'])->name('taxonomy.models.destroy');
            Route::post('/taxonomy/models/{model}/fitment', [AdminTaxonomyController::class, 'syncFitment'])->name('taxonomy.models.fitment');
            Route::post('/taxonomy/categories', [AdminTaxonomyController::class, 'storeCategory'])->name('taxonomy.categories.store');
            Route::match(['put', 'patch'], '/taxonomy/categories/{category}', [AdminTaxonomyController::class, 'updateCategory'])->name('taxonomy.categories.update');
            Route::delete('/taxonomy/categories/{category}', [AdminTaxonomyController::class, 'destroyCategory'])->name('taxonomy.categories.destroy');
            Route::post('/taxonomy/categories/{category}/subcategories', [AdminTaxonomyController::class, 'storeSubcategory'])->name('taxonomy.subcategories.store');
            Route::delete('/taxonomy/subcategories/{subcategory}', [AdminTaxonomyController::class, 'destroySubcategory'])->name('taxonomy.subcategories.destroy');
            }); // end admin-only subgroup
        });
});
