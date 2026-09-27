<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('platform_transactions', function (Blueprint $table) {
            $table->id();
            $table->string('uuid')->unique();
            $table->string('transaction_number')->unique(); // e.g. TXN-2026-981245
            $table->string('reference_number')->nullable(); // external or payment reference
            $table->string('stream_type'); // car_sale_commission, parking_fee, part_sale_commission, auction_fee, payout, adjustment
            $table->string('direction')->default('credit'); // credit (revenue in), debit (payout/refund out)
            $table->decimal('gross_amount', 14, 2)->default(0.00); // Gross deal price or car sale amount
            $table->decimal('fee_rate', 5, 2)->default(5.00); // Commission or fee percentage (e.g. 5.00%)
            $table->decimal('net_amount', 14, 2)->default(0.00); // Net platform revenue earned in PHP
            $table->decimal('balance_after', 14, 2)->nullable(); // Running platform balance snapshot
            $table->string('currency', 10)->default('PHP');
            $table->string('payment_method')->default('gcash'); // gcash, maya, bank_transfer, card, escrow, cash
            $table->string('payment_reference')->nullable();
            $table->string('status')->default('completed'); // completed, pending, settled, refunded, failed
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete(); // Buyer / Payer
            $table->foreignId('seller_id')->nullable()->constrained('users')->nullOnDelete(); // Seller / Partner Garage
            $table->foreignId('car_id')->nullable()->constrained('cars')->nullOnDelete();
            $table->foreignId('order_id')->nullable()->constrained('orders')->nullOnDelete();
            $table->foreignId('showroom_slot_id')->nullable()->constrained('showroom_slots')->nullOnDelete();
            $table->string('title')->nullable(); // E.g. "5% Car Sale Commission — 1972 Toyota Celica GT 1600"
            $table->text('description')->nullable();
            $table->json('metadata')->nullable(); // Extended details (e.g. buyer info, VIN, bay number)
            $table->timestamp('settled_at')->nullable();
            $table->timestamps();

            $table->index(['stream_type', 'status']);
            $table->index(['created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('platform_transactions');
    }
};
