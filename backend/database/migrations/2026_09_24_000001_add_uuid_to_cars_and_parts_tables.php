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
        if (!Schema::hasColumn('cars', 'uuid')) {
            Schema::table('cars', function (Blueprint $table) {
                $table->uuid('uuid')->nullable()->unique()->after('id');
            });
        }

        if (!Schema::hasColumn('parts', 'uuid')) {
            Schema::table('parts', function (Blueprint $table) {
                $table->uuid('uuid')->nullable()->unique()->after('id');
            });
        }

        // Backfill existing cars with UUIDs
        $cars = DB::table('cars')->whereNull('uuid')->get(['id']);
        foreach ($cars as $car) {
            DB::table('cars')->where('id', $car->id)->update(['uuid' => (string) Str::uuid()]);
        }

        // Backfill existing parts with UUIDs
        $parts = DB::table('parts')->whereNull('uuid')->get(['id']);
        foreach ($parts as $part) {
            DB::table('parts')->where('id', $part->id)->update(['uuid' => (string) Str::uuid()]);
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('cars', 'uuid')) {
            Schema::table('cars', function (Blueprint $table) {
                $table->dropColumn('uuid');
            });
        }

        if (Schema::hasColumn('parts', 'uuid')) {
            Schema::table('parts', function (Blueprint $table) {
                $table->dropColumn('uuid');
            });
        }
    }
};
