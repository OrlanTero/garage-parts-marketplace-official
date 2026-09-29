<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Drop the legacy categories.subcategories JSON-text column.
     * Its contents were migrated into the subcategories table by
     * 2026_09_25_000001_upgrade_taxonomy_live_counts. Keeping the column
     * shadows the Category::subcategories() HasMany relation (Eloquent
     * returns the raw string attribute instead of the relation), which
     * breaks CategoryResource serialization.
     */
    public function up(): void
    {
        Schema::table('categories', function (Blueprint $table) {
            if (Schema::hasColumn('categories', 'subcategories')) {
                $table->dropColumn('subcategories');
            }
        });
    }

    public function down(): void
    {
        Schema::table('categories', function (Blueprint $table) {
            if (! Schema::hasColumn('categories', 'subcategories')) {
                $table->text('subcategories')->nullable()->after('description');
            }
        });
    }
};
