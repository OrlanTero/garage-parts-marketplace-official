<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Parts module — core automotive parts/accessories table.
     * Media is intentionally OUT of scope (dedicated media module later).
     * Fitment is a free-text field for now (structured fitment later).
     */
    public function up(): void
    {
        Schema::create('parts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('seller_id')->constrained('users')->cascadeOnDelete();

            $table->string('title');
            $table->string('category', 30);
            $table->string('brand', 80)->nullable();
            $table->string('part_number', 80)->nullable();
            $table->text('compatibility')->nullable();
            $table->string('condition', 30)->default('used');
            $table->unsignedInteger('quantity')->default(1);
            $table->decimal('price', 12, 2);
            $table->text('description')->nullable();
            $table->string('city', 120)->nullable();

            $table->string('status', 20)->default('draft');
            $table->timestamp('published_at')->nullable();
            $table->timestamp('sold_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['status', 'published_at']);
            $table->index('seller_id');
            $table->index('category');
            $table->index('price');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('parts');
    }
};
