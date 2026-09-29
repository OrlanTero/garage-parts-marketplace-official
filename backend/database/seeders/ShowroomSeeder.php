<?php

namespace Database\Seeders;

use App\Enums\CarStatus;
use App\Models\Car;
use App\Models\ShowroomSetting;
use App\Models\ShowroomSlot;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class ShowroomSeeder extends Seeder
{
    public function run(): void
    {
        $this->seedSettings();
        $this->seedDemoSlots();
        self::refreshSellerFlags();
    }

    /**
     * Core-safe settings seeding for fresh installs (no cars needed).
     */
    public function seedSettings(): void
    {
        // 1. Ensure Showroom Settings are properly seeded
        ShowroomSetting::updateOrCreate(
            ['key' => 'parking_fee_percentage'],
            [
                'value' => '5.00',
                'description' => 'Percentage of vehicle listing price charged as showroom parking placement fee.',
            ]
        );

        ShowroomSetting::updateOrCreate(
            ['key' => 'min_parking_fee'],
            [
                'value' => '5000.00',
                'description' => 'Minimum baseline showroom parking fee in PHP.',
            ]
        );

        ShowroomSetting::updateOrCreate(
            ['key' => 'showroom_enabled'],
            [
                'value' => 'true',
                'description' => 'Global status toggle for showroom parking slot applications.',
            ]
        );

        // 2. Approved Showroom Slots live in seedDemoSlots() below.
    }

    private function seedDemoSlots(): void
    {
        $admin = User::where('email', 'admin@garagemarket.ph')->first() ?? User::where('role', 'admin')->first();
        $makatiSeller = User::where('email', 'seller@garagemarket.ph')->first();
        $cebuSeller = User::where('email', 'cebu.performance@garagemarket.ph')->first();
        $manilaSeller = User::where('email', 'manila.classic@garagemarket.ph')->first();
        $davaoSeller = User::where('email', 'davao.overland@garagemarket.ph')->first();

        // 2. Approved Showroom Slots for accredited sellers
        // A. Cebu JDM: 1998 Nissan Silvia S15 (Price ₱1,240,000 -> 5% fee ₱62,000)
        $s15 = Car::where('vin', 'JN100S15A01239845')->first();
        if ($s15 && $cebuSeller) {
            $s15->update(['is_in_showroom' => true, 'showroom_status' => 'approved']);
            $fee = round((float) $s15->price * 0.05, 2);
            ShowroomSlot::updateOrCreate(
                ['car_id' => $s15->id],
                [
                    'uuid' => (string) Str::uuid(),
                    'seller_id' => $cebuSeller->id,
                    'car_price' => $s15->price,
                    'fee_percentage' => 5.00,
                    'calculated_fee' => $fee,
                    'payment_method' => 'gcash',
                    'payment_reference' => 'GCASH-SHOW-2026-9812',
                    'payment_proof_url' => 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800',
                    'status' => 'approved',
                    'seller_notes' => 'Paid via GCash QR for Cebu JDM Showroom Floor bay #2.',
                    'admin_notes' => 'Verified GCash payment reference. S15 Spec-R approved for showroom floor.',
                    'approved_by' => $admin?->id,
                    'approved_at' => now()->subDays(2),
                    'expires_at' => now()->addDays(28),
                ]
            );
        }

        // B. Manila Classic: 1986 Mercedes-Benz 190E 2.3-16 Cosworth (Price ₱1,050,000 -> 5% fee ₱52,500)
        $cosworth = Car::where('vin', 'WDB2010341F098123')->first();
        if ($cosworth && $manilaSeller) {
            $cosworth->update(['is_in_showroom' => true, 'showroom_status' => 'approved']);
            $fee = round((float) $cosworth->price * 0.05, 2);
            ShowroomSlot::updateOrCreate(
                ['car_id' => $cosworth->id],
                [
                    'uuid' => (string) Str::uuid(),
                    'seller_id' => $manilaSeller->id,
                    'car_price' => $cosworth->price,
                    'fee_percentage' => 5.00,
                    'calculated_fee' => $fee,
                    'payment_method' => 'bank_transfer',
                    'payment_reference' => 'BDO-SHOW-2026-4412',
                    'payment_proof_url' => 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800',
                    'status' => 'approved',
                    'seller_notes' => 'BDO Online bank transfer. Kindly activate showroom slot.',
                    'admin_notes' => 'BDO transaction reference verified. 190E Cosworth approved for showroom showcase.',
                    'approved_by' => $admin?->id,
                    'approved_at' => now()->subDays(3),
                    'expires_at' => now()->addDays(27),
                ]
            );
        }

        // C. Davao Overland: 2019 Ford Ranger Raptor (Price ₱1,650,000 -> 5% fee ₱82,500)
        $raptor = Car::where('vin', '1FMCU09F1MNB23498')->first();
        if ($raptor && $davaoSeller) {
            $raptor->update(['is_in_showroom' => true, 'showroom_status' => 'approved']);
            $fee = round((float) $raptor->price * 0.05, 2);
            ShowroomSlot::updateOrCreate(
                ['car_id' => $raptor->id],
                [
                    'uuid' => (string) Str::uuid(),
                    'seller_id' => $davaoSeller->id,
                    'car_price' => $raptor->price,
                    'fee_percentage' => 5.00,
                    'calculated_fee' => $fee,
                    'payment_method' => 'maya',
                    'payment_reference' => 'MAYA-SHOW-2026-7788',
                    'payment_proof_url' => 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800',
                    'status' => 'approved',
                    'seller_notes' => 'Paid ₱82,500 5% slot placement fee via Maya Pay.',
                    'admin_notes' => 'Maya reference verified. Offroad vehicle placed on showroom floor.',
                    'approved_by' => $admin?->id,
                    'approved_at' => now()->subDays(1),
                    'expires_at' => now()->addDays(29),
                ]
            );
        }

        // 3. Pending Showroom Applications (Awaiting Admin Review)
        // A. Cebu JDM: 1995 Honda Civic EG6 SiR-II (Price ₱620,000 -> 5% fee ₱31,000)
        $eg6 = Car::where('vin', 'JHMEG610023419082')->first();
        if ($eg6 && $cebuSeller) {
            $eg6->update(['is_in_showroom' => false, 'showroom_status' => 'pending']);
            $fee = round((float) $eg6->price * 0.05, 2);
            ShowroomSlot::updateOrCreate(
                ['car_id' => $eg6->id],
                [
                    'uuid' => (string) Str::uuid(),
                    'seller_id' => $cebuSeller->id,
                    'car_price' => $eg6->price,
                    'fee_percentage' => 5.00,
                    'calculated_fee' => $fee,
                    'payment_method' => 'gcash',
                    'payment_reference' => 'GCASH-SHOW-2026-5519',
                    'payment_proof_url' => 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800',
                    'status' => 'pending',
                    'seller_notes' => 'Availing Showroom Slot for our B16A track build. Paid 5% fee (₱31,000) via GCash.',
                    'admin_notes' => null,
                    'approved_by' => null,
                    'approved_at' => null,
                    'expires_at' => null,
                ]
            );
        }

        // B. Manila Classic: 1970 Ford Mustang Fastback (Price ₱2,100,000 -> 5% fee ₱105,000)
        $mustang = Car::where('vin', '0F02H123490812398')->first();
        if ($mustang && $manilaSeller) {
            $mustang->update(['is_in_showroom' => false, 'showroom_status' => 'pending']);
            $fee = round((float) $mustang->price * 0.05, 2);
            ShowroomSlot::updateOrCreate(
                ['car_id' => $mustang->id],
                [
                    'uuid' => (string) Str::uuid(),
                    'seller_id' => $manilaSeller->id,
                    'car_price' => $mustang->price,
                    'fee_percentage' => 5.00,
                    'calculated_fee' => $fee,
                    'payment_method' => 'bank_transfer',
                    'payment_reference' => 'BPI-SHOW-2026-9041',
                    'payment_proof_url' => 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800',
                    'status' => 'pending',
                    'seller_notes' => 'Applying for prime Muscle car showroom bay. BPI Transfer reference attached.',
                    'admin_notes' => null,
                    'approved_by' => null,
                    'approved_at' => null,
                    'expires_at' => null,
                ]
            );
        }
    }

    /**
     * Keep seller activation consistent with approved slots (the approve
     * endpoint does this live; the seeder writes slots directly).
     */
    public static function refreshSellerFlags(): void
    {
        $activeSellerIds = ShowroomSlot::where('status', 'approved')->distinct()->pluck('seller_id')->all();
        if (empty($activeSellerIds)) {
            return;
        }

        User::whereIn('id', $activeSellerIds)->update(['is_showroom_active' => true]);
        User::whereIn('id', $activeSellerIds)->whereNull('showroom_activated_at')->update([
            'showroom_activated_at' => now(),
        ]);
    }
}
