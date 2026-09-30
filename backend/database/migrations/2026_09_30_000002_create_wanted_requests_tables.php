<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Wanted ads: buyers post hard-to-find part requests, sellers reply
     * with quotes (wanted_offers). Requester accepts one offer to fulfil.
     */
    public function up(): void
    {
        Schema::create('wanted_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('title', 160);
            $table->string('category', 60)->nullable()->index();
            $table->string('engine_code', 80)->nullable()->index();
            $table->string('part_number', 80)->nullable();
            $table->text('specs')->nullable();
            $table->decimal('budget_min', 12, 2)->nullable();
            $table->decimal('budget_max', 12, 2)->nullable();
            $table->string('condition', 20)->default('any')->index();
            $table->string('city', 120)->nullable();
            $table->string('contact_phone', 50)->nullable();
            $table->string('status', 20)->default('open')->index();
            $table->timestamps();
        });

        Schema::create('wanted_offers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('wanted_request_id')->constrained('wanted_requests')->cascadeOnDelete();
            $table->foreignId('seller_id')->constrained('users')->cascadeOnDelete();
            $table->decimal('price', 12, 2);
            $table->text('message')->nullable();
            $table->string('status', 20)->default('pending')->index();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wanted_offers');
        Schema::dropIfExists('wanted_requests');
    }
};
