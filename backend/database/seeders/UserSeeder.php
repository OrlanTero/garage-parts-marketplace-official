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

        // Super Admin User
        User::firstOrCreate(
            ['email' => 'superadmin@garagemarket.ph'],
            [
                'name' => 'Chief Platform Officer',
                'username' => 'chief_platform',
                'password' => $defaultPassword,
                'role' => UserRole::SuperAdmin,
                'avatar_url' => 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=300&auto=format&fit=crop',
                'kyc_status' => 'approved',
                'is_kyc_verified' => true,
                'email_verified_at' => now(),
            ]
        );

        // Admin User
        User::firstOrCreate(
            ['email' => 'admin@garagemarket.ph'],
            [
                'name' => 'Garage Admin & Dispatcher',
                'username' => 'admin_dispatcher',
                'password' => $defaultPassword,
                'role' => UserRole::Admin,
                'avatar_url' => 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=300&auto=format&fit=crop',
                'kyc_status' => 'approved',
                'is_kyc_verified' => true,
                'email_verified_at' => now(),
            ]
        );

        // Vehicle Inspector User
        User::firstOrCreate(
            ['email' => 'inspector@garagemarket.ph'],
            [
                'name' => 'Master Inspector Ramirez',
                'username' => 'inspector_ramirez',
                'password' => $defaultPassword,
                'role' => UserRole::Inspector,
                'avatar_url' => 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=300&auto=format&fit=crop',
                'kyc_status' => 'approved',
                'is_kyc_verified' => true,
                'email_verified_at' => now(),
            ]
        );

        // Featured Verified Showrooms & Shops (Sellers)
        $sellers = [
            [
                'email' => 'seller@garagemarket.ph',
                'name' => 'Makati Showroom & HQ',
                'username' => 'makati_speedworks',
                'avatar_url' => 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=300&auto=format&fit=crop',
                'kyc_status' => 'approved',
                'is_kyc_verified' => true,
                'kyc_document_type' => 'business_permit',
                'kyc_document_number' => 'BP-2026-MAK-8891',
                'kyc_document_url' => 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=800',
                'kyc_selfie_url' => 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800',
                'kyc_submitted_at' => now()->subDays(10),
                'kyc_verified_at' => now()->subDays(8),
            ],
            [
                'email' => 'cebu.performance@garagemarket.ph',
                'name' => 'Cebu JDM Performance Hub',
                'username' => 'cebu_jdm_hub',
                'avatar_url' => 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=300&auto=format&fit=crop',
                'kyc_status' => 'approved',
                'is_kyc_verified' => true,
                'kyc_document_type' => 'drivers_license',
                'kyc_document_number' => 'N02-18-992140',
                'kyc_document_url' => 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=800',
                'kyc_submitted_at' => now()->subDays(7),
                'kyc_verified_at' => now()->subDays(5),
            ],
            [
                'email' => 'manila.classic@garagemarket.ph',
                'name' => 'Manila Classic Restorations',
                'username' => 'manila_restorations',
                'avatar_url' => 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=300&auto=format&fit=crop',
                'kyc_status' => 'approved',
                'is_kyc_verified' => true,
                'kyc_document_type' => 'national_id',
                'kyc_document_number' => '4412-8891-2291-0012',
                'kyc_document_url' => 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=800',
                'kyc_submitted_at' => now()->subDays(4),
                'kyc_verified_at' => now()->subDays(3),
            ],
            [
                'email' => 'davao.overland@garagemarket.ph',
                'name' => 'Davao 4x4 & Overland Depot',
                'username' => 'davao_overland',
                'avatar_url' => 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=300&auto=format&fit=crop',
                'kyc_status' => 'pending',
                'is_kyc_verified' => false,
                'kyc_document_type' => 'passport',
                'kyc_document_number' => 'P9928172B',
                'kyc_document_url' => 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=800',
                'kyc_selfie_url' => 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=800',
                'kyc_submitted_at' => now()->subHours(12),
            ],
        ];

        foreach ($sellers as $sellerData) {
            User::firstOrCreate(
                ['email' => $sellerData['email']],
                [
                    'name' => $sellerData['name'],
                    'username' => $sellerData['username'],
                    'password' => $defaultPassword,
                    'role' => UserRole::Seller,
                    'avatar_url' => $sellerData['avatar_url'],
                    'kyc_status' => $sellerData['kyc_status'],
                    'is_kyc_verified' => $sellerData['is_kyc_verified'],
                    'kyc_document_type' => $sellerData['kyc_document_type'] ?? null,
                    'kyc_document_number' => $sellerData['kyc_document_number'] ?? null,
                    'kyc_document_url' => $sellerData['kyc_document_url'] ?? null,
                    'kyc_selfie_url' => $sellerData['kyc_selfie_url'] ?? null,
                    'kyc_submitted_at' => $sellerData['kyc_submitted_at'] ?? null,
                    'kyc_verified_at' => $sellerData['kyc_verified_at'] ?? null,
                    'email_verified_at' => now(),
                ]
            );
        }

        // Dealers (Commercial Dealerships)
        $dealers = [
            [
                'email' => 'dealer@garagemarket.ph',
                'name' => 'Metro Premier Auto Mall',
                'username' => 'metro_automall',
                'avatar_url' => 'https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=300&auto=format&fit=crop',
                'kyc_status' => 'approved',
                'is_kyc_verified' => true,
                'kyc_document_type' => 'business_permit',
                'kyc_document_number' => 'SEC-CS2024-99812',
                'kyc_document_url' => 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=800',
                'kyc_submitted_at' => now()->subDays(15),
                'kyc_verified_at' => now()->subDays(12),
            ],
            [
                'email' => 'autobahn.dealers@garagemarket.ph',
                'name' => 'Autobahn Prestige Dealership',
                'username' => 'autobahn_prestige',
                'avatar_url' => 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=300&auto=format&fit=crop',
                'kyc_status' => 'approved',
                'is_kyc_verified' => true,
                'kyc_document_type' => 'business_permit',
                'kyc_document_number' => 'SEC-CS2025-44102',
                'kyc_document_url' => 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=800',
                'kyc_submitted_at' => now()->subDays(10),
                'kyc_verified_at' => now()->subDays(8),
            ],
        ];

        foreach ($dealers as $dealerData) {
            User::firstOrCreate(
                ['email' => $dealerData['email']],
                [
                    'name' => $dealerData['name'],
                    'username' => $dealerData['username'],
                    'password' => $defaultPassword,
                    'role' => UserRole::Dealer,
                    'avatar_url' => $dealerData['avatar_url'],
                    'kyc_status' => $dealerData['kyc_status'],
                    'is_kyc_verified' => $dealerData['is_kyc_verified'],
                    'kyc_document_type' => $dealerData['kyc_document_type'] ?? null,
                    'kyc_document_number' => $dealerData['kyc_document_number'] ?? null,
                    'kyc_document_url' => $dealerData['kyc_document_url'] ?? null,
                    'kyc_submitted_at' => $dealerData['kyc_submitted_at'] ?? null,
                    'kyc_verified_at' => $dealerData['kyc_verified_at'] ?? null,
                    'email_verified_at' => now(),
                ]
            );
        }

        // Parts Sellers (OEM & Aftermarket Merchants)
        $partsSellers = [
            [
                'email' => 'partsseller@garagemarket.ph',
                'name' => 'Apex Performance Parts Depot',
                'username' => 'apex_performance',
                'avatar_url' => 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?q=80&w=300&auto=format&fit=crop',
                'kyc_status' => 'approved',
                'is_kyc_verified' => true,
                'kyc_document_type' => 'business_permit',
                'kyc_document_number' => 'DTI-0982-1102',
                'kyc_document_url' => 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=800',
                'kyc_submitted_at' => now()->subDays(20),
                'kyc_verified_at' => now()->subDays(18),
            ],
            [
                'email' => 'tokyo.oem@garagemarket.ph',
                'name' => 'Tokyo OEM Components',
                'username' => 'tokyo_oem_parts',
                'avatar_url' => 'https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=300&auto=format&fit=crop',
                'kyc_status' => 'approved',
                'is_kyc_verified' => true,
                'kyc_document_type' => 'business_permit',
                'kyc_document_number' => 'JP-CORP-9921',
                'kyc_document_url' => 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=800',
                'kyc_submitted_at' => now()->subDays(15),
                'kyc_verified_at' => now()->subDays(12),
            ],
        ];

        foreach ($partsSellers as $partsSellerData) {
            User::firstOrCreate(
                ['email' => $partsSellerData['email']],
                [
                    'name' => $partsSellerData['name'],
                    'username' => $partsSellerData['username'],
                    'password' => $defaultPassword,
                    'role' => UserRole::PartsSeller,
                    'avatar_url' => $partsSellerData['avatar_url'],
                    'kyc_status' => $partsSellerData['kyc_status'],
                    'is_kyc_verified' => $partsSellerData['is_kyc_verified'],
                    'kyc_document_type' => $partsSellerData['kyc_document_type'] ?? null,
                    'kyc_document_number' => $partsSellerData['kyc_document_number'] ?? null,
                    'kyc_document_url' => $partsSellerData['kyc_document_url'] ?? null,
                    'kyc_submitted_at' => $partsSellerData['kyc_submitted_at'] ?? null,
                    'kyc_verified_at' => $partsSellerData['kyc_verified_at'] ?? null,
                    'email_verified_at' => now(),
                ]
            );
        }

        // Verified Buyers / Community Enthusiasts / Sales Agents
        $buyers = [
            [
                'email' => 'buyer@garagemarket.ph',
                'name' => 'Anton Valenzuela',
                'username' => 'anton_v',
                'avatar_url' => 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=300&auto=format&fit=crop',
                'agent_code' => 'AGT-ANTON',
                'agent_tagline' => 'Certified Performance Tuner & Sales Specialist',
            ],
            [
                'email' => 'mark.ranillo@garagemarket.ph',
                'name' => 'Mark Ranillo',
                'username' => 'mark_tuner',
                'avatar_url' => 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?q=80&w=300&auto=format&fit=crop',
                'agent_code' => 'AGT-MARK',
                'agent_tagline' => 'JDM Import & Track Build Advisor',
            ],
            [
                'email' => 'carlo.mendoza@garagemarket.ph',
                'name' => 'Carlo Mendoza',
                'username' => 'carlo_m',
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
                    'username' => $buyerData['username'],
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
