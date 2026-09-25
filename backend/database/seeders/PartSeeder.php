<?php

namespace Database\Seeders;

use App\Enums\PartCategory;
use App\Enums\PartCondition;
use App\Enums\PartStatus;
use App\Models\Part;
use App\Models\User;
use Illuminate\Database\Seeder;

class PartSeeder extends Seeder
{
    public function run(): void
    {
        $apexParts = User::where('email', 'partsseller@garagemarket.ph')->first() ?? User::first();
        $tokyoOem = User::where('email', 'tokyo.oem@garagemarket.ph')->first() ?? $apexParts;
        $metroDealer = User::where('email', 'dealer@garagemarket.ph')->first() ?? $apexParts;
        $autobahnDealer = User::where('email', 'autobahn.dealers@garagemarket.ph')->first() ?? $apexParts;

        $partsData = [
            [
                'seller_id' => $apexParts->id,
                'title' => 'Brembo GT 6-Piston Monobloc Big Brake Kit 355x32mm',
                'category' => PartCategory::Brakes,
                'brand' => 'Brembo',
                'part_number' => '1M1.8024A-RED',
                'compatibility' => 'Universal 5x114.3 with custom brackets (Nissan Silvia S14/S15, Toyota Supra, Honda Civic FD2, Subaru STI)',
                'condition' => PartCondition::New,
                'tag' => 'Brand New OEM',
                'quantity' => 4,
                'price' => 42500.00,
                'original_price' => 48000.00,
                'free_shipping' => true,
                'description' => 'Genuine Brembo Gran Turismo 6-piston monobloc radial aluminum calipers with 2-piece 355x32mm cross-drilled floating rotors, Goodridge stainless steel braided lines, and Brembo High Performance HP2000 brake pads.',
                'city' => 'Makati',
                'location' => 'Makati Showroom & Parts Hub',
                'status' => PartStatus::Active,
                'rating' => 4.90,
                'reviews_count' => 24,
                'published_at' => now()->subDays(2),
                'media' => [
                    [
                        'url' => 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?q=80&w=1000&auto=format&fit=crop',
                        'caption' => 'Brembo GT 6-Piston Caliper & Floating Rotor Set',
                        'is_primary' => true,
                    ],
                    [
                        'url' => 'https://images.unsplash.com/photo-1613214149922-f1809c99b414?q=80&w=1000&auto=format&fit=crop',
                        'caption' => 'Caliper Monobloc Close-up with Genuine Serial',
                        'is_primary' => false,
                    ],
                    [
                        'url' => 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?q=80&w=1000&auto=format&fit=crop',
                        'caption' => 'Complete Box Kit with Mounting Hardware',
                        'is_primary' => false,
                    ],
                ],
            ],
            [
                'seller_id' => $tokyoOem->id,
                'title' => 'Recaro SR-7 KK100 Reclinable Bucket Seats (Pair)',
                'category' => PartCategory::Interior,
                'brand' => 'Recaro',
                'part_number' => 'SR7-KK100-BLK',
                'compatibility' => 'Universal bottom-mount seat rails (Bride / Recaro RO/MO rails)',
                'condition' => PartCondition::Used,
                'tag' => 'Surplus Mint 9.5/10',
                'quantity' => 2,
                'price' => 58000.00,
                'original_price' => 64000.00,
                'free_shipping' => true,
                'description' => 'Pair of Japanese surplus Recaro SR-7 KK100 reclinable sport seats in black Kamui fabric with breathable silver mesh centers. Clean bolsters with zero tear or foam sagging. Stepless reclining dials on both sides.',
                'city' => 'Cebu City',
                'location' => 'Cebu Performance Hub',
                'status' => PartStatus::Active,
                'rating' => 5.00,
                'reviews_count' => 18,
                'published_at' => now()->subDays(3),
                'media' => [
                    [
                        'url' => 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?q=80&w=1000&auto=format&fit=crop',
                        'caption' => 'Recaro SR-7 Pair Front Stance',
                        'is_primary' => true,
                    ],
                    [
                        'url' => 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=1000&auto=format&fit=crop',
                        'caption' => 'Side Bolster & Headrest Stitching',
                        'is_primary' => false,
                    ],
                ],
            ],
            [
                'seller_id' => $metroDealer->id,
                'title' => 'HKS Hi-Power Spec-L II Titanium Tip Catback Exhaust',
                'category' => PartCategory::Exhaust,
                'brand' => 'HKS',
                'part_number' => '31019-AF030',
                'compatibility' => 'Toyota GR86 / Subaru BRZ (ZN8 / ZD8 chassis)',
                'condition' => PartCondition::New,
                'tag' => 'Brand New in Box',
                'quantity' => 3,
                'price' => 31000.00,
                'original_price' => 35500.00,
                'free_shipping' => false,
                'description' => 'Ultra-lightweight stainless steel exhaust system featuring dual 94mm burnt titanium tailpipes. Weight reduced by 44% compared to stock OEM system with deep, drone-free JASMA certified tone.',
                'city' => 'Manila',
                'location' => 'Manila Speed & Surplus',
                'status' => PartStatus::Active,
                'rating' => 4.80,
                'reviews_count' => 31,
                'published_at' => now()->subDays(1),
                'media' => [
                    [
                        'url' => 'https://images.unsplash.com/photo-1613214149922-f1809c99b414?q=80&w=1000&auto=format&fit=crop',
                        'caption' => 'HKS Spec-L II Muffler Section & Burnt Titanium Tips',
                        'is_primary' => true,
                    ],
                    [
                        'url' => 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=1000&auto=format&fit=crop',
                        'caption' => 'Full Mandrel Bent Piping & Laser Etched HKS Badging',
                        'is_primary' => false,
                    ],
                ],
            ],
            [
                'seller_id' => $autobahnDealer->id,
                'title' => 'Work Meister S1 3-Piece Wheels 18x9.5 +22 5x114.3',
                'category' => PartCategory::TiresWheels,
                'brand' => 'Work Wheels',
                'part_number' => 'S1-3P-1895-5114',
                'compatibility' => '5x114.3 PCD (Nissan Silvia S13/S14/S15, Skyline GT-R, Toyota Supra, Mazda RX-7)',
                'condition' => PartCondition::Used,
                'tag' => 'Surplus 9/10 Polished',
                'quantity' => 1,
                'price' => 72000.00,
                'original_price' => 80000.00,
                'free_shipping' => true,
                'description' => 'Full set of 4 authentic Work Meister S1 3P wheels in custom polished step lip with silver centers. Deep dish barrel step, original Work valve stems, verified straight with zero bends or curb rash.',
                'city' => 'Cebu City',
                'location' => 'Cebu Hub',
                'status' => PartStatus::Active,
                'rating' => 4.90,
                'reviews_count' => 14,
                'published_at' => now()->subDays(5),
                'media' => [
                    [
                        'url' => 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?q=80&w=1000&auto=format&fit=crop',
                        'caption' => 'Work Meister S1 3P Wheel Front Face & Deep Dish',
                        'is_primary' => true,
                    ],
                    [
                        'url' => 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?q=80&w=1000&auto=format&fit=crop',
                        'caption' => 'High Polish Stepped Barrel & Work Hardware',
                        'is_primary' => false,
                    ],
                ],
            ],
            [
                'seller_id' => $apexParts->id,
                'title' => 'Nardi Classic 360mm Wood Steering Wheel with Horn Kit',
                'category' => PartCategory::Interior,
                'brand' => 'Nardi',
                'part_number' => '6061.36.1001',
                'compatibility' => 'Universal 6-bolt PCD 74mm (Works Bell, HKB, Momo Boss Kits)',
                'condition' => PartCondition::New,
                'tag' => 'Brand New Made in Italy',
                'quantity' => 8,
                'price' => 18500.00,
                'original_price' => 21000.00,
                'free_shipping' => true,
                'description' => 'Genuine Italian mahogany steering wheel with high-polish mirror aluminum spokes and signature Nardi blue-yellow center horn button. Comes sealed with certificate of authenticity and verification hologram.',
                'city' => 'Makati',
                'location' => 'Makati Showroom & Café',
                'status' => PartStatus::Active,
                'rating' => 5.00,
                'reviews_count' => 42,
                'published_at' => now()->subDays(6),
                'media' => [
                    [
                        'url' => 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=1000&auto=format&fit=crop',
                        'caption' => 'Nardi Classic 360mm Polished Spokes & Mahogany Rim',
                        'is_primary' => true,
                    ],
                    [
                        'url' => 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?q=80&w=1000&auto=format&fit=crop',
                        'caption' => 'Packaging Box & Certificate Hologram',
                        'is_primary' => false,
                    ],
                ],
            ],
            [
                'seller_id' => $tokyoOem->id,
                'title' => 'Koyo N-Flow Dual-Pass Aluminum Racing Radiator',
                'category' => PartCategory::Engine,
                'brand' => 'Koyo',
                'part_number' => 'KH081255-NF',
                'compatibility' => 'Nissan Silvia S14 / S15 with SR20DET Turbo engine',
                'condition' => PartCondition::New,
                'tag' => 'Brand New Made in Japan',
                'quantity' => 5,
                'price' => 24900.00,
                'original_price' => 27500.00,
                'free_shipping' => true,
                'description' => 'Hyper-V core 53mm dual-pass all-aluminum radiator engineered for aggressive track day and drift use. 30% higher thermal efficiency over single-pass radiators with direct bolt-on fitment for SR20 fan shrouds.',
                'city' => 'Manila',
                'location' => 'Manila HQ',
                'status' => PartStatus::Active,
                'rating' => 4.90,
                'reviews_count' => 19,
                'published_at' => now()->subDays(4),
                'media' => [
                    [
                        'url' => 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?q=80&w=1000&auto=format&fit=crop',
                        'caption' => 'Koyo Racing Dual-Pass Core & Billet Neck',
                        'is_primary' => true,
                    ],
                    [
                        'url' => 'https://images.unsplash.com/photo-1613214149922-f1809c99b414?q=80&w=1000&auto=format&fit=crop',
                        'caption' => 'TIG Welded End Tanks & Sensor Bungs',
                        'is_primary' => false,
                    ],
                ],
            ],
            [
                'seller_id' => $apexParts->id,
                'title' => 'RAYS Volk Racing TE37 Saga S-Plus 18x9.5 +38 Bronze',
                'category' => PartCategory::TiresWheels,
                'brand' => 'RAYS',
                'part_number' => 'TE37S-1895-38BR',
                'compatibility' => '5x114.3 (Honda Civic Type R FK8/FL5, Subaru WRX STI, Toyota GR Yaris / GR Corolla)',
                'condition' => PartCondition::New,
                'tag' => 'Brand New in Box',
                'quantity' => 2,
                'price' => 88000.00,
                'original_price' => 96000.00,
                'free_shipping' => true,
                'description' => 'Original 1-piece forged monoblock construction from Japan in iconic anodized Almite Bronze. High rigidity knurled bead seat to prevent tire slippage under hard acceleration and braking.',
                'city' => 'Makati',
                'location' => 'Makati Showroom',
                'status' => PartStatus::Active,
                'rating' => 5.00,
                'reviews_count' => 29,
                'published_at' => now()->subDays(7),
                'media' => [
                    [
                        'url' => 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?q=80&w=1000&auto=format&fit=crop',
                        'caption' => 'RAYS Volk Racing TE37 Saga Bronze Finish',
                        'is_primary' => true,
                    ],
                    [
                        'url' => 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?q=80&w=1000&auto=format&fit=crop',
                        'caption' => 'Forged Engraved Spoke Logo & Inspection Tag',
                        'is_primary' => false,
                    ],
                ],
            ],
            [
                'seller_id' => $tokyoOem->id,
                'title' => 'Garrett Motion G25-550 Dual Ball Bearing Turbocharger',
                'category' => PartCategory::Engine,
                'brand' => 'Garrett',
                'part_number' => '871389-5004S',
                'compatibility' => 'Universal 1.4L - 3.0L displacement (T25 inlet / V-Band outlet .72 A/R)',
                'condition' => PartCondition::New,
                'tag' => 'Brand New Genuine USA',
                'quantity' => 3,
                'price' => 95000.00,
                'original_price' => 105000.00,
                'free_shipping' => true,
                'description' => 'Garrett G-Series aerodynamics rated up to 550 horsepower. Point milled Mar-M alloy turbine wheel capable of 1050°C exhaust gas temperatures with water-cooled dual ceramic ball bearing cartridge.',
                'city' => 'Cebu City',
                'location' => 'Cebu Depot',
                'status' => PartStatus::Active,
                'rating' => 4.90,
                'reviews_count' => 16,
                'published_at' => now()->subDays(8),
                'media' => [
                    [
                        'url' => 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?q=80&w=1000&auto=format&fit=crop',
                        'caption' => 'Garrett G25-550 Compressor Billet Wheel & Housing',
                        'is_primary' => true,
                    ],
                    [
                        'url' => 'https://images.unsplash.com/photo-1613214149922-f1809c99b414?q=80&w=1000&auto=format&fit=crop',
                        'caption' => 'Stainless Steel V-Band Turbine Housing',
                        'is_primary' => false,
                    ],
                ],
            ],
            [
                'seller_id' => $metroDealer->id,
                'title' => 'Ohlins Road & Track DFV Coilovers Kit',
                'category' => PartCategory::Suspension,
                'brand' => 'Ohlins',
                'part_number' => 'BMS-MI00-RT',
                'compatibility' => 'BMW 3-Series E90 / E92 / E93 (325i, 330i, 335i)',
                'condition' => PartCondition::New,
                'tag' => 'Brand New in Box',
                'quantity' => 2,
                'price' => 118000.00,
                'original_price' => 128000.00,
                'free_shipping' => true,
                'description' => 'Patented Dual Flow Valve (DFV) technology provides track-level chassis control while maintaining everyday road compliance over rough Manila surfaces. Monotube damper with 20 clicks of simultaneous compression/rebound adjustment.',
                'city' => 'Davao',
                'location' => 'Davao Hub',
                'status' => PartStatus::Active,
                'rating' => 5.00,
                'reviews_count' => 12,
                'published_at' => now()->subDays(9),
                'media' => [
                    [
                        'url' => 'https://images.unsplash.com/photo-1613214149922-f1809c99b414?q=80&w=1000&auto=format&fit=crop',
                        'caption' => 'Ohlins Gold Anodized Struts & Springs Set',
                        'is_primary' => true,
                    ],
                    [
                        'url' => 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?q=80&w=1000&auto=format&fit=crop',
                        'caption' => 'DFV Dual Flow Valve Adjustment Knob',
                        'is_primary' => false,
                    ],
                ],
            ],
        ];

        foreach ($partsData as $data) {
            $mediaItems = $data['media'] ?? [];
            unset($data['media']);

            $part = Part::updateOrCreate(
                ['part_number' => $data['part_number']],
                $data
            );

            // Seed multiple media items
            $part->media()->delete();
            foreach ($mediaItems as $idx => $m) {
                $part->media()->create([
                    'url' => $m['url'],
                    'type' => 'image',
                    'is_primary' => $m['is_primary'] ?? ($idx === 0),
                    'order' => $idx,
                    'caption' => $m['caption'] ?? null,
                ]);
            }
        }
    }
}
