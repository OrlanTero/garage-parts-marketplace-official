<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('offers', function (Blueprint $table) {
            if (!Schema::hasColumn('offers', 'conversation_id')) {
                $table->foreignId('conversation_id')->nullable()->after('seller_id')
                    ->constrained('conversations')->nullOnDelete();
            }
            if (!Schema::hasColumn('offers', 'sender_id')) {
                $table->foreignId('sender_id')->nullable()->after('conversation_id')
                    ->constrained('users')->nullOnDelete();
            }
            if (!Schema::hasColumn('offers', 'parent_id')) {
                $table->foreignId('parent_id')->nullable()->after('conversation_id')
                    ->constrained('offers')->nullOnDelete();
            }
            if (!Schema::hasColumn('offers', 'checkout_token')) {
                $table->uuid('checkout_token')->nullable()->unique()->after('seller_note');
            }
            if (!Schema::hasColumn('offers', 'checkout_used_at')) {
                $table->dateTime('checkout_used_at')->nullable()->after('checkout_token');
            }
            if (!Schema::hasColumn('offers', 'confirmed_by')) {
                $table->foreignId('confirmed_by')->nullable()->after('checkout_used_at')
                    ->constrained('users')->nullOnDelete();
            }
        });

        Schema::create('reservations', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('conversation_id')->constrained('conversations')->cascadeOnDelete();
            $table->foreignId('offer_id')->nullable()->constrained('offers')->nullOnDelete();
            $table->string('item_type', 20)->default('car');
            $table->foreignId('car_id')->nullable()->constrained('cars')->nullOnDelete();
            $table->foreignId('part_id')->nullable()->constrained('parts')->nullOnDelete();
            $table->foreignId('buyer_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('seller_id')->constrained('users')->cascadeOnDelete();
            $table->decimal('amount', 12, 2);
            $table->decimal('fee_percentage', 5, 2)->default(5.00);
            $table->string('status', 20)->default('pending'); // pending|paid|confirmed|cancelled
            $table->dateTime('scheduled_for')->nullable();
            $table->string('payment_method', 40)->nullable();
            $table->string('payment_reference', 100)->nullable();
            $table->dateTime('confirmed_at')->nullable();
            $table->timestamps();
        });

        Schema::table('messages', function (Blueprint $table) {
            if (!Schema::hasColumn('messages', 'offer_id')) {
                $table->foreignId('offer_id')->nullable()->after('listing_id')
                    ->constrained('offers')->nullOnDelete();
            }
            if (!Schema::hasColumn('messages', 'reservation_id')) {
                $table->foreignId('reservation_id')->nullable()->after('offer_id')
                    ->constrained('reservations')->nullOnDelete();
            }
            if (!Schema::hasColumn('messages', 'metadata')) {
                $table->json('metadata')->nullable()->after('reservation_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('messages', function (Blueprint $table) {
            foreach (['metadata', 'reservation_id', 'offer_id'] as $column) {
                if (Schema::hasColumn('messages', $column)) {
                    $table->dropColumn($column);
                }
            }
        });

        Schema::dropIfExists('reservations');

        Schema::table('offers', function (Blueprint $table) {
            if (Schema::hasColumn('offers', 'confirmed_by')) {
                $table->dropConstrainedForeignId('confirmed_by');
            }
            foreach (['checkout_used_at', 'checkout_token'] as $column) {
                if (Schema::hasColumn('offers', $column)) {
                    $table->dropColumn($column);
                }
            }
            if (Schema::hasColumn('offers', 'parent_id')) {
                $table->dropConstrainedForeignId('parent_id');
            }
            if (Schema::hasColumn('offers', 'conversation_id')) {
                $table->dropConstrainedForeignId('conversation_id');
            }
            if (Schema::hasColumn('offers', 'sender_id')) {
                $table->dropConstrainedForeignId('sender_id');
            }
        });
    }
};
