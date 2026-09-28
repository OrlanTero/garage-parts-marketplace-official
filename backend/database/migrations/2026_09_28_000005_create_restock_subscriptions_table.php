<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('restock_subscriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('listing_type', 10); // car | part
            $table->unsignedBigInteger('listing_id');
            $table->timestamps();

            $table->unique(['user_id', 'listing_type', 'listing_id'], 'restock_sub_unique');
            $table->index(['listing_type', 'listing_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('restock_subscriptions');
    }
};
