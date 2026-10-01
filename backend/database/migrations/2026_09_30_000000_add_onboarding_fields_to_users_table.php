<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Onboarding wizard support: interest picks + setup completion stamp.
     * Nullable so every pre-existing account starts as "needs onboarding".
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->json('interests')->nullable()->after('avatar_url');
            $table->timestamp('onboarding_completed_at')->nullable()->after('interests');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['interests', 'onboarding_completed_at']);
        });
    }
};
