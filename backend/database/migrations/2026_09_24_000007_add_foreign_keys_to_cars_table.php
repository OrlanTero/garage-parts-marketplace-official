<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cars', function (Blueprint $table) {
            $table->foreignId('brand_id')->nullable()->after('brand')
                ->constrained('brands')->nullOnDelete();
            $table->foreignId('model_id')->nullable()->after('model')
                ->constrained('car_models')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('cars', function (Blueprint $table) {
            $table->dropConstrainedForeignId('model_id');
            $table->dropConstrainedForeignId('brand_id');
        });
    }
};
