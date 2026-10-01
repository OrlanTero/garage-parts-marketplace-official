<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            // Car-build meetup mode: buyer drops by the seller/garage
            // point (dropoff) or the seller visits the buyer's pinned
            // location (onsite_visit). Parts orders leave this null.
            $table->string('handover_mode', 20)->nullable()->after('delivery_label'); // dropoff|onsite_visit
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn(['handover_mode']);
        });
    }
};
