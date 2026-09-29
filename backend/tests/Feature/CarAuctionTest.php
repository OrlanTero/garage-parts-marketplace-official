<?php

namespace Tests\Feature;

use App\Models\CarAuction;
use App\Models\CarBid;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CarAuctionTest extends TestCase
{
    use RefreshDatabase;
    public function test_can_list_active_auctions(): void
    {
        $response = $this->getJson('/api/v1/auctions?status=active');
        $response->assertStatus(200)
            ->assertJsonStructure([
                'data',
                'meta',
            ]);
    }

    public function test_can_list_winners(): void
    {
        $response = $this->getJson('/api/v1/auctions/winners');
        $response->assertStatus(200)
            ->assertJsonStructure([
                'data',
            ]);
    }

    public function test_can_place_valid_bid(): void
    {
        $auction = CarAuction::where('status', 'active')->first();
        if (!$auction) {
            $auction = CarAuction::create([
                'title' => 'Test Car Auction',
                'brand' => 'Nissan',
                'model' => 'Skyline',
                'year' => 2000,
                'starting_price' => 1000000,
                'current_bid' => 1000000,
                'bid_increment' => 50000,
                'start_time' => now()->subDay(),
                'end_time' => now()->addDay(),
                'status' => 'active',
            ]);
        }

        $minNextBid = $auction->min_next_bid;

        $response = $this->postJson("/api/v1/auctions/{$auction->uuid}/bid", [
            'bid_amount' => $minNextBid + 50000,
            'bidder_name' => 'Speedy Racer',
            'bidder_email' => 'speedy@example.com',
            'bidder_phone' => '+63 912 345 6789',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.auction.winner_name', 'Speedy Racer');

        $this->assertDatabaseHas('car_bids', [
            'car_auction_id' => $auction->id,
            'bidder_name' => 'Speedy Racer',
            'bid_amount' => $minNextBid + 50000,
            'status' => 'winning',
        ]);
    }

    public function test_cannot_place_lower_than_min_bid(): void
    {
        $auction = CarAuction::create([
            'title' => 'Test Car Auction Low',
            'brand' => 'Nissan',
            'model' => 'Skyline',
            'year' => 2000,
            'starting_price' => 1000000,
            'current_bid' => 1000000,
            'bid_increment' => 50000,
            'start_time' => now()->subDay(),
            'end_time' => now()->addDay(),
            'status' => 'active',
        ]);

        $response = $this->postJson("/api/v1/auctions/{$auction->uuid}/bid", [
            'bid_amount' => 10, // far below current bid
            'bidder_name' => 'Lowballer',
        ]);

        $response->assertStatus(422);
    }

    public function test_admin_can_create_auction(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $headers = ['Authorization' => 'Bearer ' . $admin->createToken('t')->plainTextToken];

        $response = $this->postJson('/api/v1/admin/auctions', [
            'title' => '2002 Honda NSX-R Championship White',
            'brand' => 'Honda',
            'model' => 'NSX-R',
            'year' => 2002,
            'mileage_km' => 18000,
            'starting_price' => 12000000,
            'bid_increment' => 100000,
            'reserve_price' => 15000000,
            'status' => 'active',
            'city' => 'Makati',
            'location' => 'Makati Flagship Showroom',
            'description' => 'Rare NA2 NSX-R lightweight supercar.',
        ], $headers);

        $response->assertStatus(201)
            ->assertJsonPath('data.title', '2002 Honda NSX-R Championship White');
    }
}
