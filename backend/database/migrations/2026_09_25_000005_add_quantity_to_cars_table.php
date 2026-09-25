<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Sellers can list more than one unit of the same vehicle build
     * (e.g. dealer stock). Defaults to 1 to match existing listings.
     */
    public function up(): void
    {
        Schema::table('cars', function (Blueprint $table) {
            $table->unsignedInteger('quantity')->default(1)->after('condition');
            $table->index('quantity');
        });
    }

    public function down(): void
    {
        Schema::table('cars', function (Blueprint $table) {
            $table->dropIndex(['quantity']);
            $table->dropColumn('quantity');
        });
    }
};
