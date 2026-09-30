<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->decimal('commission_rate', 5, 2)->nullable()->change();
        });

        // Legacy flat-5% defaults become "no override" so the 3%/10%
        // type rates apply. Genuine custom rates are preserved.
        DB::table('users')->where('commission_rate', 5.00)->update(['commission_rate' => null]);
    }

    public function down(): void
    {
        DB::table('users')->whereNull('commission_rate')->update(['commission_rate' => 5.00]);
        Schema::table('users', function (Blueprint $table) {
            $table->decimal('commission_rate', 5, 2)->nullable(false)->change();
        });
    }
};
