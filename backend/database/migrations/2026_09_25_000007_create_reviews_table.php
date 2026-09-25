<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Listing reviews (stars + comment) for cars and parts.
     * Reviewer identity is intentionally minimal — only username + avatar
     * are ever exposed via the API, never real names or emails.
     */
    public function up(): void
    {
        Schema::create('reviews', function (Blueprint $table) {
            $table->id();
            $table->foreignId('buyer_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('seller_id')->constrained('users')->cascadeOnDelete();
            $table->string('item_type', 10); // part|car
            $table->foreignId('part_id')->nullable()->constrained('parts')->cascadeOnDelete();
            $table->foreignId('car_id')->nullable()->constrained('cars')->cascadeOnDelete();
            $table->unsignedTinyInteger('rating'); // 1–5 stars
            $table->string('title', 150)->nullable();
            $table->string('body', 2000)->nullable();
            $table->boolean('is_verified_purchase')->default(false);
            $table->boolean('is_visible')->default(true);
            $table->timestamps();

            $table->index(['item_type', 'part_id', 'is_visible']);
            $table->index(['item_type', 'car_id', 'is_visible']);
            $table->index(['seller_id', 'is_visible']);
        });

        Schema::table('cars', function (Blueprint $table) {
            $table->unsignedInteger('reviews_count')->default(0)->after('rating');
        });
    }

    public function down(): void
    {
        Schema::table('cars', function (Blueprint $table) {
            $table->dropColumn('reviews_count');
        });

        Schema::dropIfExists('reviews');
    }
};
