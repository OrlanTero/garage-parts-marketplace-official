<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('cars', function (Blueprint $table) {
            $table->string('inspection_type', 30)->nullable()->after('inspection_score'); // garage_dropoff | onsite_visit
            $table->string('inspection_status', 30)->default('pending')->after('inspection_type'); // pending | scheduled | passed | failed
            $table->dateTime('inspection_date')->nullable()->after('inspection_status');
            $table->string('inspection_location')->nullable()->after('inspection_date');
            $table->foreignId('inspector_id')->nullable()->after('inspection_location')->constrained('users')->nullOnDelete();
            $table->text('inspector_notes')->nullable()->after('inspector_id');
            $table->boolean('is_approved')->default(false)->after('inspector_notes');
            $table->foreignId('approved_by')->nullable()->after('is_approved')->constrained('users')->nullOnDelete();
            $table->dateTime('approved_at')->nullable()->after('approved_by');
            $table->text('rejection_reason')->nullable()->after('approved_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('cars', function (Blueprint $table) {
            $table->dropForeign(['inspector_id']);
            $table->dropForeign(['approved_by']);
            $table->dropColumn([
                'inspection_type',
                'inspection_status',
                'inspection_date',
                'inspection_location',
                'inspector_id',
                'inspector_notes',
                'is_approved',
                'approved_by',
                'approved_at',
                'rejection_reason',
            ]);
        });
    }
};
