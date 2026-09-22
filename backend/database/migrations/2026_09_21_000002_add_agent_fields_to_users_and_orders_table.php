<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Product Sharing & Sales Agent System:
     * Adds unique agent referral codes and commission rates to users,
     * and agent referral attribution & commission tracking to sales orders.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('agent_code', 50)->nullable()->unique()->after('avatar_url');
            $table->decimal('commission_rate', 5, 2)->default(5.00)->after('agent_code');
            $table->boolean('is_agent')->default(true)->after('commission_rate');
            $table->string('agent_tagline', 255)->nullable()->after('is_agent');
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->foreignId('agent_id')->nullable()->after('seller_id')->constrained('users')->nullOnDelete();
            $table->string('agent_code', 50)->nullable()->after('agent_id');
            $table->string('agent_name', 255)->nullable()->after('agent_code');
            $table->decimal('commission_rate', 5, 2)->default(5.00)->after('total_amount');
            $table->decimal('commission_amount', 12, 2)->default(0.00)->after('commission_rate');
            $table->string('commission_status', 30)->default('pending')->after('commission_amount');

            $table->index('agent_id');
            $table->index('agent_code');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropForeign(['agent_id']);
            $table->dropIndex(['agent_id']);
            $table->dropIndex(['agent_code']);
            $table->dropColumn([
                'agent_id',
                'agent_code',
                'agent_name',
                'commission_rate',
                'commission_amount',
                'commission_status',
            ]);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['agent_code']);
            $table->dropColumn(['agent_code', 'commission_rate', 'is_agent', 'agent_tagline']);
        });
    }
};
