<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Session-module fields: role (buyer/seller) + OAuth linkage + login tracking.
     * Separate migration (not editing the create-table one) so existing
     * checkouts migrate cleanly.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('role', 20)->default('buyer')->after('password')->index();
            $table->string('provider', 30)->nullable()->after('role')->index();
            $table->string('provider_id')->nullable()->after('provider');
            $table->string('avatar_url')->nullable()->after('provider_id');
            $table->timestamp('last_login_at')->nullable()->after('remember_token');

            // One provider account maps to exactly one local user.
            $table->unique(['provider', 'provider_id'], 'users_provider_unique');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique('users_provider_unique');
            $table->dropColumn(['role', 'provider', 'provider_id', 'avatar_url', 'last_login_at']);
        });
    }
};
