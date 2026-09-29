<?php

namespace Database\Seeders;

use App\Models\Brand;
use App\Models\Car;
use App\Models\CarModel;
use App\Models\Category;
use App\Models\Part;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class TaxonomySeeder extends Seeder
{
    public function run(): void
    {
        $this->seedBrands();
        $this->seedModels();
        $this->seedCategories();
        $this->backfillListings();
        $this->seedFitment();
    }

    private function seedBrands(): void
    {
        // Canonical list mirrors frontend/src/constants/brands.js + admin constants.
        // After this seeder, frontend should fetch /v1/taxonomy/brands instead.
        $byRegion = [
            'japanese' => [
                ['Acura', 'Japan'], ['Daihatsu', 'Japan'], ['Datsun', 'Japan'],
                ['Honda', 'Japan'], ['Infiniti', 'Japan'], ['Isuzu', 'Japan'],
                ['Lexus', 'Japan'], ['Mazda', 'Japan'], ['Mitsubishi', 'Japan'],
                ['Mitsuoka', 'Japan'], ['Nissan', 'Japan'], ['Subaru', 'Japan'],
                ['Suzuki', 'Japan'], ['Toyota', 'Japan'],
            ],
            'european' => [
                ['Alfa Romeo', 'Italy'], ['Alpine', 'France'], ['Aston Martin', 'United Kingdom'],
                ['Audi', 'Germany'], ['Bentley', 'United Kingdom'], ['BMW', 'Germany'],
                ['Bugatti', 'France'], ['Ferrari', 'Italy'], ['Fiat', 'Italy'],
                ['Jaguar', 'United Kingdom'], ['Koenigsegg', 'Sweden'], ['Lamborghini', 'Italy'],
                ['Land Rover', 'United Kingdom'], ['Lotus', 'United Kingdom'], ['Maserati', 'Italy'],
                ['McLaren', 'United Kingdom'], ['Mercedes-Benz', 'Germany'], ['MINI', 'United Kingdom'],
                ['Opel', 'Germany'], ['Pagani', 'Italy'], ['Peugeot', 'France'],
                ['Polestar', 'Sweden'], ['Porsche', 'Germany'], ['Renault', 'France'],
                ['Rimac', 'Croatia'], ['Rolls-Royce', 'United Kingdom'], ['Volkswagen', 'Germany'],
                ['Volvo', 'Sweden'],
            ],
            'american' => [
                ['Buick', 'United States'], ['Cadillac', 'United States'], ['Chevrolet', 'United States'],
                ['Chrysler', 'United States'], ['Dodge', 'United States'], ['Ford', 'United States'],
                ['Ford Performance', 'United States'], ['GMC', 'United States'], ['Jeep', 'United States'],
                ['Lincoln', 'United States'], ['Lucid Motors', 'United States'], ['Ram', 'United States'],
                ['Rivian', 'United States'], ['Tesla', 'United States'], ['Vanderhall Motor Works', 'United States'],
            ],
            'korean' => [
                ['Hyundai', 'South Korea'], ['Kia', 'South Korea'], ['Genesis', 'South Korea'],
            ],
        ];

        $order = 0;
        foreach ($byRegion as $region => $brands) {
            foreach ($brands as [$name, $country]) {
                Brand::updateOrCreate(
                    ['name' => $name],
                    [
                        'slug' => Str::slug($name),
                        'country' => $country,
                        'region' => $region,
                        'is_active' => true,
                        'sort_order' => $order++,
                    ]
                );
            }
        }
    }

    private function seedModels(): void
    {
        // Mirrors admin INITIAL_TAXONOMY so existing UI data becomes real rows.
        // "partsCount: 184/312..." becomes live compatibleParts_count.
        $models = [
            'Toyota' => [
                ['Supra (A90 / A91)', 'DB42 / DB02', '2019 - Present', 2019, null, ['B58 3.0L Turbo', 'B48 2.0L Turbo']],
                ['Supra (JZA80 / MK4)', 'JZA80', '1993 - 2002', 1993, 2002, ['2JZ-GTE Twin Turbo', '2JZ-GE NA']],
                ['GR Yaris / GR Corolla', 'GXPA16 / GZEA14', '2020 - Present', 2020, null, ['G16E-GTS 1.6L 3-Cyl Turbo']],
                ['GR86 / GT86', 'ZN8 / ZN6', '2012 - Present', 2012, null, ['FA24D 2.4L Boxer', 'FA20D 2.0L Boxer']],
                ['Celica GT 1600', 'TA22', '1970 - 1975', 1970, 1975, ['2T-G Twin-Cam']],
                ['Hilux Conquest 4x4', 'AN120 / AN130', '2015 - Present', 2015, null, ['1GD-FTV 2.8L Turbo Diesel']],
            ],
            'Nissan' => [
                ['Skyline GT-R (R34)', 'BNR34', '1999 - 2002', 1999, 2002, ['RB26DETT Twin Turbo AWD']],
                ['Skyline GT-R V-Spec II', 'BNR32', '1989 - 1994', 1989, 1994, ['RB26DETT Twin Turbo']],
                ['Silvia / 200SX (S15)', 'S15', '1999 - 2002', 1999, 2002, ['SR20DET Turbo', 'SR20DE NA']],
                ['Silvia S15 Spec-R', 'S15', '1999 - 2002', 1999, 2002, ['SR20DET Turbo']],
                ['GT-R (R35)', 'CBA/DBA/4BA-R35', '2008 - 2024', 2008, 2024, ['VR38DETT 3.8L V6 Twin Turbo']],
                ['Fairlady Z (RZ34 / 370Z / 350Z)', 'RZ34 / Z34 / Z33', '2003 - Present', 2003, null, ['VR30DDTT 3.0L TT', 'VQ37VHR', 'VQ35DE']],
            ],
            'Honda' => [
                ['Civic EG6 SiR-II', 'EG6', '1991 - 1995', 1991, 1995, ['B16A DOHC VTEC']],
            ],
            'Mazda' => [
                ['RX-8 Type-S 6-Spd', 'SE3P', '2003 - 2012', 2003, 2012, ['13B-MSP Renesis Rotary']],
            ],
            'Ford' => [
                ['Mustang GT / Dark Horse (S650 / S550)', 'S650 / S550', '2015 - Present', 2015, null, ['5.0L Coyote V8', '5.2L Predator Supercharged V8']],
                ['Mustang Fastback 302', '302 Fastback', '1969 - 1970', 1969, 1970, ['302ci Small Block V8']],
                ['Ranger Raptor / F-150', 'P703 / P552', '2019 - Present', 2019, null, ['3.0L EcoBoost V6 Twin Turbo', '2.0L Bi-Turbo Diesel']],
                ['Ranger Raptor 4x4', 'P703', '2019 - Present', 2019, null, ['2.0L Bi-Turbo Diesel']],
            ],
            'Ford Performance' => [
                ['Mustang GT / Dark Horse (S650 / S550)', 'S650 / S550', '2015 - Present', 2015, null, ['5.0L Coyote V8']],
            ],
            'Mercedes-Benz' => [
                ['190E 2.3-16 Cosworth', 'W201', '1984 - 1988', 1984, 1988, ['M102 2.3L 16V Cosworth']],
            ],
            'Datsun' => [
                ['240Z Fairlady S30', 'S30', '1969 - 1978', 1969, 1978, ['L28 Straight-Six']],
            ],
            'Porsche' => [
                ['911 GT3 / GT3 RS (992 / 991)', '992 / 991.2', '2013 - Present', 2013, null, ['4.0L Naturally Aspirated Flat-Six (518hp)']],
                ['718 Cayman GT4 / Boxster Spyder', '982', '2016 - Present', 2016, null, ['4.0L Boxer-6 NA', '2.5L Turbo Flat-Four']],
                ['718 Cayman GT4', '982', '2019 - Present', 2019, null, ['4.0L Flat-Six 414hp']],
            ],
        ];

        foreach ($models as $brandName => $list) {
            $brand = Brand::where('name', $brandName)->first();
            if (! $brand) {
                continue;
            }
            foreach ($list as $i => [$name, $chassis, $years, $from, $to, $engines]) {
                CarModel::updateOrCreate(
                    ['brand_id' => $brand->id, 'slug' => Str::slug($name)],
                    [
                        'name' => $name,
                        'chassis_code' => $chassis,
                        'years_label' => $years,
                        'year_from' => $from,
                        'year_to' => $to,
                        'engines' => $engines,
                        'is_active' => true,
                        'sort_order' => $i,
                    ]
                );
            }
        }
    }

    private function seedCategories(): void
    {
        // Slugs intentionally match PartCategory enum values so
        // legacy parts.category strings backfill to category_id cleanly.
        $categories = [
            ['Engine & Performance Components', 'engine', 'ENG-PERF', 'Turbochargers, forged internals, fueling, intake and ECU tuning.', 'Wrench', [
                'Turbochargers & Twin-Turbo Kits', 'Forged Pistons & Connecting Rods',
                'Camshafts & Valvetrain', 'High-Flow Fuel Injectors & Rails',
                'Intake Manifolds & Throttle Bodies', 'Engine Management & ECU Tuning Modules',
            ]],
            ['Exhaust & Downpipes', 'exhaust', 'EXH-SYS', 'Catbacks, headers, downpipes and titanium tips.', 'Flame', [
                'Titanium Catback Exhaust Systems', 'Equal Length Headers & Manifolds',
                'High-Flow Valved Downpipes', 'Mufflers & Carbon Exhaust Tips', 'Wastegates & Screamer Pipes',
            ]],
            ['Suspension, Coilovers & Chassis', 'suspension', 'SUSP-CHASSIS', 'Coilovers, sway bars, braces and bushings.', 'Sliders', [
                'Adjustable 3-Way Racing Coilovers', 'Anti-Roll Sway Bars & Endlinks',
                'Chassis Braces & Strut Tower Bars', 'Polyurethane Suspension Bushing Kits',
                'Adjustable Control Arms & Camber Plates',
            ]],
            ['Brakes & Monobloc Big Brake Kits', 'brakes', 'BRK-BBK', 'Big brake kits, rotors, pads and lines.', 'Disc', [
                '6-Piston Monobloc Forged Calipers', '2-Piece Floating Slotted Rotors',
                'Carbon-Ceramic Brake Pad Compounds', 'Stainless Steel Braided Brake Lines', 'Brake Master Cylinder Braces',
            ]],
            ['Wheels & Performance Tires', 'tires_wheels', 'TIRE-WHL', 'Forged wheels, competition tires and hardware.', 'Circle', [
                'Forged Monoblock Track Wheels (1-Piece)', 'Custom Multi-Piece Modular Wheels',
                'Semi-Slick Competition Tires', 'Lightweight Titanium Wheel Lug Nuts', 'Billet Hub-Centric Wheel Spacers',
            ]],
            ['Transmission & Drivetrain', 'transmission', 'TRANS-DRIVE', 'Clutches, LSDs, gearboxes and axles.', 'Cog', [
                'Limited Slip Differentials', 'Performance Clutch Kits', 'Short Shifters', 'Driveshafts & Axles',
            ]],
            ['Electrical & ECU', 'electrical', 'ELEC-ECU', 'Wiring, sensors, lighting and battery.', 'Zap', [
                'Engine Wiring Harnesses', 'Wideband Sensors & Gauges', 'LED Lighting Conversions', 'Racing Batteries',
            ]],
            ['Body, Exterior & Aero', 'body_exterior', 'BODY-AERO', 'Bumpers, hoods, wings and widebody.', 'Car', [
                'Carbon Hoods & Trunks', 'GT Wings & Spoilers', 'Widebody Overfenders', 'Front Splitters & Diffusers',
            ]],
            ['Interior, Seats & Steering', 'interior', 'INT-SEAT', 'Seats, steering wheels, roll cages and gauges.', 'Armchair', [
                'Reclinable Bucket Seats', 'Steering Wheels & Boss Kits', 'Bolt-In Roll Cages', 'Digital Gauge Clusters',
            ]],
            ['Fluids & Lubricants', 'fluids_lubricants', 'FLUID-LUBE', 'Oils, coolants, brake fluid and additives.', 'Droplet', [
                'Fully Synthetic Engine Oil', 'Racing Coolant & Additives', 'High-Temp Brake Fluid', 'LSD & Gear Oil',
            ]],
            ['Accessories & Merch', 'accessories', 'ACC-MERCH', 'Covers, tools, sim gear and merch.', 'Package', [
                'Car Covers & Storage', 'Garage Tools & Jacks', 'Sim Racing Gear', 'Brand Merchandise',
            ]],
            ['Wheels & Rims (Legacy)', 'wheels', 'WHL-RIM', 'Legacy alias for wheels filtering.', 'Circle', [
                'Cast Street Wheels', 'Flow-Formed Wheels',
            ]],
            ['Other / Universal', 'other', 'CAT-GEN', 'Uncategorized and universal-fit items.', 'Box', [
                'Universal Fitment', 'Miscellaneous Hardware',
            ]],
        ];

        foreach ($categories as $i => [$name, $slug, $code, $desc, $icon, $subs]) {
            $category = Category::updateOrCreate(
                ['slug' => $slug],
                [
                    'name' => $name,
                    'code' => $code,
                    'description' => $desc,
                    'icon' => $icon,
                    'is_active' => true,
                    'sort_order' => $i,
                ]
            );

            foreach ($subs as $j => $subName) {
                $category->subcategories()->updateOrCreate(
                    ['slug' => Str::slug($subName)],
                    ['name' => $subName, 'is_active' => true, 'sort_order' => $j]
                );
            }
        }
    }

    private function backfillListings(): void
    {
        // Cars: link brand string -> brand_id, model string -> car_model_id (fuzzy).
        foreach (Car::all() as $car) {
            $brand = Brand::where('name', $car->brand)->first()
                ?? Brand::where('slug', Str::slug((string) $car->brand))->first();

            $model = null;
            if ($brand) {
                // Prefer chassis-code overlap, else name token overlap.
                $model = CarModel::where('brand_id', $brand->id)->get()->first(function (CarModel $m) use ($car) {
                    $hay = strtolower(($car->model ?? '').' '.($car->title ?? ''));
                    $needles = array_filter([
                        strtolower((string) $m->chassis_code),
                        ...explode('/', strtolower((string) $m->chassis_code)),
                        strtolower((string) $m->name),
                    ]);
                    foreach ($needles as $n) {
                        $n = trim($n);
                        if (strlen($n) >= 3 && str_contains($hay, $n)) {
                            return true;
                        }
                    }

                    return false;
                });
            }

            $car->forceFill([
                'brand_id' => $brand?->id ?? $car->brand_id,
                'model_id' => $model?->id ?? $car->model_id,
            ])->saveQuietly();
        }

        // Parts: link brand/category strings -> FKs.
        foreach (Part::all() as $part) {
            $brand = null;
            if (!empty($part->brand)) {
                $brand = Brand::where('name', $part->brand)->first();
                if (! $brand) {
                    // e.g. "Work Wheels" / "Brembo" are part-makers, not car brands —
                    // only link when it matches a car brand to avoid junk FKs.
                    $brand = Brand::where('slug', Str::slug($part->brand))->first();
                }
            }

            $category = Category::where('slug', $part->category)->first()
                ?? Category::where('slug', Str::slug((string) $part->category))->first();

            $part->forceFill([
                'brand_id' => $brand?->id ?? $part->brand_id,
                'category_id' => $category?->id ?? $part->category_id,
            ])->saveQuietly();
        }
    }

    private function seedFitment(): void
    {
        // Derive initial fitment pivot from Part.compatibility free-text
        // (e.g. "Nissan Silvia S14/S15", "ZN8", "SR20DET") so model pages
        // show a real Compatible Parts count on day one.
        $models = CarModel::all();

        foreach (Part::all() as $part) {
            $hay = strtolower(($part->compatibility ?? '').' '.($part->title ?? ''));
            $matched = $models->filter(function (CarModel $m) use ($hay) {
                $tokens = array_filter(array_merge(
                    explode('/', (string) $m->chassis_code),
                    explode(' ', (string) $m->chassis_code),
                    [Str::slug((string) $m->chassis_code)],
                ));
                foreach ($tokens as $t) {
                    $t = strtolower(trim($t));
                    if (strlen($t) >= 2 && str_contains($hay, $t)) {
                        return true;
                    }
                }

                // Fall back to distinctive model keywords.
                foreach (['silvia', 'supra', 'skyline', 'civic', 'gr86', 'brz', 'rx-7', 'rx-8', 'mustang', 'raptor', 'hilux', 'celica', 'fairlady', 'cayman', 'gt-r', 'gtr', '86'] as $kw) {
                    if (str_contains(strtolower((string) $m->name), str_replace('-', '', $kw)) && str_contains($hay, $kw)) {
                        return true;
                    }
                }

                return false;
            })->pluck('id')->all();

            if (!empty($matched)) {
                $part->compatibleModels()->syncWithoutDetaching($matched);
            }
        }
    }
}
