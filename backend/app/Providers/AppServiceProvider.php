<?php

namespace App\Providers;

use App\Models\Car;
use App\Models\Part;
use App\Policies\CarPolicy;
use App\Policies\PartPolicy;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        Gate::policy(Car::class, CarPolicy::class);
        Gate::policy(Part::class, PartPolicy::class);

        // Resolve user for broadcasting channel auth across Sanctum API & session guards
        Broadcast::resolveAuthenticatedUserUsing(fn (Request $request) => $request->user());

        RateLimiter::for('api', function (Request $request) {
            return Limit::perMinute(60)->by($request->user()?->id ?: $request->ip());
        });
    }
}
