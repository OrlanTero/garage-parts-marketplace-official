<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Orders & Sales Order table capturing customer details,
     * vehicle identification (Chassis Number & VIN), item line details, and status.
     */
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->string('order_number', 50)->unique();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();

            // Buyer / Customer Information
            $table->string('buyer_name');
            $table->string('buyer_email');
            $table->string('buyer_phone', 50)->nullable();
            $table->text('shipping_address');
            $table->string('shipping_city', 120)->nullable();
            $table->string('shipping_postal_code', 30)->nullable();

            // Vehicle Fitment & Identification Details (Mandatory for Sales Orders)
            $table->string('chassis_number', 100);
            $table->string('vin', 100);
            $table->string('vehicle_make_model', 255)->nullable();

            // Item Details
            $table->string('item_type', 30)->default('part');
            $table->foreignId('part_id')->nullable()->constrained('parts')->nullOnDelete();
            $table->foreignId('car_id')->nullable()->constrained('cars')->nullOnDelete();
            $table->foreignId('seller_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('item_name', 255);
            $table->string('item_sku', 100)->nullable();
            $table->string('item_image_url', 500)->nullable();
            $table->string('seller_name', 255)->nullable();

            // Pricing & Financials
            $table->unsignedInteger('quantity')->default(1);
            $table->decimal('unit_price', 12, 2);
            $table->decimal('shipping_fee', 12, 2)->default(0.00);
            $table->decimal('total_amount', 12, 2);

            // Payment & Fulfillment Status
            $table->string('payment_method', 50)->default('bank_transfer');
            $table->string('payment_status', 30)->default('pending');
            $table->string('status', 30)->default('processing');
            $table->string('tracking_number', 100)->nullable();
            $table->string('carrier', 100)->nullable();
            $table->text('notes')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->index('order_number');
            $table->index('user_id');
            $table->index('seller_id');
            $table->index('status');
            $table->index('chassis_number');
            $table->index('vin');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
