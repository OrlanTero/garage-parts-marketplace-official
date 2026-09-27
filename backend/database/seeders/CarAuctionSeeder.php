<?php

namespace Database\Seeders;

use App\Models\CarAuction;
use App\Models\CarBid;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class CarAuctionSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::where('role', 'admin')->orWhere('role', 'super_admin')->first() ?? User::first();
        $buyer1 = User::where('role', 'buyer')->first() ?? User::first();

        // 1. Active Featured Auction - 1999 Nissan Skyline GT-R R34 V-Spec
        $r34 = CarAuction::create([
            'uuid' => (string) Str::uuid(),
            'title' => '1999 Nissan Skyline GT-R R34 V-Spec (Bayside Blue)',
            'brand' => 'Nissan',
            'model' => 'Skyline GT-R R34',
            'year' => 1999,
            'mileage_km' => 48200,
            'body_style' => 'coupe',
            'fuel_type' => 'petrol',
            'transmission' => 'manual',
            'condition' => 'used',
            'vin' => 'BNR34-002914',
            'color' => 'Bayside Blue (TV2)',
            'city' => 'Makati',
            'location' => 'Makati Flagship Showroom · Bay #1',
            'description' => 'Iconic RB26DETT twin-turbo inline-6 powerplant mated to Getrag 6-speed manual and ATTESA E-TS Pro AWD. 100-point garage verified with zero chassis rust, original MFD active, BBS forged wheels, and complete Japanese auction sheet grade 4.5.',
            'images' => [
                'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=1200&q=80',
                'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=1200&q=80',
                'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=1200&q=80',
            ],
            'starting_price' => 5500000.00,
            'current_bid' => 6250000.00,
            'bid_increment' => 50000.00,
            'reserve_price' => 6000000.00,
            'buy_now_price' => 7500000.00,
            'start_time' => now()->subDays(2),
            'end_time' => now()->addHours(18)->addMinutes(45),
            'status' => 'active',
            'winner_name' => 'Kenji Takahashi',
            'winner_email' => 'kenji.takahashi@example.com',
            'winner_phone' => '+63 917 888 1234',
            'winning_bid' => 6250000.00,
            'total_bids' => 8,
            'featured' => true,
            'created_by' => $admin?->id,
        ]);

        CarBid::create([
            'uuid' => (string) Str::uuid(),
            'car_auction_id' => $r34->id,
            'user_id' => null,
            'bidder_name' => 'Dave Navarro',
            'bidder_email' => 'dave.n@example.ph',
            'bid_amount' => 5600000.00,
            'status' => 'outbid',
            'created_at' => now()->subDays(2)->addHours(4),
        ]);
        CarBid::create([
            'uuid' => (string) Str::uuid(),
            'car_auction_id' => $r34->id,
            'user_id' => null,
            'bidder_name' => 'Marco Santos',
            'bidder_email' => 'marco.s@example.ph',
            'bid_amount' => 5900000.00,
            'status' => 'outbid',
            'created_at' => now()->subDays(1)->addHours(2),
        ]);
        CarBid::create([
            'uuid' => (string) Str::uuid(),
            'car_auction_id' => $r34->id,
            'user_id' => $buyer1?->id,
            'bidder_name' => 'Kenji Takahashi',
            'bidder_email' => 'kenji.takahashi@example.com',
            'bid_amount' => 6250000.00,
            'status' => 'winning',
            'created_at' => now()->subHours(3),
        ]);

        // 2. Active Auction - 1997 Toyota Supra RZ Turbo JZA80 6-Speed
        $supra = CarAuction::create([
            'uuid' => (string) Str::uuid(),
            'title' => '1997 Toyota Supra RZ Twin-Turbo JZA80 (Super White)',
            'brand' => 'Toyota',
            'model' => 'Supra JZA80 RZ',
            'year' => 1997,
            'mileage_km' => 61000,
            'body_style' => 'coupe',
            'fuel_type' => 'petrol',
            'transmission' => 'manual',
            'condition' => 'used',
            'vin' => 'JZA80-004128',
            'color' => 'Super White II',
            'city' => 'Makati',
            'location' => 'Makati Central Showroom · Bay #2',
            'description' => 'Factory 2JZ-GTE VVT-i with V160 Getrag 6-speed transmission. Fresh HKS intercooler, Tein Monosport coilovers, factory big brakes, clean interior with confetti seats intact.',
            'images' => [
                'https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=1200&q=80',
                'https://images.unsplash.com/photo-1544829099-b9a0c07fad1a?auto=format&fit=crop&w=1200&q=80',
            ],
            'starting_price' => 4200000.00,
            'current_bid' => 4650000.00,
            'bid_increment' => 25000.00,
            'reserve_price' => 4500000.00,
            'buy_now_price' => 5500000.00,
            'start_time' => now()->subDays(1),
            'end_time' => now()->addDays(2)->addHours(4),
            'status' => 'active',
            'winner_name' => 'Rafael Ramos',
            'winner_email' => 'rafael.r@example.ph',
            'winner_phone' => '+63 920 901 8888',
            'winning_bid' => 4650000.00,
            'total_bids' => 5,
            'featured' => true,
            'created_by' => $admin?->id,
        ]);

        CarBid::create([
            'uuid' => (string) Str::uuid(),
            'car_auction_id' => $supra->id,
            'user_id' => null,
            'bidder_name' => 'Rafael Ramos',
            'bidder_email' => 'rafael.r@example.ph',
            'bid_amount' => 4650000.00,
            'status' => 'winning',
            'created_at' => now()->subHours(5),
        ]);

        // 3. Active Auction - 2002 Mazda RX-7 FD3S Spirit R Type-A
        $rx7 = CarAuction::create([
            'uuid' => (string) Str::uuid(),
            'title' => '2002 Mazda RX-7 Spirit R Type-A FD3S (Titanium Gray)',
            'brand' => 'Mazda',
            'model' => 'RX-7 FD3S Spirit R',
            'year' => 2002,
            'mileage_km' => 32400,
            'body_style' => 'coupe',
            'fuel_type' => 'petrol',
            'transmission' => 'manual',
            'condition' => 'used',
            'vin' => 'FD3S-604812',
            'color' => 'Titanium Gray Metallic',
            'city' => 'Makati',
            'location' => 'Makati Vault Storage',
            'description' => '1 of 1500 Spirit R units ever built. 13B-REW sequential twin-turbo rotary engine, red Kevlar Recaro carbon buckets, BBS 17-inch rims, and Bilstein tuned suspension.',
            'images' => [
                'https://images.unsplash.com/photo-1541348263662-e0c8de4259ba?auto=format&fit=crop&w=1200&q=80',
                'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80',
            ],
            'starting_price' => 3800000.00,
            'current_bid' => 4100000.00,
            'bid_increment' => 20000.00,
            'reserve_price' => 4000000.00,
            'buy_now_price' => 4900000.00,
            'start_time' => now()->subHours(10),
            'end_time' => now()->addDays(1)->addHours(12),
            'status' => 'active',
            'winner_name' => 'Enzo Laurel',
            'winner_email' => 'enzo.laurel@gmail.com',
            'winning_bid' => 4100000.00,
            'total_bids' => 4,
            'featured' => false,
            'created_by' => $admin?->id,
        ]);

        // 4. Concluded Winner Auction - 1998 Honda Civic Type R EK9
        $ek9 = CarAuction::create([
            'uuid' => (string) Str::uuid(),
            'title' => '1998 Honda Civic Type R EK9 Championship White',
            'brand' => 'Honda',
            'model' => 'Civic Type R EK9',
            'year' => 1998,
            'mileage_km' => 74500,
            'body_style' => 'hatchback',
            'fuel_type' => 'petrol',
            'transmission' => 'manual',
            'condition' => 'used',
            'vin' => 'EK9-1004821',
            'color' => 'Championship White (NH-0)',
            'city' => 'Makati',
            'location' => 'Handed over at Makati Garage Showroom',
            'description' => 'Hand-ported B16B VTEC engine screaming to 9000 RPM, Helical LSD, titanium shift knob, red Recaro SR3 interior, factory seam-welded monocoque chassis.',
            'images' => [
                'https://images.unsplash.com/photo-1590362891991-f776e747a588?auto=format&fit=crop&w=1200&q=80',
                'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=1200&q=80',
            ],
            'starting_price' => 1800000.00,
            'current_bid' => 2450000.00,
            'bid_increment' => 10000.00,
            'reserve_price' => 2200000.00,
            'buy_now_price' => 2800000.00,
            'start_time' => now()->subDays(7),
            'end_time' => now()->subDays(1),
            'status' => 'ended',
            'winner_id' => $buyer1?->id,
            'winner_name' => 'Carlos Delgado',
            'winner_email' => 'carlos.delgado@garagehub.ph',
            'winner_phone' => '+63 918 555 9922',
            'winning_bid' => 2450000.00,
            'total_bids' => 14,
            'featured' => true,
            'created_by' => $admin?->id,
        ]);

        CarBid::create([
            'uuid' => (string) Str::uuid(),
            'car_auction_id' => $ek9->id,
            'user_id' => $buyer1?->id,
            'bidder_name' => 'Carlos Delgado',
            'bidder_email' => 'carlos.delgado@garagehub.ph',
            'bid_amount' => 2450000.00,
            'status' => 'won',
            'created_at' => now()->subDays(1)->subHours(2),
        ]);

        // 5. Concluded Winner Auction - 1994 Nissan Silvia S14 Kouki Spec-R
        $s14 = CarAuction::create([
            'uuid' => (string) Str::uuid(),
            'title' => '1994 Nissan Silvia S14 Kouki Navan Aero',
            'brand' => 'Nissan',
            'model' => 'Silvia S14',
            'year' => 1994,
            'mileage_km' => 89000,
            'body_style' => 'coupe',
            'fuel_type' => 'petrol',
            'transmission' => 'manual',
            'condition' => 'used',
            'vin' => 'S14-039120',
            'color' => 'Midnight Purple',
            'city' => 'Makati',
            'location' => 'Makati Flagship Showroom',
            'description' => 'SR20DET notchtop with Garrett ball-bearing turbo, Tomei PonCams, Nismo 2-way differential, authentic Navan OEM aero kit, Work Meister S1 3-piece wheels.',
            'images' => [
                'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=1200&q=80',
            ],
            'starting_price' => 1400000.00,
            'current_bid' => 1950000.00,
            'bid_increment' => 10000.00,
            'reserve_price' => 1700000.00,
            'start_time' => now()->subDays(10),
            'end_time' => now()->subDays(3),
            'status' => 'ended',
            'winner_name' => 'Antonio Ramos',
            'winner_email' => 'anton.ramos@gmail.com',
            'winner_phone' => '+63 905 123 4567',
            'winning_bid' => 1950000.00,
            'total_bids' => 11,
            'featured' => false,
            'created_by' => $admin?->id,
        ]);

        CarBid::create([
            'uuid' => (string) Str::uuid(),
            'car_auction_id' => $s14->id,
            'user_id' => null,
            'bidder_name' => 'Antonio Ramos',
            'bidder_email' => 'anton.ramos@gmail.com',
            'bid_amount' => 1950000.00,
            'status' => 'won',
            'created_at' => now()->subDays(3)->subHours(1),
        ]);

        // 6. Upcoming Drop - 2005 Mitsubishi Lancer Evolution IX MR
        CarAuction::create([
            'uuid' => (string) Str::uuid(),
            'title' => '2005 Mitsubishi Lancer Evolution IX MR (Wicked White)',
            'brand' => 'Mitsubishi',
            'model' => 'Lancer Evolution IX MR',
            'year' => 2005,
            'mileage_km' => 41200,
            'body_style' => 'sedan',
            'fuel_type' => 'petrol',
            'transmission' => 'manual',
            'condition' => 'used',
            'vin' => 'CT9A-040219',
            'color' => 'Wicked White',
            'city' => 'Makati',
            'location' => 'Makati Vault Showroom',
            'description' => '4G63 MIVEC turbo with titanium turbine wheel, 6-speed manual, Bilstein dampers, aluminum roof, Brembo brakes, BBS forged wheels.',
            'images' => [
                'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=1200&q=80',
            ],
            'starting_price' => 3200000.00,
            'current_bid' => 3200000.00,
            'bid_increment' => 20000.00,
            'reserve_price' => 3500000.00,
            'start_time' => now()->addDays(2),
            'end_time' => now()->addDays(7),
            'status' => 'upcoming',
            'total_bids' => 0,
            'featured' => true,
            'created_by' => $admin?->id,
        ]);
    }
}
