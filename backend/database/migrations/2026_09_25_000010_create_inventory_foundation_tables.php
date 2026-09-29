<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Parts & Catalog Inventory foundation (Phase 1):
     * suppliers, warehouses/bins, supplier catalog links, stock movement
     * ledger, serial tracking, and part relationships (incl. BOM kits).
     * All inventory is owner-scoped (seller/dealer/parts_seller).
     */
    public function up(): void
    {
        Schema::create('suppliers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('owner_id')->constrained('users')->cascadeOnDelete();
            $table->string('name', 150);
            $table->string('contact_person', 150)->nullable();
            $table->string('email', 255)->nullable();
            $table->string('phone', 50)->nullable();
            $table->string('address', 500)->nullable();
            $table->string('city', 120)->nullable();
            $table->unsignedInteger('lead_time_days')->default(7);
            $table->text('notes')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['owner_id', 'is_active']);
        });

        Schema::create('warehouses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('owner_id')->constrained('users')->cascadeOnDelete();
            $table->string('name', 150);
            $table->string('code', 30);
            $table->string('address', 500)->nullable();
            $table->string('city', 120)->nullable();
            $table->boolean('is_default')->default(false);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['owner_id', 'code']);
        });

        // Bin-level hierarchy: Warehouse → Zone → Rack → Shelf → Bin.
        Schema::create('bins', function (Blueprint $table) {
            $table->id();
            $table->foreignId('warehouse_id')->constrained('warehouses')->cascadeOnDelete();
            $table->string('code', 40);
            $table->string('zone', 40)->nullable();
            $table->string('rack', 40)->nullable();
            $table->string('shelf', 40)->nullable();
            $table->string('name', 150)->nullable();
            $table->unsignedInteger('capacity')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['warehouse_id', 'code']);
        });

        // Supplier catalog: supplier-specific SKU, pricing, lead time, MOQ.
        Schema::create('part_suppliers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('part_id')->constrained('parts')->cascadeOnDelete();
            $table->foreignId('supplier_id')->constrained('suppliers')->cascadeOnDelete();
            $table->string('supplier_sku', 120)->nullable();
            $table->decimal('cost_price', 12, 2)->nullable();
            $table->unsignedInteger('lead_time_days')->nullable();
            $table->unsignedInteger('moq')->default(1);
            $table->boolean('is_preferred')->default(false);
            $table->timestamps();

            $table->unique(['part_id', 'supplier_id']);
        });

        // Immutable stock movement ledger (who/what/when/where/qty/reason).
        Schema::create('stock_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('part_id')->constrained('parts')->cascadeOnDelete();
            $table->foreignId('warehouse_id')->nullable()->constrained('warehouses')->nullOnDelete();
            $table->foreignId('bin_id')->nullable()->constrained('bins')->nullOnDelete();
            $table->string('type', 30); // receipt|issue|transfer_in|transfer_out|adjustment|return|reservation|release|consumption|damage|count
            $table->integer('quantity_change'); // signed
            $table->unsignedInteger('quantity_after');
            $table->decimal('unit_cost', 12, 2)->nullable();
            $table->string('reference', 150)->nullable(); // PO / order / count-sheet ref
            $table->string('reason', 500)->nullable();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamps();

            $table->index(['part_id', 'created_at']);
            $table->index(['warehouse_id', 'created_at']);
            $table->index('type');
        });

        Schema::create('part_serials', function (Blueprint $table) {
            $table->id();
            $table->foreignId('part_id')->constrained('parts')->cascadeOnDelete();
            $table->string('serial', 120);
            $table->string('status', 20)->default('in_stock'); // in_stock|reserved|sold|damaged
            $table->foreignId('warehouse_id')->nullable()->constrained('warehouses')->nullOnDelete();
            $table->foreignId('bin_id')->nullable()->constrained('bins')->nullOnDelete();
            $table->timestamps();

            $table->unique(['part_id', 'serial']);
            $table->index(['part_id', 'status']);
        });

        // Compatible / substitute / superseded / interchangeable / BOM kit components.
        Schema::create('part_relations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('part_id')->constrained('parts')->cascadeOnDelete();
            $table->foreignId('related_part_id')->constrained('parts')->cascadeOnDelete();
            $table->string('relation_type', 30); // compatible|substitute|superseded_by|interchangeable|component
            $table->decimal('quantity', 10, 3)->default(1); // component qty for BOM kits
            $table->string('notes', 500)->nullable();
            $table->timestamps();

            $table->unique(['part_id', 'related_part_id', 'relation_type'], 'part_relations_unique');
            $table->index(['related_part_id', 'relation_type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('part_relations');
        Schema::dropIfExists('part_serials');
        Schema::dropIfExists('stock_movements');
        Schema::dropIfExists('part_suppliers');
        Schema::dropIfExists('bins');
        Schema::dropIfExists('warehouses');
        Schema::dropIfExists('suppliers');
    }
};
