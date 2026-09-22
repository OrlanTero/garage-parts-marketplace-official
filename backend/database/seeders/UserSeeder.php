<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $defaultPassword = Hash::make('password');

        // Admin User
        User::firstOrCreate(
            ['email' => 'admin@garagemarket.ph'],
            [
                'name' => 'Garage Admin',
                'password' => $defaultPassword,
                'role' => UserRole::Admin,
                'avatar_url' => 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=300&auto=format&fit=crop',
                'email_verified_at' => now(),
            ]
        );

        // Featured Verified Showrooms & Shops (Sellers)
        $sellers = [
            [
                'email' => 'seller@garagemarket.ph',
                'name' => 'Makati Showroom & HQ',
                'avatar_url' => 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=300&auto=format&fit=crop',
            ],
            [
                'email' => 'cebu.performance@garagemarket.ph',
                'name' => 'Cebu JDM Performance Hub',
                'avatar_url' => 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=300&auto=format&fit=crop',
            ],
            [
                'email' => 'manila.classic@garagemarket.ph',
                'name' => 'Manila Classic Restorations',
                'avatar_url' => 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=300&auto=format&fit=crop',
            ],
            [
                'email' => 'davao.overland@garagemarket.ph',
                'name' => 'Davao 4x4 & Overland Depot',
                'avatar_url' => 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=300&auto=format&fit=crop',
            ],
        ];

        foreach ($sellers as $sellerData) {
            User::firstOrCreate(
                ['email' => $sellerData['email']],
                [
                    'name' => $sellerData['name'],
                    'password' => $defaultPassword,
                    'role' => UserRole::Seller,
                    'avatar_url' => $sellerData['avatar_url'],
                    'email_verified_at' => now(),
                ]
            );
        }

        // Dealers (Commercial Dealerships)
        $dealers = [
            [
                'email' => 'dealer@garagemarket.ph',
                'name' => 'Metro Premier Auto Mall',
                'avatar_url' => 'https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=300&auto=format&fit=crop',
            ],
            [
                'email' => 'autobahn.dealers@garagemarket.ph',
                'name' => 'Autobahn Prestige Dealership',
                'avatar_url' => 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=300&auto=format&fit=crop',
            ],
        ];

        foreach ($dealers as $dealerData) {
            User::firstOrCreate(
                ['email' => $dealerData['email']],
                [
                    'name' => $dealerData['name'],
                    'password' => $defaultPassword,
                    'role' => UserRole::Dealer,
                    'avatar_url' => $dealerData['avatar_url'],
                    'email_verified_at' => now(),
                ]
            );
        }

        // Parts Sellers (OEM & Aftermarket Merchants)
        $partsSellers = [
            [
                'email' => 'partsseller@garagemarket.ph',
                'name' => 'Apex Performance Parts Depot',
                'avatar_url' => 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?q=80&w=300&auto=format&fit=crop',
            ],
            [
                'email' => 'tokyo.oem@garagemarket.ph',
                'name' => 'Tokyo OEM Components',
                'avatar_url' => 'https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=300&auto=format&fit=crop',
            ],
        ];

        foreach ($partsSellers as $partsSellerData) {
            User::firstOrCreate(
                ['email' => $partsSellerData['email']],
                [
                    'name' => $partsSellerData['name'],
                    'password' => $defaultPassword,
                    'role' => UserRole::PartsSeller,
                    'avatar_url' => $partsSellerData['avatar_url'],
                    'email_verified_at' => now(),
                ]
            );
        }

        // Verified Buyers / Community Enthusiasts / Sales Agents
        $buyers = [
            [
                'email' => 'buyer@garagemarket.ph',
                'name' => 'Anton Valenzuela',
                'avatar_url' => 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=300&auto=format&fit=crop',
                'agent_code' => 'AGT-ANTON',
                'agent_tagline' => 'Certified Performance Tuner & Sales Specialist',
            ],
            [
                'email' => 'mark.ranillo@garagemarket.ph',
                'name' => 'Mark Ranillo',
                'avatar_url' => 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?q=80&w=300&auto=format&fit=crop',
                'agent_code' => 'AGT-MARK',
                'agent_tagline' => 'JDM Import & Track Build Advisor',
            ],
            [
                'email' => 'carlo.mendoza@garagemarket.ph',
                'name' => 'Carlo Mendoza',
                'avatar_url' => 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?q=80&w=300&auto=format&fit=crop',
                'agent_code' => 'AGT-CARLO',
                'agent_tagline' => 'OEM Parts Sourcing & Restoration Specialist',
            ],
        ];

        foreach ($buyers as $buyerData) {
            User::firstOrCreate(
                ['email' => $buyerData['email']],
                [
                    'name' => $buyerData['name'],
                    'password' => $defaultPassword,
                    'role' => UserRole::Buyer,
                    'avatar_url' => $buyerData['avatar_url'],
                    'agent_code' => $buyerData['agent_code'] ?? null,
                    'agent_tagline' => $buyerData['agent_tagline'] ?? null,
                    'commission_rate' => 5.00,
                    'is_agent' => true,
                    'email_verified_at' => now(),
                ]
            );
        }
    }
}
