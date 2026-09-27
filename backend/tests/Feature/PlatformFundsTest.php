<?php

namespace Tests\Feature;

use App\Enums\CarStatus;
use App\Enums\UserRole;
use App\Models\Car;
use App\Models\Order;
use App\Models\PlatformTransaction;
use App\Models\ShowroomSlot;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class PlatformFundsTest extends TestCase
{
    use RefreshDatabase;

    private function token(User $user): array
    {
        return ['Authorization' => 'Bearer ' . $user->createToken('test')->plainTextToken];
    }

    public function test_admin_can_view_funds_overview_with_5_percent_commission_and_parking_fees(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin->value]);
        $seller = User::factory()->create(['role' => UserRole::Seller->value, 'username' => 'speed_builder']);
        $buyer = User::factory()->create(['role' => UserRole::Buyer->value]);

        $car = Car::factory()->create([
            'seller_id' => $seller->id,
            'price' => 1000000.00,
            'status' => CarStatus::Active->value,
            'is_approved' => true,
        ]);

        // Record a 5% commission car deal (₱1,000,000 -> ₱50,000 commission)
        PlatformTransaction::recordCarSaleCommission($car, null, 1000000.00, 5.0, 'bank_transfer', 'REF-DEAL-001', $buyer);

        // Record an approved showroom parking fee (₱500,000 car -> ₱25,000 parking fee)
        $slot = ShowroomSlot::create([
            'seller_id' => $seller->id,
            'car_id' => $car->id,
            'car_price' => 500000.00,
            'fee_percentage' => 5.0,
            'calculated_fee' => 25000.00,
            'payment_method' => 'gcash',
            'payment_reference' => 'GCASH-PARK-001',
            'status' => 'approved',
            'approved_at' => now(),
        ]);
        PlatformTransaction::recordParkingFee($slot);

        $response = $this->getJson('/api/v1/admin/funds/overview', $this->token($admin));

        $response->assertStatus(200)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.wallet.total_revenue', 75000) // 50k + 25k
            ->assertJsonPath('data.wallet.car_commissions_total', 50000)
            ->assertJsonPath('data.wallet.car_deals_count', 1)
            ->assertJsonPath('data.wallet.parking_fees_total', 25000)
            ->assertJsonPath('data.wallet.parking_bays_count', 1);
    }

    public function test_admin_can_list_and_filter_transactions(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin->value]);
        $seller = User::factory()->create(['role' => UserRole::Seller->value, 'username' => 'jdm_legend']);
        $car = Car::factory()->create(['seller_id' => $seller->id, 'price' => 800000.00]);

        // Car commission
        PlatformTransaction::recordCarSaleCommission($car, null, 800000.00, 5.0, 'gcash', 'GCASH-CAR-800K');

        // Parking fee
        $slot = ShowroomSlot::create([
            'seller_id' => $seller->id,
            'car_id' => $car->id,
            'car_price' => 800000.00,
            'fee_percentage' => 5.0,
            'calculated_fee' => 40000.00,
            'status' => 'approved',
        ]);
        PlatformTransaction::recordParkingFee($slot);

        // Filter by car commissions
        $carCommRes = $this->getJson('/api/v1/admin/funds/transactions?stream_type=car_sale_commission', $this->token($admin));
        $carCommRes->assertStatus(200)
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.stream_type', 'car_sale_commission')
            ->assertJsonPath('data.0.net_amount', '40000.00');

        // Filter by parking fees
        $parkingRes = $this->getJson('/api/v1/admin/funds/transactions?stream_type=parking_fee', $this->token($admin));
        $parkingRes->assertStatus(200)
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.stream_type', 'parking_fee');
    }

    public function test_admin_can_view_single_transaction_receipt(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin->value]);
        $seller = User::factory()->create(['role' => UserRole::Seller->value, 'username' => 'cebu_tuner']);
        $car = Car::factory()->create(['seller_id' => $seller->id, 'title' => '1998 Nissan Silvia S15 Spec-R', 'price' => 1200000.00]);

        $txn = PlatformTransaction::recordCarSaleCommission($car, null, 1200000.00, 5.0, 'bank_transfer', 'BDO-REF-1200K');

        $response = $this->getJson("/api/v1/admin/funds/transactions/{$txn->id}", $this->token($admin));

        $response->assertStatus(200)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.gross_amount', '1200000.00')
            ->assertJsonPath('data.fee_rate', '5.00')
            ->assertJsonPath('data.net_amount', '60000.00')
            ->assertJsonPath('data.seller.username', 'cebu_tuner');
    }

    public function test_admin_can_generate_financial_report_json_and_csv(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin->value]);
        $seller = User::factory()->create(['role' => UserRole::Seller->value]);
        $car = Car::factory()->create(['seller_id' => $seller->id, 'price' => 500000.00]);

        PlatformTransaction::recordCarSaleCommission($car, null, 500000.00, 5.0, 'gcash', 'GCASH-REPORT-TEST');

        // JSON Report
        $jsonRes = $this->getJson('/api/v1/admin/funds/report?period=this_month', $this->token($admin));
        $jsonRes->assertStatus(200)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.summary.total_transactions', 1)
            ->assertJsonPath('data.summary.car_commissions_total', 25000);

        // CSV Export
        $csvRes = $this->get('/api/v1/admin/funds/report?format=csv', $this->token($admin));
        $csvRes->assertStatus(200)
            ->assertHeader('Content-Type', 'text/csv; charset=UTF-8');
    }
}
