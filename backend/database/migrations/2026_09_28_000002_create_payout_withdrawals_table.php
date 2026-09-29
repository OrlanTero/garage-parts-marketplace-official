<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payout_withdrawals', function (Blueprint $table) {
            $table->id();
            $table->string('uuid')->unique();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('payout_account_id')->constrained('payout_accounts')->cascadeOnDelete();
            $table->decimal('amount', 14, 2);
            $table->decimal('fee', 14, 2)->default(0.00);
            $table->decimal('net_amount', 14, 2);
            $table->string('status', 30)->default('pending'); // pending | approved | rejected | paid
            $table->string('reference_number')->nullable();
            $table->text('admin_note')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'status']);
            $table->index(['status', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payout_withdrawals');
    }
};
