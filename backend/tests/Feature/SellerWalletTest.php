<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Part;
use App\Models\PayoutAccount;
use App\Models\PayoutWithdrawal;
use App\Models\PlatformTransaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SellerWalletTest extends TestCase
{
    use RefreshDatabase;

    private function token(User $user): array
    {
        return ['Authorization' => 'Bearer ' . $user->createToken('t')->plainTextToken];
    }

    private function makeSeller(): User
    {
        return User::factory()->create(['role' => 'seller']);
    }

    private function makePayout(User $seller, float $net, ?Order $order = null): PlatformTransaction
    {
        return PlatformTransaction::create([
            'stream_type' => 'seller_payout',
            'direction' => 'debit',
            'gross_amount' => $net / 0.95,
            'fee_rate' => 5.00,
            'net_amount' => $net,
            'currency' => 'PHP',
            'payment_method' => 'bank_transfer',
            'payment_reference' => 'REF-' . $net,
            'reference_number' => 'SO-TEST-' . $net,
            'status' => 'completed',
            'user_id' => $seller->id,
            'seller_id' => $seller->id,
            'order_id' => $order?->id,
            'title' => 'Seller Payout — Test Item',
            'description' => 'Test payout',
            'settled_at' => now(),
        ]);
    }

    private function makeAccount(User $seller, array $overrides = []): PayoutAccount
    {
        return PayoutAccount::create(array_merge([
            'user_id' => $seller->id,
            'label' => 'Main GCash',
            'channel' => 'gcash',
            'account_name' => 'Seller Juan',
            'account_number' => '09170001111',
            'is_default' => true,
        ], $overrides));
    }

    public function test_wallet_reports_balance_and_recent_activity(): void
    {
        $seller = $this->makeSeller();
        $this->makePayout($seller, 950.00);
        $this->makePayout($seller, 1900.00);

        $res = $this->getJson('/api/v1/wallet', $this->token($seller))->assertOk();

        $balance = $res->json('data.balance');
        $this->assertEquals(2850.00, $balance['earned']);
        $this->assertEquals(2850.00, $balance['available']);
        $res->assertJsonPath('data.currency', 'PHP');
        $this->assertCount(2, $res->json('data.recent_payouts'));
    }

    public function test_payout_account_crud_and_default_promotion(): void
    {
        $seller = $this->makeSeller();
        $headers = $this->token($seller);

        $first = $this->postJson('/api/v1/payout-accounts', [
            'label' => 'Main GCash',
            'channel' => 'gcash',
            'account_name' => 'Seller Juan',
            'account_number' => '09170001111',
        ], $headers)->assertCreated()->json('data');
        $this->assertTrue($first['is_default']);

        $second = $this->postJson('/api/v1/payout-accounts', [
            'label' => 'BDO Savings',
            'channel' => 'bank',
            'account_name' => 'Seller Juan',
            'account_number' => '001230045678',
            'bank_name' => 'BDO Unibank',
        ], $headers)->assertCreated()->json('data');
        $this->assertFalse($second['is_default']);

        // Duplicate account numbers are rejected.
        $this->postJson('/api/v1/payout-accounts', [
            'channel' => 'gcash',
            'account_name' => 'Seller Juan',
            'account_number' => '09170001111',
        ], $headers)->assertStatus(422);

        // Promote the second account to default.
        $this->patchJson("/api/v1/payout-accounts/{$second['id']}", [
            'is_default' => true,
        ], $headers)->assertOk()->assertJsonPath('data.is_default', true);

        $list = $this->getJson('/api/v1/payout-accounts', $headers)->assertOk()->json('data');
        $defaults = collect($list)->where('is_default', true)->values();
        $this->assertCount(1, $defaults);
        $this->assertEquals($second['id'], $defaults->first()['id']);
    }

    public function test_withdrawal_validates_minimum_and_available_balance(): void
    {
        $seller = $this->makeSeller();
        $headers = $this->token($seller);
        $account = $this->makeAccount($seller);
        $this->makePayout($seller, 950.00);

        // Below the ₱100 minimum.
        $this->postJson('/api/v1/withdrawals', [
            'payout_account_id' => $account->id,
            'amount' => 50,
        ], $headers)->assertStatus(422);

        // Above the available balance.
        $this->postJson('/api/v1/withdrawals', [
            'payout_account_id' => $account->id,
            'amount' => 5000,
        ], $headers)->assertStatus(422)->assertJsonValidationErrors('amount');

        // A valid request locks the amount as pending.
        $this->postJson('/api/v1/withdrawals', [
            'payout_account_id' => $account->id,
            'amount' => 500,
        ], $headers)->assertCreated()->assertJsonPath('data.status', 'pending');

        $wallet = $this->getJson('/api/v1/wallet', $headers)->assertOk()->json('data.balance');
        $this->assertEquals(950.00, (float) $wallet['earned']);
        $this->assertEquals(500.00, (float) $wallet['locked']);
        $this->assertEquals(450.00, (float) $wallet['available']);
    }

    public function test_statements_unify_payouts_and_withdrawals(): void
    {
        $seller = $this->makeSeller();
        $headers = $this->token($seller);
        $account = $this->makeAccount($seller);
        $this->makePayout($seller, 950.00);

        $this->postJson('/api/v1/withdrawals', [
            'payout_account_id' => $account->id,
            'amount' => 200,
        ], $headers)->assertCreated();

        $res = $this->getJson('/api/v1/wallet/statements', $headers)->assertOk();
        $kinds = collect($res->json('data'))->pluck('kind')->all();
        $this->assertContains('payout', $kinds);
        $this->assertContains('withdrawal', $kinds);

        $filtered = $this->getJson('/api/v1/wallet/statements?type=payouts', $headers)->assertOk();
        $this->assertTrue(collect($filtered->json('data'))->every(fn ($r) => $r['kind'] === 'payout'));
    }

    public function test_admin_approves_and_pays_withdrawal_with_ledger_mirror(): void
    {
        $seller = $this->makeSeller();
        $admin = User::factory()->create(['role' => 'admin']);
        $account = $this->makeAccount($seller);
        $this->makePayout($seller, 950.00);

        $withdrawalId = $this->postJson('/api/v1/withdrawals', [
            'payout_account_id' => $account->id,
            'amount' => 500,
        ], $this->token($seller))->assertCreated()->json('data.id');

        $this->postJson("/api/v1/admin/payout-withdrawals/{$withdrawalId}/approve", [], $this->token($admin))
            ->assertOk()->assertJsonPath('data.status', 'approved');

        $this->postJson("/api/v1/admin/payout-withdrawals/{$withdrawalId}/mark-paid", [
            'reference_number' => 'BANK-REF-001',
        ], $this->token($admin))
            ->assertOk()->assertJsonPath('data.status', 'paid');

        $this->assertDatabaseHas('platform_transactions', [
            'stream_type' => 'payout_withdrawal',
            'seller_id' => $seller->id,
            'status' => 'completed',
        ]);

        // Paid money leaves the available balance; paying twice is a no-op.
        $wallet = $this->getJson('/api/v1/wallet', $this->token($seller))->assertOk()->json('data.balance');
        $this->assertEquals(450.00, $wallet['available']);
        $this->postJson("/api/v1/admin/payout-withdrawals/{$withdrawalId}/mark-paid", [], $this->token($admin))->assertOk();
        $this->assertEquals(1, PlatformTransaction::where('stream_type', 'payout_withdrawal')
            ->where('seller_id', $seller->id)->count());
    }

    public function test_admin_can_reject_withdrawal_and_funds_unlock(): void
    {
        $seller = $this->makeSeller();
        $admin = User::factory()->create(['role' => 'admin']);
        $account = $this->makeAccount($seller);
        $this->makePayout($seller, 950.00);

        $withdrawalId = $this->postJson('/api/v1/withdrawals', [
            'payout_account_id' => $account->id,
            'amount' => 500,
        ], $this->token($seller))->assertCreated()->json('data.id');

        $this->postJson("/api/v1/admin/payout-withdrawals/{$withdrawalId}/reject", [
            'admin_note' => 'Unverified account holder name.',
        ], $this->token($admin))->assertOk()->assertJsonPath('data.status', 'rejected');

        $wallet = $this->getJson('/api/v1/wallet', $this->token($seller))->assertOk()->json('data.balance');
        $this->assertEquals(950.00, $wallet['available']);
    }

    public function test_analytics_reports_kpis_trend_and_top_listings(): void
    {
        $seller = $this->makeSeller();
        $part = Part::create([
            'seller_id' => $seller->id,
            'title' => 'Bosch Front Brake Pads Set',
            'category' => 'brakes',
            'brand' => 'Bosch',
            'part_number' => 'BOSCH-BP-01',
            'price' => 2450.00,
            'status' => 'active',
            'published_at' => now(),
        ]);
        $order = Order::create([
            'order_number' => 'SO-2026-ABCDEF',
            'buyer_name' => 'Kenji Takahashi',
            'buyer_email' => 'kenji@tokyogarage.jp',
            'shipping_address' => 'Makati',
            'item_type' => 'part',
            'part_id' => $part->id,
            'seller_id' => $seller->id,
            'item_name' => $part->title,
            'quantity' => 2,
            'unit_price' => 2450.00,
            'shipping_fee' => 250.00,
            'total_amount' => 5150.00,
            'commission_rate' => 5.00,
            'commission_amount' => 245.00,
            'payment_status' => 'paid',
            'status' => 'completed',
            'verification_status' => 'accepted',
        ]);
        $this->makePayout($seller, 4905.00, $order);

        $res = $this->getJson('/api/v1/seller/analytics', $this->token($seller))->assertOk();
        $kpis = $res->json('data.kpis');

        $this->assertEquals(5150.00, $kpis['gross_sales']);
        $this->assertEquals(4905.00, $kpis['net_earnings']);
        $this->assertEquals(1, $kpis['completed_orders']);
        $this->assertEquals(5150.00, $kpis['avg_order_value']);
        $this->assertCount(6, $res->json('data.monthly_trend'));
        $this->assertEquals('Bosch Front Brake Pads Set', $res->json('data.top_listings.0.item_name'));
    }

    public function test_stranger_cannot_use_another_sellers_account(): void
    {
        $seller = $this->makeSeller();
        $stranger = $this->makeSeller();
        $account = $this->makeAccount($seller);

        $this->postJson('/api/v1/withdrawals', [
            'payout_account_id' => $account->id,
            'amount' => 200,
        ], $this->token($stranger))->assertStatus(404);

        $this->deleteJson("/api/v1/payout-accounts/{$account->id}", [], $this->token($stranger))->assertStatus(403);
    }
}
