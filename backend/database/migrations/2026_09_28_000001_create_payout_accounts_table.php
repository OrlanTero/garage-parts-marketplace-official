<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payout_accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('label', 120)->nullable(); // e.g. "Main GCash"
            $table->string('channel', 30); // bank | gcash | maya
            $table->string('account_name', 160); // account holder name
            $table->string('account_number', 80); // wallet number / bank acct no
            $table->string('bank_name', 120)->nullable(); // banks only
            $table->boolean('is_default')->default(false);
            $table->timestamps();

            $table->unique(['user_id', 'channel', 'account_number'], 'payout_acct_unique');
            $table->index(['user_id', 'is_default']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payout_accounts');
    }
};
