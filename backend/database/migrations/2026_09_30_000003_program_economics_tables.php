<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Program economics:
     * - user perks membership (discount club): status + expiry + payments.
     * - per-part member discount (0–30%), applied at checkout for members.
     * - persisted order discount + merchant perks catalog.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('perks_status', 20)->default('inactive')->after('referral_reward_paid_at');
            $table->timestamp('perks_subscribed_at')->nullable()->after('perks_status');
            $table->timestamp('perks_expires_at')->nullable()->after('perks_subscribed_at');
            $table->timestamp('perks_last_payment_at')->nullable()->after('perks_expires_at');
            $table->decimal('perks_last_payment_amount', 10, 2)->nullable()->after('perks_last_payment_at');
        });

        Schema::table('parts', function (Blueprint $table) {
            $table->unsignedTinyInteger('perks_discount_pct')->default(0)->after('free_shipping');
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->decimal('discount_amount', 12, 2)->default(0)->after('shipping_fee');
            $table->unsignedTinyInteger('perks_discount_pct')->default(0)->after('discount_amount');
        });

        Schema::create('perks', function (Blueprint $table) {
            $table->id();
            $table->string('title', 160);
            $table->string('category', 40)->default('other')->index();
            $table->string('partner', 160)->nullable();
            $table->string('discount_label', 80);
            $table->text('description')->nullable();
            $table->text('terms')->nullable();
            $table->boolean('is_active')->default(true)->index();
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });

        // Program change: flat 5% → 3% cars / 10% parts. Legacy default
        // 5.00 rows become "no override" so type rates apply; genuine
        // custom rates (anything else) are preserved.
        DB::table('users')->where('commission_rate', 5.00)->update(['commission_rate' => null]);
    }

    public function down(): void
    {
        Schema::dropIfExists('perks');
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn(['discount_amount', 'perks_discount_pct']);
        });
        Schema::table('parts', function (Blueprint $table) {
            $table->dropColumn('perks_discount_pct');
        });
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'perks_status', 'perks_subscribed_at', 'perks_expires_at',
                'perks_last_payment_at', 'perks_last_payment_amount',
            ]);
        });
    }
};
