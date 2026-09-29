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

        PlatformSetting::set(
            'freight_per_km',
            '15',
            'variables',
            'Standard parts delivery fee per kilometer (PHP/km) from the dispatch warehouse to the buyer address.',
        );

        PlatformSetting::set(
            'freight_min_fee',
            '150',
            'variables',
            'Minimum parts delivery fee (PHP) — short hops never bill below this.',
        );

        PlatformSetting::set(
            'freight_max_fee',
            '1200',
            'variables',
            'Maximum parts delivery fee cap (PHP) — long-haul freight never exceeds this.',
        );

        PlatformSetting::set(
            'free_freight_min_quantity',
            '0',
            'variables',
            'Order quantity at/above which parts freight is free (0 = disabled; subtotal threshold still applies).',
        );

        PlatformSetting::set(
            'agent_subscription_fee',
            '100',
            'variables',
            'Yearly Sales Agent subscription fee in PHP. Required with verified KYC to activate agent privileges.',
        );

        PlatformSetting::set(
            'agent_referral_reward',
            '50',
            'variables',
            'Wallet reward in PHP paid to the referrer when their referred signup also becomes an active Sales Agent (KYC + paid fee).',
        );

        PlatformSetting::set(
            'agent_subscription_duration_days',
            '365',
            'variables',
            'Sales Agent subscription validity in days (default 365 = 1 year).',
        );
    }
}
