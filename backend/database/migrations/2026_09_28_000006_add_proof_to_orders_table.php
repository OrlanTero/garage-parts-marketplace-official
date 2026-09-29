<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            // Seller handover proof (car builds): photos + note submitted on
            // delivery; an admin approves to release the held funds.
            $table->json('proof_images')->nullable()->after('notes');
            $table->text('proof_note')->nullable()->after('proof_images');
            $table->string('proof_status', 20)->default('none')->after('proof_note'); // none|pending|approved|rejected
            $table->timestamp('proof_submitted_at')->nullable()->after('proof_status');
            $table->foreignId('proof_reviewed_by')->nullable()->after('proof_submitted_at')
                ->constrained('users')->nullOnDelete();
            $table->timestamp('proof_reviewed_at')->nullable()->after('proof_reviewed_by');
            $table->text('proof_rejection_reason')->nullable()->after('proof_reviewed_at');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropConstrainedForeignId('proof_reviewed_by');
            $table->dropColumn([
                'proof_images', 'proof_note', 'proof_status',
                'proof_submitted_at', 'proof_reviewed_at', 'proof_rejection_reason',
            ]);
        });
    }
};
