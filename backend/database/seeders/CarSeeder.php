<?php

namespace Database\Seeders;

use App\Enums\BodyStyle;
use App\Enums\CarCondition;
use App\Enums\CarStatus;
use App\Enums\FuelType;
use App\Enums\Transmission;
use App\Models\Car;
use App\Models\User;
use Illuminate\Database\Seeder;

class CarSeeder extends Seeder
{
    public function run(): void
    {
        $makatiSeller = User::where('email', 'seller@garagemarket.ph')->first() ?? User::first();
        $cebuSeller = User::where('email', 'cebu.performance@garagemarket.ph')->first() ?? $makatiSeller;
        $manilaSeller = User::where('email', 'manila.classic@garagemarket.ph')->first() ?? $makatiSeller;
        $davaoSeller = User::where('email', 'davao.overland@garagemarket.ph')->first() ?? $makatiSeller;

        $carsData = [
            [
                'seller_id' => $makatiSeller->id,
                'title' => '1972 Toyota Celica GT 1600 Coupe (TA22)',
                'brand' => 'Toyota',
                'model' => 'Celica GT 1600',
                'year' => 1972,
                'price' => 890000.00,
                'original_price' => 950000.00,
                'mileage_km' => 42000,
                'body_style' => BodyStyle::Coupe,
                'fuel_type' => FuelType::Petrol,
                'transmission' => Transmission::Manual,
                'condition' => CarCondition::Used,
                'tag' => 'Restored Classic',
                'color' => 'Classic Heritage Blue',
                'vin' => 'JT2TA22A109823411',
                'description' => 'Meticulously nut-and-bolt restored 1972 Celica GT TA22. Period-correct 2T-G twin-cam with dual Mikuni-Solex side-draft carburetors. Rebuilt 5-speed manual, Hayashi Racing period wheels, Concours trophy winner in Manila. Clean LTO papers and 100-point garage inspection completed.',
                'city' => 'Makati',
                'location' => 'Makati Showroom Floor',
                'status' => CarStatus::Active,
                'rating' => 4.90,
                'inspection_score' => '98/100',
                'published_at' => now()->subDays(3),
                'media' => [
                    [
                        'url' => 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?q=80&w=1200&auto=format&fit=crop',
                        'caption' => 'Front 3/4 Exterior — Concours Restored',
                        'is_primary' => true,
                    ],
                    [
                        'url' => 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=1200&auto=format&fit=crop',
                        'caption' => 'Rear Profile & Exhaust',
                        'is_primary' => false,
                    ],
                    [
                        'url' => 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?q=80&w=1200&auto=format&fit=crop',
                        'caption' => '2T-G Twin-Cam Engine Bay',
                        'is_primary' => false,
                    ],
                    [
                        'url' => 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?q=80&w=1200&auto=format&fit=crop',
                        'caption' => 'Restored OEM Cockpit & Gauges',
                        'is_primary' => false,
                    ],
                ],
            ],
            [
                'seller_id' => $cebuSeller->id,
                'title' => '1998 Nissan Silvia S15 Spec-R Aero SR20DET',
                'brand' => 'Nissan',
                'model' => 'Silvia S15 Spec-R',
                'year' => 1998,
                'price' => 1240000.00,
                'original_price' => 1320000.00,
                'mileage_km' => 88000,
                'body_style' => BodyStyle::Coupe,
                'fuel_type' => FuelType::Petrol,
                'transmission' => Transmission::Manual,
                'condition' => CarCondition::Used,
                'tag' => 'JDM Icon · SR20DET',
                'color' => 'Sparkling Silver Pearl',
                'vin' => 'JN100S15A01239845',
                'description' => 'Authentic S15 Spec-R Aero factory 6-speed manual with helical LSD. Factory ball-bearing SR20DET pushing 280whp on mild boost. HKS catback, Blitz front-mount intercooler, Nismo S-Tune suspension, and genuine Work Emotion CR-Kai 18" wheels. Registered and street legal.',
                'city' => 'Cebu City',
                'location' => 'Cebu City Hub',
                'status' => CarStatus::Active,
                'rating' => 5.00,
                'inspection_score' => '99/100',
                'published_at' => now()->subDays(2),
                'media' => [
                    [
                        'url' => 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=1200&auto=format&fit=crop',
                        'caption' => 'Front 3/4 Exterior Profile',
                        'is_primary' => true,
                    ],
                    [
                        'url' => 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?q=80&w=1200&auto=format&fit=crop',
                        'caption' => 'Rear Wing & Titanium Exhaust Tip',
                        'is_primary' => false,
                    ],
                    [
                        'url' => 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?q=80&w=1200&auto=format&fit=crop',
                        'caption' => 'SR20DET Blacktop Turbo Engine',
                        'is_primary' => false,
                    ],
                    [
                        'url' => 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?q=80&w=1200&auto=format&fit=crop',
                        'caption' => 'Interior Spec-R Recaro Seats & Pillar Boost Gauge',
                        'is_primary' => false,
                    ],
                ],
            ],
            [
                'seller_id' => $davaoSeller->id,
                'title' => '2019 Ford Ranger Raptor 2.0 Bi-Turbo 4x4 Fox Shox',
                'brand' => 'Ford',
                'model' => 'Ranger Raptor 4x4',
                'year' => 2019,
                'price' => 1650000.00,
                'original_price' => 1750000.00,
                'mileage_km' => 31000,
                'body_style' => BodyStyle::Pickup,
                'fuel_type' => FuelType::Diesel,
                'transmission' => Transmission::Automatic,
                'condition' => CarCondition::Used,
                'tag' => 'Overland Ready',
                'color' => 'Conquer Grey',
                'vin' => '1FMCU09F1MNB23498',
                'description' => 'Original Philippine unit, 1st owner, full Ford service history. Factory Fox Racing internal bypass suspension, BF Goodrich KO2 all-terrain tires, Ironman 4x4 roof rack, Warn recovery winch, and ARB dual compressor setup. Ready for long-distance expedition and overland tours.',
                'city' => 'Pampanga',
                'location' => 'Pampanga Depot',
                'status' => CarStatus::Active,
                'rating' => 4.80,
                'inspection_score' => '97/100',
                'published_at' => now()->subDays(4),
                'media' => [
                    [
                        'url' => 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?q=80&w=1200&auto=format&fit=crop',
                        'caption' => 'Exterior 4x4 Stance — Conquer Grey',
                        'is_primary' => true,
                    ],
                    [
                        'url' => 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?q=80&w=1200&auto=format&fit=crop',
                        'caption' => 'Fox Racing Shock Suspension & Offroad Clearance',
                        'is_primary' => false,
                    ],
                    [
                        'url' => 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?q=80&w=1200&auto=format&fit=crop',
                        'caption' => 'Raptor Sport Cabin & Paddle Shifters',
                        'is_primary' => false,
                    ],
                ],
            ],
            [
                'seller_id' => $manilaSeller->id,
                'title' => '1986 Mercedes-Benz 190E 2.3-16 Cosworth Dogleg',
                'brand' => 'Mercedes-Benz',
                'model' => '190E 2.3-16 Cosworth',
                'year' => 1986,
                'price' => 1050000.00,
                'original_price' => 1150000.00,
                'mileage_km' => 112000,
                'body_style' => BodyStyle::Sedan,
                'fuel_type' => FuelType::Petrol,
                'transmission' => Transmission::Manual,
                'condition' => CarCondition::Used,
                'tag' => 'Cosworth DTM',
                'color' => 'Smoke Silver Metallic (702)',
                'vin' => 'WDB2010341F098123',
                'description' => 'Rare homologation legend featuring the factory Cosworth 16-valve cylinder head and Getrag dogleg 5-speed manual transmission. Original factory Recaro individual rear bucket seats, functioning lap timer, and BBS RS 3-piece wheels. Full historical records and comprehensive compression test.',
                'city' => 'Manila',
                'location' => 'Manila HQ Restorations',
                'status' => CarStatus::Active,
                'rating' => 4.90,
                'inspection_score' => '96/100',
                'published_at' => now()->subDays(5),
                'media' => [
                    [
                        'url' => 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?q=80&w=1200&auto=format&fit=crop',
                        'caption' => 'Front 3/4 Cosworth Bodykit',
                        'is_primary' => true,
                    ],
                    [
                        'url' => 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?q=80&w=1200&auto=format&fit=crop',
                        'caption' => 'Rear Spoiler & OEM Tail Section',
                        'is_primary' => false,
                    ],
                    [
                        'url' => 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?q=80&w=1200&auto=format&fit=crop',
                        'caption' => 'Cosworth 16V DOHC Engine Bay',
                        'is_primary' => false,
                    ],
                ],
            ],
            [
                'seller_id' => $makatiSeller->id,
                'title' => '1975 Datsun 240Z Fairlady S30 Triple Mikuni',
                'brand' => 'Datsun',
                'model' => '240Z Fairlady S30',
                'year' => 1975,
                'price' => 1380000.00,
                'original_price' => 1450000.00,
                'mileage_km' => 67000,
                'body_style' => BodyStyle::Coupe,
                'fuel_type' => FuelType::Petrol,
                'transmission' => Transmission::Manual,
                'condition' => CarCondition::Used,
                'tag' => 'Concours Resto',
                'color' => 'Grand Prix Orange',
                'vin' => 'HLS30098712398400',
                'description' => 'Pristine S30 chassis with balanced L28 straight-six, triple 44mm Mikuni carburetors, Fujitsubo stainless header, and Watanabe 8-spoke bronze wheels. Full underside dry-ice cleaned and treated with zero rust. Makati showroom showcase piece.',
                'city' => 'Makati',
                'location' => 'Makati Showroom Floor',
                'status' => CarStatus::Active,
                'rating' => 5.00,
                'inspection_score' => '99/100',
                'published_at' => now()->subDays(6),
                'media' => [
                    [
                        'url' => 'https://images.unsplash.com/photo-1555215695-3004980ad54e?q=80&w=1200&auto=format&fit=crop',
                        'caption' => 'Front 3/4 Shot — S30 Grand Prix Orange',
                        'is_primary' => true,
                    ],
                    [
                        'url' => 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=1200&auto=format&fit=crop',
                        'caption' => 'Fastback Profile & Triple Carb Note',
                        'is_primary' => false,
                    ],
                    [
                        'url' => 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?q=80&w=1200&auto=format&fit=crop',
                        'caption' => 'L28 Engine Bay with Triple Mikunis',
                        'is_primary' => false,
                    ],
                ],
            ],
            [
                'seller_id' => $davaoSeller->id,
                'title' => '2021 Toyota Hilux Conquest 2.8 4x4 Automatic',
                'brand' => 'Toyota',
                'model' => 'Hilux Conquest 4x4',
                'year' => 2021,
                'price' => 1420000.00,
                'original_price' => 1480000.00,
                'mileage_km' => 18500,
                'body_style' => BodyStyle::Pickup,
                'fuel_type' => FuelType::Diesel,
                'transmission' => Transmission::Automatic,
                'condition' => CarCondition::Used,
                'tag' => '1st Owner · Like New',
                'color' => 'Emotional Red II',
                'vin' => 'MROBA3CD400123985',
                'description' => 'Single owner from new, 204hp 1GD-FTV 2.8L turbo diesel engine. Equipped with Old Man Emu BP-51 suspension, Method Race 17" wheels, Maxxis RAZR AT tires, and motorized roller lid. Ceramic coated with 5-year warranty.',
                'city' => 'Batangas',
                'location' => 'Batangas Depot',
                'status' => CarStatus::Active,
                'rating' => 4.90,
                'inspection_score' => '99/100',
                'published_at' => now()->subDays(7),
                'media' => [
                    [
                        'url' => 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?q=80&w=1200&auto=format&fit=crop',
                        'caption' => 'Exterior Conquest Front View',
                        'is_primary' => true,
                    ],
                    [
                        'url' => 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?q=80&w=1200&auto=format&fit=crop',
                        'caption' => 'Side Profile & Method Offroad Wheels',
                        'is_primary' => false,
                    ],
                ],
            ],
            [
                'seller_id' => $cebuSeller->id,
                'title' => '1995 Honda Civic EG6 SiR-II B16A VTEC Manual',
                'brand' => 'Honda',
                'model' => 'Civic EG6 SiR-II',
                'year' => 1995,
                'price' => 620000.00,
                'original_price' => 680000.00,
                'mileage_km' => 95000,
                'body_style' => BodyStyle::Hatchback,
                'fuel_type' => FuelType::Petrol,
                'transmission' => Transmission::Manual,
                'condition' => CarCondition::Used,
                'tag' => 'Original B16A SiR',
                'color' => 'Captiva Blue Pearl',
                'vin' => 'JHMEG610023419082',
                'description' => 'Clean EG6 chassis with original factory B16A DOHC VTEC engine and Y21 LSD transmission. Spoon Sports N1 exhaust, Tein Flex-Z coilovers, Mugen RNR lightweight wheels, and intact Gathers rear speaker enclosures.',
                'city' => 'Cebu City',
                'location' => 'Cebu Hub',
                'status' => CarStatus::Active,
                'rating' => 4.80,
                'inspection_score' => '97/100',
                'published_at' => now()->subDays(8),
                'media' => [
                    [
                        'url' => 'https://images.unsplash.com/photo-1502877338535-766e1452684a?q=80&w=1200&auto=format&fit=crop',
                        'caption' => 'EG6 Front 3/4 Hatchback',
                        'is_primary' => true,
                    ],
                    [
                        'url' => 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?q=80&w=1200&auto=format&fit=crop',
                        'caption' => 'Rear Spoon Tailpipe & Duckbill',
                        'is_primary' => false,
                    ],
                    [
                        'url' => 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?q=80&w=1200&auto=format&fit=crop',
                        'caption' => 'B16A VTEC High-Rev Engine Bay',
                        'is_primary' => false,
                    ],
                ],
            ],
            [
                'seller_id' => $manilaSeller->id,
                'title' => '1970 Ford Mustang Fastback V8 302ci 4-Speed',
                'brand' => 'Ford',
                'model' => 'Mustang Fastback 302',
                'year' => 1970,
                'price' => 2100000.00,
                'original_price' => 2250000.00,
                'mileage_km' => 51000,
                'body_style' => BodyStyle::Coupe,
                'fuel_type' => FuelType::Petrol,
                'transmission' => Transmission::Manual,
                'condition' => CarCondition::Used,
                'tag' => 'American Muscle',
                'color' => 'Grabber Orange / Black Stripes',
                'vin' => '0F02H123490812398',
                'description' => 'Iconic 1970 Fastback featuring Ford Small Block 302 V8 with Holley 4-barrel carburetor, Edelbrock intake, Toploader 4-speed manual transmission, and 9-inch positraction rear axle. Wilwood 4-wheel disc brake upgrade for modern stopping power.',
                'city' => 'Manila',
                'location' => 'Manila HQ',
                'status' => CarStatus::Active,
                'rating' => 5.00,
                'inspection_score' => '98/100',
                'published_at' => now()->subDays(9),
                'media' => [
                    [
                        'url' => 'https://images.unsplash.com/photo-1584345604476-8ec5e12e42dd?q=80&w=1200&auto=format&fit=crop',
                        'caption' => 'Front 3/4 Muscle Car Fastback',
                        'is_primary' => true,
                    ],
                    [
                        'url' => 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?q=80&w=1200&auto=format&fit=crop',
                        'caption' => 'Rear Louvers & Dual Exhaust',
                        'is_primary' => false,
                    ],
                    [
                        'url' => 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?q=80&w=1200&auto=format&fit=crop',
                        'caption' => 'Ford 302ci V8 Engine Bay',
                        'is_primary' => false,
                    ],
                ],
            ],
            [
                'seller_id' => $cebuSeller->id,
                'title' => '2004 Mazda RX-8 Type-S 6-Speed Renesis Rotary',
                'brand' => 'Mazda',
                'model' => 'RX-8 Type-S 6-Spd',
                'year' => 2004,
                'price' => 540000.00,
                'original_price' => 590000.00,
                'mileage_km' => 74000,
                'body_style' => BodyStyle::Coupe,
                'fuel_type' => FuelType::Petrol,
                'transmission' => Transmission::Manual,
                'condition' => CarCondition::Used,
                'tag' => 'Rotary Fresh Apex',
                'color' => 'Velocity Red Mica',
                'vin' => 'JM1FE1734SE3P1098',
                'description' => 'Fresh apex seals rebuilt by accredited rotary specialist in Cebu. Starts instantly hot and cold with 8.5 bar compression on both rotors. Bilstein B14 coilovers, Enkei RPF1 18" wheels, and AutoExe catback exhaust.',
                'city' => 'Davao',
                'location' => 'Davao Hub',
                'status' => CarStatus::Active,
                'rating' => 4.70,
                'inspection_score' => '95/100',
                'published_at' => now()->subDays(10),
                'media' => [
                    [
                        'url' => 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?q=80&w=1200&auto=format&fit=crop',
                        'caption' => 'Front 3/4 View — Velocity Red',
                        'is_primary' => true,
                    ],
                    [
                        'url' => 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=1200&auto=format&fit=crop',
                        'caption' => 'Suicide Doors & Two-Tone Interior',
                        'is_primary' => false,
                    ],
                ],
            ],
        ];

        foreach ($carsData as $data) {
            $mediaItems = $data['media'] ?? [];
            unset($data['media']);

            $car = Car::updateOrCreate(
                ['vin' => $data['vin']],
                $data
            );

            // Seed multiple media items
            $car->media()->delete();
            foreach ($mediaItems as $idx => $m) {
                $car->media()->create([
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
