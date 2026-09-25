<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Upgrade legacy taxonomy (static counts) to live-count taxonomy.
     *
     * Legacy state (migrations 2026_09_24_000003–000008, files missing from
     * repo, only present in deployed DB):
     *   brands(category_count static), car_models(parts_count static),
     *   categories(parts_count static, subcategories JSON text),
     *   cars.brand_id/model_id + parts.brand_id/category_id all NULL.
     *
     * This migration:
     *  - adds slug/region/is_active/sort_order + backfills them,
     *  - converts car_models.engines CSV text -> JSON, years -> years_label,
     *  - extracts categories.subcategories JSON -> subcategories table,
     *  - creates car_model_part fitment pivot (powers live Compatible Parts),
     *  - adds parts.subcategory_id.
     * Static *_count columns are kept untouched for backwards-compat but no
     * longer read — API uses withCount() instead.
     * Idempotent: every step guards with hasTable/hasColumn.
     */
    public function up(): void
    {
        // ---------- brands ----------
        Schema::table('brands', function (Blueprint $table) {
            if (! Schema::hasColumn('brands', 'slug')) {
                $table->string('slug', 100)->nullable()->after('name');
            }
            if (! Schema::hasColumn('brands', 'region')) {
                $table->string('region', 30)->default('other')->after('country');
            }
            if (! Schema::hasColumn('brands', 'logo_url')) {
                $table->string('logo_url', 500)->nullable()->after('region');
            }
            if (! Schema::hasColumn('brands', 'is_active')) {
                $table->boolean('is_active')->default(true)->after('logo_url');
            }
            if (! Schema::hasColumn('brands', 'sort_order')) {
                $table->unsignedInteger('sort_order')->default(0)->after('is_active');
            }
        });

        $this->backfillBrandSlugs();

        if (Schema::hasColumn('brands', 'slug')) {
            // Fill any still-null slugs (MySQL has no partial unique index here;
            // duplicates impossible after backfill since names are unique).
            Schema::table('brands', function (Blueprint $table) {
                try {
                    $table->unique('slug', 'brands_slug_unique');
                } catch (Throwable) {
                }
            });
        }

        // ---------- car_models ----------
        Schema::table('car_models', function (Blueprint $table) {
            if (! Schema::hasColumn('car_models', 'slug')) {
                $table->string('slug', 140)->nullable()->after('name');
            }
            if (! Schema::hasColumn('car_models', 'years_label')) {
                $table->string('years_label', 60)->nullable()->after('chassis_code');
            }
            if (! Schema::hasColumn('car_models', 'year_from')) {
                $table->unsignedSmallInteger('year_from')->nullable()->after('years_label');
            }
            if (! Schema::hasColumn('car_models', 'year_to')) {
                $table->unsignedSmallInteger('year_to')->nullable()->after('year_from');
            }
            if (! Schema::hasColumn('car_models', 'description')) {
                $table->text('description')->nullable()->after('engines');
            }
            if (! Schema::hasColumn('car_models', 'is_active')) {
                $table->boolean('is_active')->default(true)->after('description');
            }
            if (! Schema::hasColumn('car_models', 'sort_order')) {
                $table->unsignedInteger('sort_order')->default(0)->after('is_active');
            }
        });

        $this->backfillCarModels();

        // ---------- categories ----------
        Schema::table('categories', function (Blueprint $table) {
            if (! Schema::hasColumn('categories', 'slug')) {
                $table->string('slug', 140)->nullable()->after('name');
            }
            if (! Schema::hasColumn('categories', 'image_url')) {
                $table->string('image_url', 500)->nullable()->after('description');
            }
            if (! Schema::hasColumn('categories', 'icon')) {
                $table->string('icon', 60)->nullable()->after('image_url');
            }
            if (! Schema::hasColumn('categories', 'is_active')) {
                $table->boolean('is_active')->default(true)->after('icon');
            }
            if (! Schema::hasColumn('categories', 'sort_order')) {
                $table->unsignedInteger('sort_order')->default(0)->after('is_active');
            }
        });

        $this->backfillCategorySlugs();

        // ---------- subcategories (new table; legacy JSON migrated by seeder-safe code below) ----------
        if (! Schema::hasTable('subcategories')) {
            Schema::create('subcategories', function (Blueprint $table) {
                $table->id();
                $table->foreignId('category_id')->constrained('categories')->cascadeOnDelete();
                $table->string('name', 140);
                $table->string('slug', 160);
                $table->text('description')->nullable();
                $table->boolean('is_active')->default(true);
                $table->unsignedInteger('sort_order')->default(0);
                $table->timestamps();

                $table->unique(['category_id', 'slug']);
                $table->index(['category_id', 'is_active']);
            });
        }

        $this->migrateLegacySubcategories();

        // ---------- fitment pivot (new; powers live "X Compatible Parts") ----------
        if (! Schema::hasTable('car_model_part')) {
            Schema::create('car_model_part', function (Blueprint $table) {
                $table->foreignId('car_model_id')->constrained('car_models')->cascadeOnDelete();
                $table->foreignId('part_id')->constrained('parts')->cascadeOnDelete();
                $table->timestamps();

                $table->primary(['car_model_id', 'part_id']);
            });
        }

        // ---------- parts.subcategory_id ----------
        Schema::table('parts', function (Blueprint $table) {
            if (! Schema::hasColumn('parts', 'subcategory_id')) {
                $table->foreignId('subcategory_id')->nullable()->after('category_id')
                    ->constrained('subcategories')->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        Schema::table('parts', function (Blueprint $table) {
            if (Schema::hasColumn('parts', 'subcategory_id')) {
                try {
                    $table->dropConstrainedForeignId('subcategory_id');
                } catch (Throwable) {
                    $table->dropColumn('subcategory_id');
                }
            }
        });

        Schema::dropIfExists('car_model_part');
        Schema::dropIfExists('subcategories');

        foreach (['slug', 'image_url', 'icon', 'is_active', 'sort_order'] as $col) {
            if (Schema::hasColumn('categories', $col)) {
                Schema::table('categories', fn (Blueprint $t) => $t->dropColumn($col));
            }
        }

        foreach (['slug', 'years_label', 'year_from', 'year_to', 'description', 'is_active', 'sort_order'] as $col) {
            if (Schema::hasColumn('car_models', $col)) {
                Schema::table('car_models', fn (Blueprint $t) => $t->dropColumn($col));
            }
        }

        foreach (['slug', 'region', 'logo_url', 'is_active', 'sort_order'] as $col) {
            if (Schema::hasColumn('brands', $col)) {
                Schema::table('brands', fn (Blueprint $t) => $t->dropColumn($col));
            }
        }
    }

    private function backfillBrandSlugs(): void
    {
        foreach (DB::table('brands')->get() as $brand) {
            $patch = [];
            if (empty($brand->slug)) {
                $patch['slug'] = Str::slug($brand->name);
            }
            if (isset($brand->active) && Schema::hasColumn('brands', 'is_active')) {
                $patch['is_active'] = (bool) $brand->active;
            }
            if (empty($brand->region ?? null)) {
                $patch['region'] = match (strtolower((string) ($brand->country ?? ''))) {
                    'japan' => 'japanese',
                    'germany', 'italy', 'france', 'united kingdom', 'sweden', 'croatia' => 'european',
                    'united states' => 'american',
                    'south korea' => 'korean',
                    default => 'other',
                };
            }
            if ($patch) {
                DB::table('brands')->where('id', $brand->id)->update($patch);
            }
        }
    }

    private function backfillCarModels(): void
    {
        foreach (DB::table('car_models')->get() as $model) {
            $patch = [];
            if (empty($model->slug ?? null)) {
                $patch['slug'] = Str::slug($model->name);
            }
            // Legacy `years` ("1993 - 2002") -> years_label + year_from/year_to.
            if (empty($model->years_label ?? null) && !empty($model->years ?? null)) {
                $patch['years_label'] = $model->years;
                if (preg_match('/(\d{4})\s*-\s*(\d{4}|Present)/i', $model->years, $m)) {
                    $patch['year_from'] = (int) $m[1];
                    $patch['year_to'] = strcasecmp($m[2], 'Present') === 0 ? null : (int) $m[2];
                }
            }
            // Legacy engines CSV text -> JSON array.
            if (isset($model->engines) && is_string($model->engines) && $model->engines !== '') {
                $decoded = json_decode($model->engines, true);
                if (! is_array($decoded)) {
                    $patch['engines'] = json_encode(
                        collect(explode(',', $model->engines))->map(fn ($s) => trim($s))->filter()->values()->all()
                    );
                }
            }
            if (isset($model->active) && Schema::hasColumn('car_models', 'is_active')) {
                $patch['is_active'] = (bool) $model->active;
            }
            if ($patch) {
                DB::table('car_models')->where('id', $model->id)->update($patch);
            }
        }
    }

    private function backfillCategorySlugs(): void
    {
        $enumSlugs = [
            'ENG-PERF' => 'engine', 'EXH-SYS' => 'exhaust', 'SUSP-CHASSIS' => 'suspension',
            'BRK-BBK' => 'brakes', 'TIRE-WHL' => 'tires_wheels',
        ];
        $order = 0;
        foreach (DB::table('categories')->orderBy('id')->get() as $cat) {
            $patch = [];
            if (empty($cat->slug ?? null)) {
                $patch['slug'] = $enumSlugs[$cat->code] ?? Str::slug($cat->name);
            }
            if (isset($cat->active) && Schema::hasColumn('categories', 'is_active')) {
                $patch['is_active'] = (bool) $cat->active;
            }
            $patch['sort_order'] = $order++;
            DB::table('categories')->where('id', $cat->id)->update($patch);
        }
    }

    private function migrateLegacySubcategories(): void
    {
        if (! Schema::hasColumn('categories', 'subcategories')) {
            return;
        }

        foreach (DB::table('categories')->get() as $cat) {
            if (empty($cat->subcategories)) {
                continue;
            }
            if (DB::table('subcategories')->where('category_id', $cat->id)->exists()) {
                continue;
            }
            $subs = json_decode((string) $cat->subcategories, true);
            if (! is_array($subs)) {
                continue;
            }
            foreach (array_values($subs) as $i => $name) {
                DB::table('subcategories')->insert([
                    'category_id' => $cat->id,
                    'name' => $name,
                    'slug' => Str::slug((string) $name),
                    'is_active' => true,
                    'sort_order' => $i,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }
    }
};
