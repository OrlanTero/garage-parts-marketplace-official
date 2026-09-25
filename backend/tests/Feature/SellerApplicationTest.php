<?php

namespace Tests\Feature;

use App\Enums\CarStatus;
use App\Enums\UserRole;
use App\Models\Car;
use App\Models\Part;
use App\Models\SellerApplication;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SellerApplicationTest extends TestCase
{
    use RefreshDatabase;

    protected function token(User $user): array
    {
        return ['Authorization' => 'Bearer '.$user->createToken('test')->plainTextToken];
    }

    private function applicationPayload(): array
    {
        return [
            'requested_role' => 'seller',
            'shop_name' => 'Calamaya Garage',
            'contact_phone' => '09175551234',
            'city' => 'Makati City',
            'address' => '123 Osmena Highway',
            'reason' => 'I restore classic builds and want to sell them here.',
        ];
    }

    private function carPayload(): array
    {
        return [
            'title' => '2019 Toyota Vios 1.3 E CVT',
            'brand' => 'Toyota',
            'model' => 'Vios',
            'year' => 2019,
            'price' => 495000,
            'mileage_km' => 42000,
            'transmission' => 'automatic',
            'condition' => 'used',
            'city' => 'Cebu City',
        ];
    }

    private function partPayload(): array
    {
        return [
            'title' => 'Bosch Front Brake Pads Set',
            'category' => 'brakes',
            'brand' => 'Bosch',
            'condition' => 'new',
            'quantity' => 4,
            'price' => 3850,
            'city' => 'Cebu City',
        ];
    }

    public function test_buyer_can_submit_seller_application(): void
    {
        $buyer = User::factory()->create(['role' => UserRole::Buyer->value]);

        $res = $this->postJson('/api/v1/seller-applications', $this->applicationPayload(), $this->token($buyer))
            ->assertCreated()
            ->assertJsonPath('application.status', 'pending')
            ->assertJsonPath('application.requested_role', 'seller')
            ->assertJsonPath('application.shop_name', 'Calamaya Garage');

        $this->assertDatabaseHas('seller_applications', [
            'id' => $res->json('application.id'),
            'user_id' => $buyer->id,
            'status' => 'pending',
        ]);

        // Role is NOT upgraded until admin approval.
        $this->assertEquals(UserRole::Buyer->value, $buyer->fresh()->role->value);
    }

    public function test_buyer_cannot_submit_duplicate_pending_application(): void
    {
        $buyer = User::factory()->create(['role' => UserRole::Buyer->value]);

        $this->postJson('/api/v1/seller-applications', $this->applicationPayload(), $this->token($buyer))->assertCreated();
        $this->postJson('/api/v1/seller-applications', $this->applicationPayload(), $this->token($buyer))->assertUnprocessable();

        $this->assertEquals(1, SellerApplication::where('user_id', $buyer->id)->count());
    }

    public function test_application_rejects_invalid_role_and_missing_fields(): void
    {
        $buyer = User::factory()->create(['role' => UserRole::Buyer->value]);

        $this->postJson('/api/v1/seller-applications',
            array_merge($this->applicationPayload(), ['requested_role' => 'admin']),
            $this->token($buyer))->assertUnprocessable();

        $this->postJson('/api/v1/seller-applications',
            array_merge($this->applicationPayload(), ['shop_name' => null, 'contact_phone' => null, 'city' => null]),
            $this->token($buyer))->assertUnprocessable();
    }

    public function test_existing_sellers_and_staff_cannot_apply(): void
    {
        foreach ([UserRole::Seller->value, UserRole::Dealer->value, UserRole::PartsSeller->value, UserRole::Admin->value] as $role) {
            $user = User::factory()->create(['role' => $role]);

            $this->postJson('/api/v1/seller-applications', $this->applicationPayload(), $this->token($user))
                ->assertUnprocessable();
        }
    }

    public function test_guest_cannot_apply(): void
    {
        $this->postJson('/api/v1/seller-applications', $this->applicationPayload())->assertUnauthorized();
    }

    public function test_buyer_can_view_own_applications_and_eligibility(): void
    {
        $buyer = User::factory()->create(['role' => UserRole::Buyer->value]);

        $empty = $this->getJson('/api/v1/seller-applications', $this->token($buyer))->assertOk();
        $empty->assertJsonPath('eligibility.can_apply', true);
        $empty->assertJsonPath('eligibility.kyc_verified', false);
        $empty->assertJsonPath('eligibility.pending_application', null);

        $this->postJson('/api/v1/seller-applications', $this->applicationPayload(), $this->token($buyer))->assertCreated();

        $filled = $this->getJson('/api/v1/seller-applications', $this->token($buyer))->assertOk();
        $filled->assertJsonPath('eligibility.can_apply', true);
        $filled->assertJsonPath('eligibility.pending_application.status', 'pending');
        $filled->assertJsonCount(1, 'data');
    }

    public function test_buyer_can_withdraw_own_pending_application(): void
    {
        $buyer = User::factory()->create(['role' => UserRole::Buyer->value]);

        $id = $this->postJson('/api/v1/seller-applications', $this->applicationPayload(), $this->token($buyer))
            ->assertCreated()->json('application.id');

        $this->postJson("/api/v1/seller-applications/{$id}/withdraw", [], $this->token($buyer))
            ->assertOk()
            ->assertJsonPath('application.status', 'withdrawn');

        // After withdrawal a fresh application is allowed.
        $this->postJson('/api/v1/seller-applications', $this->applicationPayload(), $this->token($buyer))->assertCreated();
    }

    public function test_buyer_cannot_withdraw_others_application_or_finalized_one(): void
    {
        $alice = User::factory()->create(['role' => UserRole::Buyer->value]);
        $bob = User::factory()->create(['role' => UserRole::Buyer->value]);

        $id = $this->postJson('/api/v1/seller-applications', $this->applicationPayload(), $this->token($alice))
            ->assertCreated()->json('application.id');

        $this->postJson("/api/v1/seller-applications/{$id}/withdraw", [], $this->token($bob))->assertForbidden();

        $approved = SellerApplication::factory()->approved()->create(['user_id' => $alice->id]);
        $this->postJson("/api/v1/seller-applications/{$approved->id}/withdraw", [], $this->token($alice))
            ->assertUnprocessable();
    }

    public function test_admin_can_list_applications_with_stats(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin->value]);
        $buyer = User::factory()->create(['role' => UserRole::Buyer->value]);
        SellerApplication::factory()->create(['user_id' => $buyer->id, 'shop_name' => 'Calamaya Garage']);

        $res = $this->getJson('/api/v1/admin/seller-applications?status=pending', $this->token($admin))->assertOk();
        $res->assertJsonPath('stats.pending_applications', 1);
        $res->assertJsonPath('data.0.shop_name', 'Calamaya Garage');
        $res->assertJsonPath('data.0.applicant.email', $buyer->email);
    }

    public function test_non_staff_cannot_access_admin_application_queue(): void
    {
        $buyer = User::factory()->create(['role' => UserRole::Buyer->value]);

        $this->getJson('/api/v1/admin/seller-applications', $this->token($buyer))->assertForbidden();
    }

    public function test_admin_approval_requires_verified_kyc(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin->value]);
        $buyer = User::factory()->create(['role' => UserRole::Buyer->value]);

        $id = $this->postJson('/api/v1/seller-applications', $this->applicationPayload(), $this->token($buyer))
            ->assertCreated()->json('application.id');

        $this->postJson("/api/v1/admin/seller-applications/{$id}/approve", [], $this->token($admin))
            ->assertUnprocessable()
            ->assertJsonPath('code', 'kyc_verification_required');

        // Still pending, role untouched.
        $this->assertEquals('pending', SellerApplication::find($id)->status->value);
        $this->assertEquals(UserRole::Buyer->value, $buyer->fresh()->role->value);
    }

    public function test_admin_approval_upgrades_role_when_kyc_verified(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin->value]);
        $buyer = User::factory()->kycVerified()->create(['role' => UserRole::Buyer->value]);

        $id = $this->postJson('/api/v1/seller-applications',
            array_merge($this->applicationPayload(), ['requested_role' => 'dealer']),
            $this->token($buyer))->assertCreated()->json('application.id');

        $this->postJson("/api/v1/admin/seller-applications/{$id}/approve",
            ['review_notes' => 'Docs check out.'],
            $this->token($admin))
            ->assertOk()
            ->assertJsonPath('application.status', 'approved');

        $fresh = $buyer->fresh();
        $this->assertEquals(UserRole::Dealer->value, $fresh->role->value);

        $application = SellerApplication::find($id);
        $this->assertEquals('approved', $application->status->value);
        $this->assertEquals($admin->id, $application->reviewed_by);
        $this->assertNotNull($application->reviewed_at);
    }

    public function test_admin_reject_requires_reason_and_keeps_buyer_role(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin->value]);
        $buyer = User::factory()->create(['role' => UserRole::Buyer->value]);

        $id = $this->postJson('/api/v1/seller-applications', $this->applicationPayload(), $this->token($buyer))
            ->assertCreated()->json('application.id');

        $this->postJson("/api/v1/admin/seller-applications/{$id}/reject", [], $this->token($admin))
            ->assertUnprocessable();

        $this->postJson("/api/v1/admin/seller-applications/{$id}/reject",
            ['reason' => 'Business permit is expired.'],
            $this->token($admin))
            ->assertOk()
            ->assertJsonPath('application.status', 'rejected');

        $this->assertEquals(UserRole::Buyer->value, $buyer->fresh()->role->value);
        $this->assertStringContainsString('Business permit is expired.', SellerApplication::find($id)->review_notes);

        // Rejected applicants may re-apply.
        $this->postJson('/api/v1/seller-applications', $this->applicationPayload(), $this->token($buyer))->assertCreated();
    }

    public function test_admin_cannot_review_finalized_application_twice(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin->value]);
        $buyer = User::factory()->create(['role' => UserRole::Buyer->value]);
        $approved = SellerApplication::factory()->approved()->create(['user_id' => $buyer->id]);

        $this->postJson("/api/v1/admin/seller-applications/{$approved->id}/approve", [], $this->token($admin))
            ->assertUnprocessable();
        $this->postJson("/api/v1/admin/seller-applications/{$approved->id}/reject", ['reason' => 'x'], $this->token($admin))
            ->assertUnprocessable();
    }

    public function test_unverified_seller_cannot_create_or_publish_listings(): void
    {
        $seller = User::factory()->create(['role' => UserRole::Seller->value]);

        $this->postJson('/api/v1/seller/cars', $this->carPayload(), $this->token($seller))
            ->assertForbidden()
            ->assertJsonPath('code', 'kyc_verification_required');

        $car = Car::factory()->for($seller, 'seller')->create(['status' => CarStatus::Draft->value]);
        $this->postJson("/api/v1/seller/cars/{$car->id}/publish", [], $this->token($seller))
            ->assertForbidden()
            ->assertJsonPath('code', 'kyc_verification_required');

        $partsSeller = User::factory()->create(['role' => UserRole::PartsSeller->value]);

        $this->postJson('/api/v1/seller/parts', $this->partPayload(), $this->token($partsSeller))
            ->assertForbidden()
            ->assertJsonPath('code', 'house_catalog_only');

        $part = Part::factory()->for($partsSeller, 'seller')->create(['status' => 'draft']);
        $this->postJson("/api/v1/seller/parts/{$part->id}/publish", [], $this->token($partsSeller))
            ->assertForbidden()
            ->assertJsonPath('code', 'kyc_verification_required');
    }

    public function test_verified_seller_can_create_and_publish_after_upgrade(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin->value]);
        $buyer = User::factory()->kycVerified()->create(['role' => UserRole::Buyer->value]);

        $id = $this->postJson('/api/v1/seller-applications', $this->applicationPayload(), $this->token($buyer))
            ->assertCreated()->json('application.id');

        $this->postJson("/api/v1/admin/seller-applications/{$id}/approve", [], $this->token($admin))->assertOk();

        // Session token still valid; /auth/me reflects the upgraded role.
        $me = $this->getJson('/api/v1/auth/me', $this->token($buyer))->assertOk();
        $me->assertJsonPath('role', UserRole::Seller->value);

        $carId = $this->postJson('/api/v1/seller/cars', $this->carPayload(), $this->token($buyer))
            ->assertCreated()->json('data.id');

        $this->postJson("/api/v1/seller/cars/{$carId}/publish", [], $this->token($buyer))
            ->assertOk()->assertJsonPath('data.status', 'active');
    }

    public function test_seller_can_filter_all_statuses_including_pending_moderation(): void
    {
        $seller = User::factory()->kycVerified()->create(['role' => UserRole::Seller->value]);
        Car::factory()->for($seller, 'seller')->create(['status' => CarStatus::PendingInspection->value]);
        Car::factory()->for($seller, 'seller')->create(['status' => CarStatus::Draft->value]);

        $this->getJson('/api/v1/seller/cars?status=pending_inspection', $this->token($seller))
            ->assertOk()->assertJsonCount(1, 'data');

        $this->getJson('/api/v1/seller/cars', $this->token($seller))
            ->assertOk()->assertJsonCount(2, 'data');
    }

    public function test_seller_summary_returns_per_status_counts(): void
    {
        $seller = User::factory()->kycVerified()->create(['role' => UserRole::Seller->value]);
        Car::factory()->for($seller, 'seller')->create(['status' => CarStatus::Draft->value]);
        Car::factory()->for($seller, 'seller')->create(['status' => CarStatus::PendingInspection->value]);
        Car::factory()->for($seller, 'seller')->create(['status' => CarStatus::Active->value]);
        Part::factory()->for($seller, 'seller')->create(['status' => 'sold']);

        // Another seller's inventory must not leak in.
        $other = User::factory()->kycVerified()->create(['role' => UserRole::Seller->value]);
        Car::factory()->for($other, 'seller')->create(['status' => CarStatus::Draft->value]);

        $res = $this->getJson('/api/v1/seller/summary', $this->token($seller))->assertOk();
        $res->assertJsonPath('cars.draft', 1);
        $res->assertJsonPath('cars.pending_inspection', 1);
        $res->assertJsonPath('cars.active', 1);
        $res->assertJsonPath('cars.total', 3);
        $res->assertJsonPath('parts.sold', 1);
        $res->assertJsonPath('parts.total', 1);
        $res->assertJsonPath('pending_moderation', 1);
    }
}
