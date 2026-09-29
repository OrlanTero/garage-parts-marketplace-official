<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Buyer price offers on car/part listings (amount + comment).
     * Flow: pending → accepted | rejected | withdrawn. Accepting one offer
     * auto-rejects the other pending offers on the same listing.
     */
    public function up(): void
    {
        Schema::create('offers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('buyer_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('seller_id')->constrained('users')->cascadeOnDelete();
            $table->string('item_type', 10); // part|car
            $table->foreignId('part_id')->nullable()->constrained('parts')->cascadeOnDelete();
            $table->foreignId('car_id')->nullable()->constrained('cars')->cascadeOnDelete();
            $table->decimal('amount', 12, 2);
            $table->string('message', 1000)->nullable();
            $table->string('status', 20)->default('pending'); // pending|accepted|rejected|withdrawn
            $table->string('seller_note', 500)->nullable();
            $table->timestamps();

            $table->index(['seller_id', 'status']);
            $table->index(['buyer_id', 'status']);
            $table->index(['item_type', 'part_id']);
            $table->index(['item_type', 'car_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('offers');
    }
};
