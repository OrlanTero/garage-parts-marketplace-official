<?php

namespace Database\Seeders;

use App\Models\PayoutAccount;
use App\Models\PayoutWithdrawal;
use App\Models\PlatformTransaction;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Demo wallet data: payout accounts, one pending cash-out, and one paid
 * cash-out (with treasury mirror). Runs after FundsSeeder so settled
 * payouts exist to draw against. Idempotent — safe to re-run.
 */
class WalletSeeder extends Seeder
{
    public function run(): void
    {
        $makatiSeller = User::where('email', 'seller@garagemarket.ph')->first();
        if (!$makatiSeller) {
            return;
        }

        $gcash = PayoutAccount::updateOrCreate(
            ['user_id' => $makatiSeller->id, 'channel' => 'gcash', 'account_number' => '09175550194'],
            [
                'label' => 'Main GCash',
                'account_name' => $makatiSeller->name,
                'bank_name' => null,
                'is_default' => true,
            ]
        );

        PayoutAccount::updateOrCreate(
            ['user_id' => $makatiSeller->id, 'channel' => 'bank', 'account_number' => '001230045678'],
            [
                'label' => 'BDO Savings',
                'account_name' => $makatiSeller->name,
                'bank_name' => 'BDO Unibank',
                'is_default' => false,
            ]
        );

        // Keep exactly one default.
        PayoutAccount::where('user_id', $makatiSeller->id)
            ->where('id', '!=', $gcash->id)
            ->update(['is_default' => false]);

        $available = $this->availableBalance($makatiSeller->id);

        // One paid cash-out (historical) if the wallet can cover it.
        $paidExists = PayoutWithdrawal::where('user_id', $makatiSeller->id)
            ->where('status', PayoutWithdrawal::STATUS_PAID)
            ->exists();
        if (!$paidExists && $available >= 20000) {
            $paid = PayoutWithdrawal::create([
                'user_id' => $makatiSeller->id,
                'payout_account_id' => $gcash->id,
                'amount' => 8000.00,
                'fee' => 0.00,
                'net_amount' => 8000.00,
                'status' => PayoutWithdrawal::STATUS_PAID,
                'reference_number' => 'BANK-DEMO-0001',
                'reviewed_by' => User::where('email', 'admin@garagemarket.ph')->value('id'),
                'reviewed_at' => now()->subDays(2),
                'paid_at' => now()->subDays(2),
                'created_at' => now()->subDays(3),
            ]);

            PlatformTransaction::firstOrCreate(
                [
                    'stream_type' => 'payout_withdrawal',
                    'reference_number' => 'BANK-DEMO-0001',
                ],
                [
                    'direction' => 'debit',
                    'gross_amount' => 8000.00,
                    'fee_rate' => 0,
                    'net_amount' => 8000.00,
                    'currency' => 'PHP',
                    'payment_method' => 'gcash',
                    'payment_reference' => 'BANK-DEMO-0001',
                    'status' => 'completed',
                    'user_id' => $makatiSeller->id,
                    'seller_id' => $makatiSeller->id,
                    'title' => 'Seller Cash-out — Main GCash',
                    'description' => 'Seller withdrawal of ₱8,000.00 to gcash •••• 0194',
                    'metadata' => [
                        'withdrawal_uuid' => $paid->uuid,
                        'withdrawal_id' => $paid->id,
                        'payout_account_id' => $gcash->id,
                    ],
                    'settled_at' => now()->subDays(2),
                ]
            );

            $available = $this->availableBalance($makatiSeller->id);
        }

        // One pending cash-out awaiting admin review (capped to balance).
        $pendingExists = PayoutWithdrawal::where('user_id', $makatiSeller->id)
            ->whereIn('status', [PayoutWithdrawal::STATUS_PENDING, PayoutWithdrawal::STATUS_APPROVED])
            ->exists();
        if (!$pendingExists && $available >= 100) {
            $amount = min(15000.00, floor($available));
            PayoutWithdrawal::create([
                'user_id' => $makatiSeller->id,
                'payout_account_id' => $gcash->id,
                'amount' => $amount,
                'fee' => 0.00,
                'net_amount' => $amount,
                'status' => PayoutWithdrawal::STATUS_PENDING,
                'created_at' => now()->subHours(6),
            ]);
        }
    }

    /**
     * Same math as the wallet endpoint: settled payouts minus open and
     * paid withdrawals.
     */
    private function availableBalance(int $userId): float
    {
        $earned = (float) PlatformTransaction::query()
            ->where('seller_id', $userId)
            ->where('stream_type', 'seller_payout')
            ->where('status', 'completed')
            ->sum('net_amount');
        $earned += (float) PlatformTransaction::query()
            ->where('user_id', $userId)
            ->where('stream_type', 'agent_commission')
            ->where('status', 'completed')
            ->sum('net_amount');
        $locked = (float) PayoutWithdrawal::query()
            ->where('user_id', $userId)
            ->whereIn('status', [PayoutWithdrawal::STATUS_PENDING, PayoutWithdrawal::STATUS_APPROVED])
            ->sum('net_amount');
        $paidOut = (float) PayoutWithdrawal::query()
            ->where('user_id', $userId)
            ->where('status', PayoutWithdrawal::STATUS_PAID)
            ->sum('net_amount');

        return round(max(0, $earned - $locked - $paidOut), 2);
    }
}
