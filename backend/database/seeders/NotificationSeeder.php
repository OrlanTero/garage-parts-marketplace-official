<?php

namespace Database\Seeders;

use App\Models\Notification;
use App\Models\Part;
use App\Models\RestockSubscription;
use App\Models\User;
use App\Services\NotificationService;
use Illuminate\Database\Seeder;

/**
 * Demo notification-center content: order updates, a payout notice, a
 * role broadcast, and one restock subscription. Idempotent — safe to
 * re-run (skips when rows already exist).
 */
class NotificationSeeder extends Seeder
{
    public function run(): void
    {
        $service = app(NotificationService::class);

        $buyer = User::where('email', 'buyer@garagemarket.ph')->first();
        $buyer2 = User::where('email', 'mark.ranillo@garagemarket.ph')->first();
        $makatiSeller = User::where('email', 'seller@garagemarket.ph')->first();

        if ($buyer && !Notification::where('user_id', $buyer->id)->exists()) {
            $service->send(
                $buyer->id,
                'order',
                'Order SO-2026-894002 delivered',
                'Your Brembo big brake kit was delivered. Enjoy the new stopping power!',
                ['order_number' => 'SO-2026-894002', 'status' => 'delivered'],
                '/sales-order/SO-2026-894002',
            );
            $service->send(
                $buyer->id,
                'chat',
                'New message from @makati_speedworks',
                'Your 100-point inspection report is ready for download.',
                ['listing_key' => 'part:1'],
                '/messages',
            );
        }

        if ($makatiSeller && !Notification::where('user_id', $makatiSeller->id)->where('type', 'payout')->exists()) {
            $service->send(
                $makatiSeller->id,
                'payout',
                'Weekly payout summary',
                'Settled payouts land in your seller wallet — add a GCash or bank account to cash out.',
                [],
                '/wallet',
            );
        }

        // One platform-wide seller announcement (dedupe by title).
        if ($makatiSeller && !Notification::where('type', 'broadcast')->where('title', 'Zero seller fees this weekend')->exists()) {
            $sellerIds = User::whereIn('role', ['seller', 'dealer', 'parts_seller'])->pluck('id')->all();
            $service->sendMany(
                $sellerIds,
                'broadcast',
                'Zero seller fees this weekend',
                'List any build before Sunday midnight and pay no commission on the sale.',
                ['source' => 'demo_seed'],
                '/sell',
            );
        }

        // Restock alert demo: buyer2 watches the first active part.
        if ($buyer2) {
            $part = Part::where('status', 'active')->where('quantity', '>', 0)->first();
            if ($part) {
                RestockSubscription::firstOrCreate([
                    'user_id' => $buyer2->id,
                    'listing_type' => 'part',
                    'listing_id' => $part->id,
                ]);
            }
        }
    }
}
