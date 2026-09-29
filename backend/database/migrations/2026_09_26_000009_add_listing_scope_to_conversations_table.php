<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('conversations', function (Blueprint $table) {
            $table->string('listing_type', 20)->nullable();
            $table->unsignedBigInteger('listing_id')->nullable();
            $table->string('listing_key', 40)->default('none');
        });

        $conversations = DB::table('conversations')->get();
        foreach ($conversations as $conv) {
            $msg = DB::table('messages')
                ->where('conversation_id', $conv->id)
                ->whereNotNull('listing_type')
                ->whereNotNull('listing_id')
                ->orderByDesc('id')
                ->first();

            $type = $msg->listing_type ?? null;
            $id = $msg->listing_id ?? null;
            $key = ($type && $id) ? "{$type}:{$id}" : 'none';

            DB::table('conversations')->where('id', $conv->id)->update([
                'listing_type' => $type,
                'listing_id' => $id,
                'listing_key' => $key,
            ]);
        }

        Schema::table('conversations', function (Blueprint $table) {
            $table->dropUnique(['user_one_id', 'user_two_id']);
            $table->unique(['user_one_id', 'user_two_id', 'listing_key']);
            $table->index('listing_key');
            $table->index(['listing_type', 'listing_id']);
        });
    }

    public function down(): void
    {
        Schema::table('conversations', function (Blueprint $table) {
            $table->dropUnique(['user_one_id', 'user_two_id', 'listing_key']);
            $table->dropIndex(['listing_key']);
            $table->dropIndex(['listing_type', 'listing_id']);
        });

        Schema::table('conversations', function (Blueprint $table) {
            $table->unique(['user_one_id', 'user_two_id']);
            $table->dropColumn(['listing_type', 'listing_id', 'listing_key']);
        });
    }
};
