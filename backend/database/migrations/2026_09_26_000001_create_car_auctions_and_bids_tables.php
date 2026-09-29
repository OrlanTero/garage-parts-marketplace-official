<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('car_auctions', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->string('title');
            $table->foreignId('car_id')->nullable()->constrained('cars')->nullOnDelete();
            $table->string('brand');
            $table->string('model');
            $table->unsignedSmallInteger('year');
            $table->unsignedInteger('mileage_km')->default(0);
            $table->string('body_style')->default('coupe');
            $table->string('fuel_type')->default('petrol');
            $table->string('transmission')->default('manual');
            $table->string('condition')->default('used');
            $table->string('vin')->nullable();
            $table->string('color')->nullable();
            $table->string('city')->default('Makati');
            $table->string('location')->default('Showroom Bay #1');
            $table->text('description')->nullable();
            $table->json('images')->nullable();
            
            // Bidding Parameters
            $table->decimal('starting_price', 14, 2)->default(0);
            $table->decimal('current_bid', 14, 2)->default(0);
            $table->decimal('bid_increment', 14, 2)->default(5000);
            $table->decimal('reserve_price', 14, 2)->nullable();
            $table->decimal('buy_now_price', 14, 2)->nullable();
            
            $table->timestamp('start_time')->nullable();
            $table->timestamp('end_time')->nullable();
            
            // Status: draft, upcoming, active, ended, awarded, cancelled
            $table->string('status')->default('active');
            
            // Winner details
            $table->foreignId('winner_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('winner_name')->nullable();
            $table->string('winner_email')->nullable();
            $table->string('winner_phone')->nullable();
            $table->decimal('winning_bid', 14, 2)->nullable();
            
            $table->unsignedInteger('total_bids')->default(0);
            $table->boolean('featured')->default(false);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();

            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('car_bids', function (Blueprint $table) {
            $table->id();
            $table->uuid('uuid')->unique();
            $table->foreignId('car_auction_id')->constrained('car_auctions')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('bidder_name');
            $table->string('bidder_email')->nullable();
            $table->string('bidder_phone')->nullable();
            $table->decimal('bid_amount', 14, 2);
            $table->string('status')->default('active'); // active, outbid, winning, won, cancelled
            $table->string('ip_address')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('car_bids');
        Schema::dropIfExists('car_auctions');
    }
};
