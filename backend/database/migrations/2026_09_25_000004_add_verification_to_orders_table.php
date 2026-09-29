<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Sales-order verification lifecycle.
     * Many buyers may request the same listing (verification_status=pending);
     * the seller accepts exactly one, the rest are rejected. Payment and
     * fulfillment unlock only after acceptance.
     */
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->string('verification_status', 20)->default('pending')->after('status');
            $table->string('verification_note', 500)->nullable()->after('verification_status');
            $table->index('verification_status');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropIndex(['verification_status']);
            $table->dropColumn(['verification_status', 'verification_note']);
        });
    }
};
