<?php

namespace Database\Seeders;

use App\Models\Car;
use App\Models\Order;
use App\Models\PlatformTransaction;
use App\Models\ShowroomSlot;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class FundsSeeder extends Seeder
{
    public function run(): void
    {
        $buyer = User::where('email', 'buyer@garagemarket.ph')->first() ?? User::first();
        $buyer2 = User::where('email', 'mark.ranillo@garagemarket.ph')->first() ?? $buyer;
        $makatiSeller = User::where('email', 'seller@garagemarket.ph')->first();
        $cebuSeller = User::where('email', 'cebu.performance@garagemarket.ph')->first() ?? $makatiSeller;
        $manilaSeller = User::where('email', 'manila.classic@garagemarket.ph')->first() ?? $makatiSeller;
        $davaoSeller = User::where('email', 'davao.overland@garagemarket.ph')->first() ?? $makatiSeller;

        // 1. Sync Parking Fee Transactions from Showroom Slots
        $slots = ShowroomSlot::with(['seller', 'car'])->get();
        foreach ($slots as $slot) {
            $existing = PlatformTransaction::where('showroom_slot_id', $slot->id)->first();
            if (!$existing) {
                PlatformTransaction::recordParkingFee($slot);
            }
        }

        // 2. Seed Realistic Car Sale Deals with 5% Commission
        $carDeals = [
            [
                'vin' => 'JT2TA22A109823411',
                'title' => '1972 Toyota Celica GT 1600 Coupe (TA22)',
                'seller_id' => $makatiSeller?->id,
                'buyer_id' => $buyer->id,
                'price' => 890000.00,
                'payment_method' => 'bank_transfer',
                'payment_ref' => 'BDO-ESCROW-2026-8910',
                'days_ago' => 6,
                'status' => 'completed',
                'notes' => 'Escrow car sale deal completed. 100-point inspection passed. 5% platform commission settled.',
            ],
            [
                'vin' => 'JN100S15A01239845',
                'title' => '1998 Nissan Silvia S15 Spec-R Aero SR20DET',
                'seller_id' => $cebuSeller?->id,
                'buyer_id' => $buyer2->id,
                'price' => 1240000.00,
                'payment_method' => 'gcash',
                'payment_ref' => 'GCASH-DEAL-2026-3391',
                'days_ago' => 4,
                'status' => 'completed',
                'notes' => 'Cebu buyer purchased S15 Spec-R. Direct payment verified.',
            ],
            [
                'vin' => '1FMCU09F1MNB23498',
                'title' => '2019 Ford Ranger Raptor 2.0 Bi-Turbo 4x4',
                'seller_id' => $davaoSeller?->id,
                'buyer_id' => $buyer->id,
                'price' => 1650000.00,
                'payment_method' => 'bank_transfer',
                'payment_ref' => 'BPI-ESCROW-2026-9012',
                'days_ago' => 3,
                'status' => 'completed',
                'notes' => 'Overland expedition build deal completed. 5% platform commission collected.',
            ],
            [
                'vin' => 'WDB2010341F098123',
                'title' => '1986 Mercedes-Benz 190E 2.3-16 Cosworth',
                'seller_id' => $manilaSeller?->id,
                'buyer_id' => $buyer2->id,
                'price' => 1050000.00,
                'payment_method' => 'bank_transfer',
                'payment_ref' => 'METRO-DEAL-2026-7844',
                'days_ago' => 2,
                'status' => 'completed',
                'notes' => 'Cosworth DTM homologation classic purchase. 5% platform commission credited.',
            ],
            [
                'vin' => 'HLS30098712398400',
                'title' => '1975 Datsun 240Z Fairlady S30 Triple Mikuni',
                'seller_id' => $makatiSeller?->id,
                'buyer_id' => $buyer->id,
                'price' => 1380000.00,
                'payment_method' => 'maya',
                'payment_ref' => 'MAYA-DEAL-2026-1129',
                'days_ago' => 1,
                'status' => 'completed',
                'notes' => 'Triple carb Fairlady S30 collector purchase. 5% platform fee settled.',
            ],
            [
                'vin' => 'JHMEG610023419082',
                'title' => '1995 Honda Civic EG6 SiR-II B16A VTEC',
                'seller_id' => $cebuSeller?->id,
                'buyer_id' => $buyer2->id,
                'price' => 620000.00,
                'payment_method' => 'gcash',
                'payment_ref' => 'GCASH-DEAL-2026-7801',
                'days_ago' => 0,
                'status' => 'pending',
                'notes' => 'Active car deal in progress. Awaiting final vehicle release authorization.',
            ],
        ];

        foreach ($carDeals as $deal) {
            $car = Car::where('vin', $deal['vin'])->first();
            $dealPrice = (float) $deal['price'];
            $commissionRate = 5.00;
            $commissionAmount = round($dealPrice * 0.05, 2);

            $existing = PlatformTransaction::where('reference_number', 'DEAL-' . $deal['vin'])->first();
            if (!$existing) {
                PlatformTransaction::create([
                    'uuid' => (string) Str::uuid(),
                    'transaction_number' => 'COMM-CAR-' . date('Y') . '-' . strtoupper(Str::random(6)),
                    'reference_number' => 'DEAL-' . $deal['vin'],
                    'stream_type' => 'car_sale_commission',
                    'direction' => 'credit',
                    'gross_amount' => $dealPrice,
                    'fee_rate' => $commissionRate,
                    'net_amount' => $commissionAmount,
                    'currency' => 'PHP',
                    'payment_method' => $deal['payment_method'],
                    'payment_reference' => $deal['payment_ref'],
                    'status' => $deal['status'],
                    'user_id' => $deal['buyer_id'],
                    'seller_id' => $deal['seller_id'] ?? $car?->seller_id,
                    'car_id' => $car?->id,
                    'title' => "5% Car Sale Commission — {$deal['title']}",
                    'description' => "Platform 5% sales commission on actual vehicle price of ₱" . number_format($dealPrice, 2) . ". {$deal['notes']}",
                    'metadata' => [
                        'car_title' => $deal['title'],
                        'deal_price' => $dealPrice,
                        'commission_rate' => $commissionRate,
                        'vin' => $deal['vin'],
                    ],
                    'settled_at' => $deal['status'] === 'completed' ? now()->subDays($deal['days_ago']) : null,
                    'created_at' => now()->subDays($deal['days_ago']),
                    'updated_at' => now()->subDays($deal['days_ago']),
                ]);
            }
        }
    }
}
