<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('warehouses', function (Blueprint $table) {
            if (!Schema::hasColumn('warehouses', 'latitude')) {
                $table->decimal('latitude', 10, 7)->nullable()->after('city');
            }
            if (!Schema::hasColumn('warehouses', 'longitude')) {
                $table->decimal('longitude', 11, 7)->nullable()->after('latitude');
            }
        });

        Schema::table('orders', function (Blueprint $table) {
            if (!Schema::hasColumn('orders', 'tracking_url')) {
                $table->string('tracking_url', 500)->nullable()->after('tracking_number');
            }
            if (!Schema::hasColumn('orders', 'warehouse_id')) {
                $table->foreignId('warehouse_id')->nullable()->after('seller_id')
                    ->constrained('warehouses')->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            if (Schema::hasColumn('orders', 'warehouse_id')) {
                $table->dropConstrainedForeignId('warehouse_id');
            }
            if (Schema::hasColumn('orders', 'tracking_url')) {
                $table->dropColumn('tracking_url');
            }
        });

        Schema::table('warehouses', function (Blueprint $table) {
            foreach (['longitude', 'latitude'] as $column) {
                if (Schema::hasColumn('warehouses', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
