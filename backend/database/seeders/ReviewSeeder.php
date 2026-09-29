<?php

namespace Database\Seeders;

use App\Models\Car;
use App\Models\Part;
use App\Models\Review;
use App\Models\User;
use Illuminate\Database\Seeder;

class ReviewSeeder extends Seeder
{
    public function run(): void
    {
        $buyers = User::whereIn('username', ['anton_v', 'mark_tuner', 'carlo_m'])->get();
        if ($buyers->isEmpty()) {
            return;
        }

        $partReviews = [
            '1M1.8024A-RED' => [
                ['mark_tuner', 5, 'Stopped my S15 on a dime', 'Genuine serials verified, pedal feel is night and day over stock. Bedding completed in two sessions.'],
                ['carlo_m', 5, 'Worth every peso', 'Zero fade on a full trackday. Packing was showroom-grade.'],
                ['anton_v', 4, 'Superb, minor bracket tweak', 'Needed a small spacer tweak for my caliper brackets, otherwise flawless.'],
            ],
            '31019-AF030' => [
                ['anton_v', 5, 'Perfect GR86 tone', 'Deep with zero drone on the highway. Titanium tips look unreal in person.'],
                ['mark_tuner', 4, 'Light and loud (good loud)', 'Dropped noticeable weight. Install took an hour on a lift.'],
            ],
            'SR7-KK100-BLK' => [
                ['carlo_m', 5, 'Mint surplus pair', 'Bolsters firm, zero tears, reclining dials smooth on both seats.'],
            ],
        ];

        foreach ($partReviews as $partNumber => $rows) {
            $part = Part::where('part_number', $partNumber)->first();
            if (!$part) {
                continue;
            }
            foreach ($rows as [$username, $rating, $title, $body]) {
                $buyer = $buyers->firstWhere('username', $username);
                if (!$buyer) {
                    continue;
                }
                Review::updateOrCreate(
                    ['buyer_id' => $buyer->id, 'item_type' => 'part', 'part_id' => $part->id, 'car_id' => null],
                    [
                        'seller_id' => $part->seller_id,
                        'rating' => $rating,
                        'title' => $title,
                        'body' => $body,
                        'is_verified_purchase' => true,
                        'is_visible' => true,
                    ]
                );
            }
            Review::refreshListingRating('part', $part->id, null);
        }

        $carReviews = [
            'JN100S15A01239845' => [
                ['anton_v', 5, 'Exactly as inspected', 'Compression numbers matched the report. Papers transferred in three days.'],
                ['mark_tuner', 5, 'Dream S15, honest seller', 'Paint and underbody as photographed. Boost holds steady.'],
            ],
            'JT2TA22A109823411' => [
                ['carlo_m', 5, 'Concours-grade Celica', 'Better in person. Cold starts instantly, carbs perfectly synced.'],
            ],
        ];

        foreach ($carReviews as $vin => $rows) {
            $car = Car::where('vin', $vin)->first();
            if (!$car) {
                continue;
            }
            foreach ($rows as [$username, $rating, $title, $body]) {
                $buyer = $buyers->firstWhere('username', $username);
                if (!$buyer) {
                    continue;
                }
                Review::updateOrCreate(
                    ['buyer_id' => $buyer->id, 'item_type' => 'car', 'part_id' => null, 'car_id' => $car->id],
                    [
                        'seller_id' => $car->seller_id,
                        'rating' => $rating,
                        'title' => $title,
                        'body' => $body,
                        'is_verified_purchase' => true,
                        'is_visible' => true,
                    ]
                );
            }
            Review::refreshListingRating('car', null, $car->id);
        }
    }
}
