<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            UserSeeder::class,
            TaxonomySeeder::class,
            CarSeeder::class,
            PartSeeder::class,
            TaxonomySeeder::class, // re-run after listings: backfills FKs + fitment pivot
            OrderSeeder::class,
            ChatSeeder::class,
            ReviewSeeder::class,
        ]);
    }
}
