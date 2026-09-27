<?php

namespace Database\Seeders;

use App\Models\PlatformSetting;
use Illuminate\Database\Seeder;

class PlatformSettingSeeder extends Seeder
{
    public function run(): void
    {
        PlatformSetting::set(
            'delivery_services',
            [
                ['code' => 'lbc', 'name' => 'LBC Express', 'tracking_url_template' => '', 'active' => true],
                ['code' => 'jnt', 'name' => 'J&T Express', 'tracking_url_template' => '', 'active' => true],
                ['code' => '2go', 'name' => '2GO Express', 'tracking_url_template' => '', 'active' => true],
                ['code' => 'jrs', 'name' => 'JRS Express', 'tracking_url_template' => '', 'active' => true],
                ['code' => 'flash', 'name' => 'Flash Express', 'tracking_url_template' => '', 'active' => true],
            ],
            'variables',
            'Courier services. tracking_url_template may contain {tracking}, e.g. https://courier.example/track/{tracking}.',
        );

        PlatformSetting::set(
            'free_freight_threshold',
            '10000',
            'variables',
            'Merchandise subtotal (PHP) at/above which parts freight is free.',
        );

        PlatformSetting::set(
            'standard_flat_fee',
            '350',
            'variables',
            'Fallback freight (PHP) when no delivery pin or recognized city exists.',
        );

        PlatformSetting::set(
            'reservation_fee_percentage',
            '5',
            'variables',
            'Reservation deposit (% of deal/listing price) sellers can request in chat.',
        );
    }
}
