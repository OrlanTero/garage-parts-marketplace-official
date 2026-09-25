<?php

namespace Database\Seeders;

use App\Models\Car;
use App\Models\Order;
use App\Models\Part;
use App\Models\User;
use Illuminate\Database\Seeder;

class OrderSeeder extends Seeder
{
    public function run(): void
    {
        $buyer = User::where('email', 'buyer@garagemarket.ph')->first() ?? User::first();
        $buyer2 = User::where('email', 'mark.ranillo@garagemarket.ph')->first() ?? $buyer;
        $agent = User::where('agent_code', 'AGT-ANTON')->first();
        $agent2 = User::where('agent_code', 'AGT-MARK')->first();

        $part1 = Part::where('part_number', '1M1.8024A-RED')->first() ?? Part::first();
        $part2 = Part::where('part_number', '31019-AF030')->first() ?? Part::skip(1)->first() ?? $part1;
        $part3 = Part::where('part_number', '871389-5004S')->first() ?? Part::skip(2)->first() ?? $part1;
        $car1 = Car::where('vin', 'JT2TA22A109823411')->first() ?? Car::first();

        $orders = [
            [
                'order_number' => 'SO-2026-894101',
                'user_id' => $buyer->id,
                'buyer_name' => $buyer->name,
                'buyer_email' => $buyer->email,
                'buyer_phone' => '0917-555-1294',
                'shipping_address' => 'Unit 14B Tower 2, Ayala Avenue, Bel-Air',
                'shipping_city' => 'Makati',
                'shipping_postal_code' => '1209',
                'chassis_number' => 'JZA80-0012948',
                'vin' => '1N4AL3AP8JC123456',
                'vehicle_make_model' => '1998 Toyota Supra RZ (JZA80 2JZ-GTE)',
                'item_type' => 'part',
                'part_id' => $part1?->id,
                'seller_id' => $part1?->seller_id,
                'seller_name' => $part1?->seller?->name ?? 'Apex Performance Parts Depot',
                'agent_id' => $agent?->id,
                'agent_code' => $agent?->agent_code ?? 'AGT-ANTON',
                'agent_name' => $agent?->name ?? 'Anton Valenzuela',
                'item_name' => $part1?->title ?? 'Brembo GT 6-Piston Monobloc Big Brake Kit',
                'item_sku' => $part1?->part_number ?? '1M1.8024A-RED',
                'item_image_url' => $part1?->primary_image_url,
                'quantity' => 1,
                'unit_price' => $part1?->price ?? 42500.00,
                'shipping_fee' => 0.00,
                'total_amount' => $part1?->price ?? 42500.00,
                'commission_rate' => 5.00,
                'commission_amount' => round(($part1?->price ?? 42500.00) * 0.05, 2),
                'commission_status' => 'settled',
                'payment_method' => 'bank_transfer',
                'payment_status' => 'paid',
                'status' => 'processing',
                'tracking_number' => 'DHL-PH-99281741',
                'carrier' => 'DHL Express Philippines',
                'notes' => 'Priority crating requested for brake kit.',
                'created_at' => now()->subDays(2),
            ],
            [
                'order_number' => 'SO-2026-894002',
                'user_id' => $buyer2->id,
                'buyer_name' => $buyer2->name,
                'buyer_email' => $buyer2->email,
                'buyer_phone' => '0918-883-9920',
                'shipping_address' => '45 Mango Avenue, Lahug',
                'shipping_city' => 'Cebu City',
                'shipping_postal_code' => '6000',
                'chassis_number' => 'JN100S15A01239845',
                'vin' => 'JN100S15A01239845',
                'vehicle_make_model' => '1998 Nissan Silvia S15 Spec-R',
                'item_type' => 'part',
                'part_id' => $part2?->id,
                'seller_id' => $part2?->seller_id,
                'seller_name' => $part2?->seller?->name ?? 'Tokyo OEM Components',
                'agent_id' => $agent2?->id,
                'agent_code' => $agent2?->agent_code ?? 'AGT-MARK',
                'agent_name' => $agent2?->name ?? 'Mark Ranillo',
                'item_name' => $part2?->title ?? 'HKS Hi-Power Spec-L II Titanium Tip Catback Exhaust',
                'item_sku' => $part2?->part_number ?? '31019-AF030',
                'item_image_url' => $part2?->primary_image_url,
                'quantity' => 1,
                'unit_price' => $part2?->price ?? 31000.00,
                'shipping_fee' => 0.00,
                'total_amount' => $part2?->price ?? 31000.00,
                'commission_rate' => 5.00,
                'commission_amount' => round(($part2?->price ?? 31000.00) * 0.05, 2),
                'commission_status' => 'settled',
                'payment_method' => 'gcash',
                'payment_status' => 'paid',
                'status' => 'delivered',
                'tracking_number' => 'LBC-CEB-88319920',
                'carrier' => 'LBC Express Priority Freight',
                'notes' => 'Delivered to Cebu Performance Hub.',
                'created_at' => now()->subDays(5),
            ],
            [
                'order_number' => 'SO-2026-893903',
                'user_id' => $buyer->id,
                'buyer_name' => $buyer->name,
                'buyer_email' => $buyer->email,
                'buyer_phone' => '0917-555-1294',
                'shipping_address' => 'Unit 14B Tower 2, Ayala Avenue, Bel-Air',
                'shipping_city' => 'Makati',
                'shipping_postal_code' => '1209',
                'chassis_number' => 'BNR32-019284',
                'vin' => 'JN100BNR32U019284',
                'vehicle_make_model' => '1993 Nissan Skyline GT-R (BNR32)',
                'item_type' => 'part',
                'part_id' => $part3?->id,
                'seller_id' => $part3?->seller_id,
                'seller_name' => $part3?->seller?->name ?? 'Apex Performance Parts Depot',
                'agent_id' => $agent?->id,
                'agent_code' => $agent?->agent_code ?? 'AGT-ANTON',
                'agent_name' => $agent?->name ?? 'Anton Valenzuela',
                'item_name' => $part3?->title ?? 'Garrett Motion G25-550 Dual Ball Bearing Turbocharger',
                'item_sku' => $part3?->part_number ?? '871389-5004S',
                'item_image_url' => $part3?->primary_image_url,
                'quantity' => 1,
                'unit_price' => $part3?->price ?? 95000.00,
                'shipping_fee' => 0.00,
                'total_amount' => $part3?->price ?? 95000.00,
                'commission_rate' => 5.00,
                'commission_amount' => round(($part3?->price ?? 95000.00) * 0.05, 2),
                'commission_status' => 'pending',
                'payment_method' => 'bank_transfer',
                'payment_status' => 'paid',
                'status' => 'shipped',
                'tracking_number' => 'JRS-MKT-77182930',
                'carrier' => 'JRS Express Door-to-Door',
                'notes' => 'Insured automotive turbo shipment.',
                'created_at' => now()->subDays(1),
            ],
        ];

        foreach ($orders as $orderData) {
            Order::updateOrCreate(
                ['order_number' => $orderData['order_number']],
                $orderData
            );
        }
    }
}
