<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Chassis/VIN fitment fields are mandatory for PART orders only.
     * Car orders record the purchased vehicle's own VIN instead, so both
     * columns must accept NULL.
     */
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->string('chassis_number', 100)->nullable()->change();
            $table->string('vin', 100)->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->string('chassis_number', 100)->nullable(false)->change();
            $table->string('vin', 100)->nullable(false)->change();
        });
    }
};
