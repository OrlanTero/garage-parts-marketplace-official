<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class FreshStart extends Command
{
    protected $signature = 'app:fresh
        {--demo : Seed the full demo dataset (cars, parts, orders, chats, transactions) for testing}
        {--force : Skip the destructive-action confirmation}';

    protected $description = 'Fresh start: wipe the database, then seed core data — or the full demo dataset with --demo.';

    public function handle(): int
    {
        $demo = (bool) $this->option('demo');

        if (!$this->option('force') && !$this->confirm(
            $demo
                ? 'This will WIPE the database and reseed core + full DEMO data. Continue?'
                : 'This will WIPE the database and reseed CORE data only (empty marketplace). Continue?'
        )) {
            $this->info('Aborted — nothing was touched.');
            return self::SUCCESS;
        }

        $this->info('Wiping database…');
        $this->call('migrate:fresh', ['--force' => true]);

        if ($demo) {
            $this->info('Seeding core + demo data (listings, orders, chats, transactions)…');
            $this->call('db:seed', ['--force' => true]);
        } else {
            $this->info('Seeding core data only (accounts, taxonomy, settings, depot)…');
            $this->call('db:seed', ['--class' => 'Database\\Seeders\\CoreSeeder', '--force' => true]);
        }

        $this->newLine();
        $this->info($demo ? 'Done — marketplace loaded with demo data.' : 'Done — clean marketplace, ready for you to try the flows.');
        $this->line('Log in with <fg=yellow>admin@garagemarket.ph</> / <fg=yellow>password</> (seller: <fg=yellow>seller@garagemarket.ph</>, buyer: <fg=yellow>buyer@garagemarket.ph</>).');

        return self::SUCCESS;
    }
}
