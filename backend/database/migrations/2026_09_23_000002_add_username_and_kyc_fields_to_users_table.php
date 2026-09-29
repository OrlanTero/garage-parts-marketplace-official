<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Adds username for marketplace privacy and comprehensive KYC seller verification fields.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('username', 60)->nullable()->unique()->after('name');
            $table->string('kyc_status', 30)->default('not_submitted')->after('avatar_url')->index();
            $table->boolean('is_kyc_verified')->default(false)->after('kyc_status')->index();
            $table->string('kyc_document_type', 50)->nullable()->after('is_kyc_verified');
            $table->string('kyc_document_number', 100)->nullable()->after('kyc_document_type');
            $table->string('kyc_document_url', 500)->nullable()->after('kyc_document_number');
            $table->string('kyc_selfie_url', 500)->nullable()->after('kyc_document_url');
            $table->text('kyc_notes')->nullable()->after('kyc_selfie_url');
            $table->text('kyc_rejection_reason')->nullable()->after('kyc_notes');
            $table->timestamp('kyc_submitted_at')->nullable()->after('kyc_rejection_reason');
            $table->timestamp('kyc_verified_at')->nullable()->after('kyc_submitted_at');
            $table->foreignId('kyc_verified_by')->nullable()->after('kyc_verified_at')->constrained('users')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['kyc_verified_by']);
            $table->dropColumn([
                'username',
                'kyc_status',
                'is_kyc_verified',
                'kyc_document_type',
                'kyc_document_number',
                'kyc_document_url',
                'kyc_selfie_url',
                'kyc_notes',
                'kyc_rejection_reason',
                'kyc_submitted_at',
                'kyc_verified_at',
                'kyc_verified_by',
            ]);
        });
    }
};
