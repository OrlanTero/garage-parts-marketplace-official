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

        // Verified Buyers / Community Enthusiasts
        $buyers = [
            [
                'email' => 'buyer@garagemarket.ph',
                'name' => 'Anton Valenzuela',
                'avatar_url' => 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=300&auto=format&fit=crop',
            ],
            [
                'email' => 'mark.ranillo@garagemarket.ph',
                'name' => 'Mark Ranillo',
                'avatar_url' => 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?q=80&w=300&auto=format&fit=crop',
            ],
            [
                'email' => 'carlo.mendoza@garagemarket.ph',
                'name' => 'Carlo Mendoza',
                'avatar_url' => 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?q=80&w=300&auto=format&fit=crop',
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
                    'email_verified_at' => now(),
                ]
            );
        }
    }
}
