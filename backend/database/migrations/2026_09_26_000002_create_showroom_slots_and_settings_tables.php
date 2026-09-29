<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Add showroom activation flags to users table
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'is_showroom_active')) {
                $table->boolean('is_showroom_active')->default(false)->after('is_kyc_verified');
            }
            if (!Schema::hasColumn('users', 'showroom_activated_at')) {
                $table->timestamp('showroom_activated_at')->nullable()->after('is_showroom_active');
            }
        });

        // 2. Add showroom placement flags to cars table
        Schema::table('cars', function (Blueprint $table) {
            if (!Schema::hasColumn('cars', 'is_in_showroom')) {
                $table->boolean('is_in_showroom')->default(false)->after('is_approved');
            }
            if (!Schema::hasColumn('cars', 'showroom_status')) {
                $table->string('showroom_status')->default('none')->after('is_in_showroom');
            }
        });

        // 3. Showroom Settings table (for parameterized parking fee percentage, etc.)
        Schema::create('showroom_settings', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->text('value');
            $table->string('description')->nullable();
            $table->timestamps();
        });

        // Seed default 5% parking fee configuration
        DB::table('showroom_settings')->insert([
            [
                'key' => 'parking_fee_percentage',
                'value' => '5.00',
                'description' => 'Percentage of vehicle listing price charged as showroom parking placement fee.',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key' => 'min_parking_fee',
                'value' => '5000.00',
                'description' => 'Minimum baseline showroom parking fee in PHP.',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'key' => 'showroom_enabled',
                'value' => 'true',
                'description' => 'Global status toggle for showroom parking slot applications.',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);

        // 4. Showroom Parking Slots / Placement applications table
        Schema::create('showroom_slots', function (Blueprint $table) {
            $table->id();
            $table->string('uuid')->unique();
            $table->foreignId('seller_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('car_id')->constrained('cars')->cascadeOnDelete();
            $table->decimal('car_price', 14, 2);
            $table->decimal('fee_percentage', 5, 2)->default(5.00);
            $table->decimal('calculated_fee', 14, 2);
            $table->string('payment_method')->default('gcash');
            $table->string('payment_reference')->nullable();
            $table->string('payment_proof_url')->nullable();
            $table->string('status')->default('pending'); // pending, approved, rejected, revoked, expired
            $table->text('seller_notes')->nullable();
            $table->text('admin_notes')->nullable();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('showroom_slots');
        Schema::dropIfExists('showroom_settings');

        Schema::table('cars', function (Blueprint $table) {
            if (Schema::hasColumn('cars', 'is_in_showroom')) {
                $table->dropColumn(['is_in_showroom', 'showroom_status']);
            }
        });

        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'is_showroom_active')) {
                $table->dropColumn(['is_showroom_active', 'showroom_activated_at']);
            }
        });
    }
};
