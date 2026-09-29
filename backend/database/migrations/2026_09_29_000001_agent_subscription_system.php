<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Sales Agent subscription system:
     * - users.referred_by_user_id tracks who referred the signup (via agent_code ?ref=)
     * - users.agent_subscription_status gates active agent privileges (inactive|active|expired)
     * - agent_subscriptions ledger records each yearly fee payment.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'referred_by_user_id')) {
                $table->foreignId('referred_by_user_id')->nullable()->after('agent_tagline')->constrained('users')->nullOnDelete();
            }
            if (! Schema::hasColumn('users', 'agent_subscription_status')) {
                $table->string('agent_subscription_status', 20)->default('inactive')->after('referred_by_user_id');
            }
            if (! Schema::hasColumn('users', 'agent_subscribed_at')) {
                $table->dateTime('agent_subscribed_at')->nullable()->after('agent_subscription_status');
            }
            if (! Schema::hasColumn('users', 'agent_expires_at')) {
                $table->dateTime('agent_expires_at')->nullable()->after('agent_subscribed_at');
            }
            if (! Schema::hasColumn('users', 'agent_last_payment_at')) {
                $table->dateTime('agent_last_payment_at')->nullable()->after('agent_expires_at');
            }
            if (! Schema::hasColumn('users', 'agent_last_payment_amount')) {
                $table->decimal('agent_last_payment_amount', 10, 2)->nullable()->after('agent_last_payment_at');
            }
            if (! Schema::hasColumn('users', 'referral_reward_paid_at')) {
                $table->dateTime('referral_reward_paid_at')->nullable()->after('agent_last_payment_amount');
            }
        });

        // Indexes (separate statements for MySQL idempotency on partial runs).
        try {
            Schema::table('users', function (Blueprint $table) {
                $table->index('referred_by_user_id');
            });
        } catch (\Throwable $e) {
        }
        try {
            Schema::table('users', function (Blueprint $table) {
                $table->index('agent_subscription_status');
            });
        } catch (\Throwable $e) {
        }
        try {
            Schema::table('users', function (Blueprint $table) {
                $table->index('agent_expires_at');
            });
        } catch (\Throwable $e) {
        }

        if (Schema::hasTable('agent_subscriptions')) {
            return;
        }

        Schema::create('agent_subscriptions', function (Blueprint $table) {
            $table->id();
            $table->string('uuid')->unique();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->decimal('amount', 10, 2);
            $table->string('status', 20)->default('active'); // active|expired|renewed
            $table->string('payment_method', 60)->default('gcash');
            $table->string('payment_reference', 190)->nullable();
            $table->dateTime('starts_at');
            $table->dateTime('expires_at');
            $table->foreignId('verified_by')->nullable()->constrained('users')->nullOnDelete();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'status']);
            $table->index('expires_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('agent_subscriptions');

        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['referred_by_user_id']);
            $table->dropIndex(['referred_by_user_id']);
            $table->dropIndex(['agent_subscription_status']);
            $table->dropIndex(['agent_expires_at']);
            $table->dropColumn([
                'referred_by_user_id',
                'agent_subscription_status',
                'agent_subscribed_at',
                'agent_expires_at',
                'agent_last_payment_at',
                'agent_last_payment_amount',
                'referral_reward_paid_at',
            ]);
        });
    }
};
