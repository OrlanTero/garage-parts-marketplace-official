<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Precise delivery pinpoint for parts freight (set by the buyer on the
     * sales order once the seller accepts). Cars are handed over at the
     * showroom, so these stay NULL for vehicle orders.
     */
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->decimal('delivery_latitude', 10, 7)->nullable()->after('shipping_postal_code');
            $table->decimal('delivery_longitude', 10, 7)->nullable()->after('delivery_latitude');
            $table->string('delivery_label', 500)->nullable()->after('delivery_longitude');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn(['delivery_latitude', 'delivery_longitude', 'delivery_label']);
        });
    }
};
