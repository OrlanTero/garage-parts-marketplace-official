<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Media module — supports multiple images and media for cars, parts, and other entities.
     */
    public function up(): void
    {
        Schema::create('media', function (Blueprint $table) {
            $table->id();
            $table->string('mediable_type')->nullable();
            $table->unsignedBigInteger('mediable_id')->nullable();
            $table->text('url');
            $table->string('type', 30)->default('image'); // image, video, document
            $table->boolean('is_primary')->default(false);
            $table->unsignedSmallInteger('order')->default(0);
            $table->string('caption')->nullable();
            $table->string('file_path')->nullable();
            $table->string('file_name')->nullable();
            $table->string('mime_type', 100)->nullable();
            $table->unsignedBigInteger('size_bytes')->nullable();
            $table->timestamps();

            $table->index(['mediable_type', 'mediable_id']);
            $table->index('is_primary');
            $table->index('order');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('media');
    }
};
