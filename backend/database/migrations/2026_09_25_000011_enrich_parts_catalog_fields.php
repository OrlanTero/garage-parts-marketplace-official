<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Catalog master-data enrichment (§1) + inventory control fields (§2):
     * MPN, UOM, spec/custom attributes, barcode, lifecycle status,
     * reserved quantity, and min/max/reorder/safety stock levels.
     */
    public function up(): void
    {
        Schema::table('parts', function (Blueprint $table) {
            $table->string('mpn', 120)->nullable()->after('part_number');
            $table->string('uom', 20)->default('pc')->after('quantity');
            $table->json('specifications')->nullable()->after('uom');
            $table->string('barcode', 120)->nullable()->after('specifications');
            $table->string('lifecycle_status', 20)->default('active')->after('status');
            $table->unsignedInteger('reserved_quantity')->default(0)->after('quantity');
            $table->unsignedInteger('min_stock')->default(0)->after('reserved_quantity');
            $table->unsignedInteger('max_stock')->nullable()->after('min_stock');
            $table->unsignedInteger('reorder_point')->default(0)->after('max_stock');
            $table->unsignedInteger('safety_stock')->default(0)->after('reorder_point');

            $table->index('mpn');
            $table->index('barcode');
            $table->index('lifecycle_status');
        });
    }

    public function down(): void
    {
        Schema::table('parts', function (Blueprint $table) {
            $table->dropIndex(['mpn']);
            $table->dropIndex(['barcode']);
            $table->dropIndex(['lifecycle_status']);
            $table->dropColumn([
                'mpn', 'uom', 'specifications', 'barcode', 'lifecycle_status',
                'reserved_quantity', 'min_stock', 'max_stock', 'reorder_point', 'safety_stock',
            ]);
        });
    }
};
