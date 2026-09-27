<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            // Unique per-order security hash for the receipt QR code.
            // Exactly one hash exists per transaction — it is minted once
            // at creation, never rotated, and is the only value the
            // public verify endpoint accepts as proof of validity.
            $table->string('security_hash', 64)->nullable()->unique()->after('order_number');
        });

        // Backfill pre-existing orders.
        foreach (DB::table('orders')->whereNull('security_hash')->get(['id', 'order_number']) as $row) {
            DB::table('orders')->where('id', $row->id)->update([
                'security_hash' => hash('sha256', ($row->order_number ?? $row->id) . '|' . Str::random(32)),
            ]);
        }
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropUnique(['security_hash']);
            $table->dropColumn('security_hash');
        });
    }
};
