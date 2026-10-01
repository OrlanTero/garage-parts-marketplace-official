<?php

namespace Database\Seeders;

use App\Models\Perk;
use Illuminate\Database\Seeder;

class PerkSeeder extends Seeder
{
    public function run(): void
    {
        $perks = [
            [
                'title' => 'Member pricing on all tires & gulong',
                'category' => 'tires',
                'partner' => 'Gulong King Makati',
                'discount_label' => 'Up to 20% off',
                'description' => 'Show your member badge in-store or checkout online for instant tire discounts.',
                'terms' => 'Present member account at counter. Not combinable with other promos.',
                'sort_order' => 1,
            ],
            [
                'title' => 'Forged & cast mags member deals',
                'category' => 'wheels',
                'partner' => 'Rota Wheels PH',
                'discount_label' => 'Up to 15% off',
                'description' => 'Member pricing on Rota, Work and Rays lineups including mounting.',
                'terms' => 'Mounting included. Limited to 1 set per quarter.',
                'sort_order' => 2,
            ],
            [
                'title' => 'Mechanics labor discount',
                'category' => 'mechanics',
                'partner' => 'Garage Partner Bays',
                'discount_label' => '10% off labor',
                'description' => 'Discounted labor on installs, PMS and diagnostics at partner bays.',
                'terms' => 'Book via the marketplace. Parts excluded.',
                'sort_order' => 3,
            ],
            [
                'title' => 'Carwash & detailing perks',
                'category' => 'carwash',
                'partner' => 'Shine Lab Auto Spa',
                'discount_label' => 'Free wax upgrade',
                'description' => 'Free spray-wax upgrade with every full wash for members.',
                'terms' => 'One redemption per visit.',
                'sort_order' => 4,
            ],
            [
                'title' => 'Up to 30% off flagged genuine parts',
                'category' => 'parts',
                'partner' => 'Garage Parts Marketplace',
                'discount_label' => 'Up to 30% off',
                'description' => 'Automatic member pricing at checkout on listings flagged with a member discount.',
                'terms' => 'Applies to parts lines only. Discount shows before you pay.',
                'sort_order' => 0,
            ],
        ];

        foreach ($perks as $perk) {
            Perk::updateOrCreate(
                ['title' => $perk['title']],
                $perk + ['is_active' => true],
            );
        }
    }
}
