<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('conversations', function (Blueprint $table) {
            // Buyer-side lock: when a listing sells out, every thread except
            // the winner's is locked for buyers (the seller stays exempt so
            // follow-ups like restock offers remain possible).
            $table->boolean('is_locked')->default(false)->after('listing_id');
            $table->foreignId('locked_exempt_user_id')->nullable()->after('is_locked')
                ->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('conversations', function (Blueprint $table) {
            $table->dropConstrainedForeignId('locked_exempt_user_id');
            $table->dropColumn('is_locked');
        });
    }
};
