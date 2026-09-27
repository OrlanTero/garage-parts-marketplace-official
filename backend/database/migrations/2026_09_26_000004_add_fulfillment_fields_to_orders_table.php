<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            if (!Schema::hasColumn('orders', 'delivery_distance_km')) {
                $table->decimal('delivery_distance_km', 8, 2)->nullable()->after('shipping_fee');
            }
            if (!Schema::hasColumn('orders', 'delivery_zone')) {
                $table->string('delivery_zone', 60)->nullable()->after('delivery_distance_km');
            }
            if (!Schema::hasColumn('orders', 'payment_reference')) {
                $table->string('payment_reference', 100)->nullable()->after('payment_status');
            }
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            foreach (['payment_reference', 'delivery_zone', 'delivery_distance_km'] as $column) {
                if (Schema::hasColumn('orders', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
