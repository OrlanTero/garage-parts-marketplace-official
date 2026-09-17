<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add supplemental frontend-facing fields to cars and parts tables.
     */
    public function up(): void
    {
        Schema::table('cars', function (Blueprint $table) {
            $table->decimal('original_price', 12, 2)->nullable()->after('price');
            $table->string('tag', 100)->nullable()->after('condition');
            $table->decimal('rating', 3, 2)->default(5.00)->after('status');
            $table->string('inspection_score', 30)->nullable()->after('rating');
            $table->string('location', 120)->nullable()->after('city');
        });

        Schema::table('parts', function (Blueprint $table) {
            $table->decimal('original_price', 12, 2)->nullable()->after('price');
            $table->boolean('free_shipping')->default(false)->after('quantity');
            $table->string('tag', 100)->nullable()->after('condition');
            $table->decimal('rating', 3, 2)->default(5.00)->after('status');
            $table->unsignedInteger('reviews_count')->default(0)->after('rating');
            $table->string('location', 120)->nullable()->after('city');
        });
    }

    public function down(): void
    {
        Schema::table('cars', function (Blueprint $table) {
            $table->dropColumn(['original_price', 'tag', 'rating', 'inspection_score', 'location']);
        });

        Schema::table('parts', function (Blueprint $table) {
            $table->dropColumn(['original_price', 'free_shipping', 'tag', 'rating', 'reviews_count', 'location']);
        });
    }
};
