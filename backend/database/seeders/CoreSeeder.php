<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

/**
 * Fresh-install core seeds: accounts, catalog taxonomy, platform
 * settings, showroom settings, and the house dispatch depot.
 *
 * Deliberately seeds NO marketplace content: no cars, no parts, no
 * orders, no chats, no reviews, no auctions, no showroom slots, and no
 * ledger transactions. The marketplace starts empty so you can try the
 * full seller → buyer flow yourself.
 */
class CoreSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            UserSeeder::class,
            TaxonomySeeder::class,
            PlatformSettingSeeder::class,
        ]);

        // Showroom settings only (slots need demo cars).
        (new ShowroomSeeder())->seedSettings();

        // Dispatch depot + bins (no parts needed).
        (new InventorySeeder())->seedDepotOnly();
    }
}
