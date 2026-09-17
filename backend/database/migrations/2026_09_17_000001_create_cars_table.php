<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Cars module — core vehicle table.
     * Media is intentionally OUT of scope (dedicated media module later).
     */
    public function up(): void
    {
        Schema::create('cars', function (Blueprint $table) {
            $table->id();
            $table->foreignId('seller_id')->constrained('users')->cascadeOnDelete();

            $table->string('title');
            $table->string('brand', 80);
            $table->string('model', 80);
            $table->unsignedSmallInteger('year');
            $table->decimal('price', 12, 2);
            $table->unsignedInteger('mileage_km')->default(0);

            $table->string('body_style', 30)->nullable();
            $table->string('fuel_type', 30)->nullable();
            $table->string('transmission', 30)->nullable();
            $table->string('condition', 30)->default('used');
            $table->string('color', 50)->nullable();
            $table->string('vin', 17)->nullable()->unique();
            $table->text('description')->nullable();
            $table->string('city', 120)->nullable();

            $table->string('status', 20)->default('draft');
            $table->timestamp('published_at')->nullable();
            $table->timestamp('sold_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['status', 'published_at']);
            $table->index('seller_id');
            $table->index(['brand', 'model']);
            $table->index('price');
            $table->index('year');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cars');
    }
};
