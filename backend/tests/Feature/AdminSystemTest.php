<?php

namespace Tests\Feature;

use App\Enums\CarStatus;
use App\Enums\UserRole;
use App\Models\Car;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminSystemTest extends TestCase
{
    use RefreshDatabase;

    private function token(User $user): array
    {
        return ['Authorization' => 'Bearer ' . $user->createToken('t')->plainTextToken];
    }

    public function test_super_admin_and_admin_have_access_to_moderation_queue(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin->value]);
        $superAdmin = User::factory()->create(['role' => UserRole::SuperAdmin->value]);
        $inspector = User::factory()->create(['role' => UserRole::Inspector->value]);
        $buyer = User::factory()->create(['role' => UserRole::Buyer->value]);

        $seller = User::factory()->create(['role' => UserRole::Seller->value]);
        Car::factory()->for($seller, 'seller')->create(['status' => CarStatus::PendingInspection->value]);

        // Admin, SuperAdmin, Inspector have access
        $this->getJson('/api/v1/admin/moderation/cars', $this->token($admin))->assertOk();
        $this->getJson('/api/v1/admin/moderation/cars', $this->token($superAdmin))->assertOk();
        $this->getJson('/api/v1/admin/moderation/cars', $this->token($inspector))->assertOk();

        // Regular buyer is forbidden
        $this->getJson('/api/v1/admin/moderation/cars', $this->token($buyer))->assertForbidden();
    }

    public function test_admin_can_schedule_vehicle_inspection(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin->value]);
        $inspector = User::factory()->create(['role' => UserRole::Inspector->value]);
        $seller = User::factory()->create(['role' => UserRole::Seller->value]);
        $car = Car::factory()->for($seller, 'seller')->create(['status' => CarStatus::PendingInspection->value]);

        $res = $this->postJson("/api/v1/admin/moderation/cars/{$car->id}/schedule-inspection", [
            'inspection_type' => 'garage_dropoff',
            'inspection_date' => now()->addDays(3)->toISOString(),
            'inspection_location' => 'Makati Central Bay 2',
            'inspector_id' => $inspector->id,
            'notes' => 'Complete lift bay underside structural check',
        ], $this->token($admin))->assertOk();

        $res->assertJsonPath('data.inspection_type', 'garage_dropoff');
        $res->assertJsonPath('data.inspection_status', 'scheduled');
        $res->assertJsonPath('data.inspection_location', 'Makati Central Bay 2');
    }

    public function test_inspector_can_record_inspection_result_and_score(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin->value]);
        $inspector = User::factory()->create(['role' => UserRole::Inspector->value]);
        $otherInspector = User::factory()->create(['role' => UserRole::Inspector->value]);
        $seller = User::factory()->create(['role' => UserRole::Seller->value]);
        $car = Car::factory()->for($seller, 'seller')->create(['status' => CarStatus::PendingInspection->value]);

        // Dispatcher assigns this inspector first.
        $this->postJson("/api/v1/admin/moderation/cars/{$car->id}/schedule-inspection", [
            'inspection_type' => 'garage_dropoff',
            'inspector_id' => $inspector->id,
        ], $this->token($admin))->assertOk();

        // A different inspector cannot record someone else's assignment.
        $this->postJson("/api/v1/admin/moderation/cars/{$car->id}/record-inspection", [
            'passed' => true,
        ], $this->token($otherInspector))->assertForbidden();

        // The assigned inspector can.
        $res = $this->postJson("/api/v1/admin/moderation/cars/{$car->id}/record-inspection", [
            'passed' => true,
            'inspection_score' => '96/100',
            'inspector_notes' => 'Engine compression optimal. Clean chassis and suspension bushings.',
        ], $this->token($inspector))->assertOk();

        $res->assertJsonPath('data.score', '96/100');
        $res->assertJsonPath('data.inspection_status', 'passed');
        $res->assertJsonPath('data.status', 'inspected');
    }

    public function test_inspector_assignment_requires_staff_and_supports_mine_filter(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin->value]);
        $inspector = User::factory()->create(['role' => UserRole::Inspector->value]);
        $buyer = User::factory()->create(['role' => UserRole::Buyer->value]);
        $seller = User::factory()->create(['role' => UserRole::Seller->value]);
        $car = Car::factory()->for($seller, 'seller')->create(['status' => CarStatus::PendingInspection->value]);

        // Buyers cannot be assigned as inspectors.
        $this->postJson("/api/v1/admin/moderation/cars/{$car->id}/schedule-inspection", [
            'inspection_type' => 'garage_dropoff',
            'inspector_id' => $buyer->id,
        ], $this->token($admin))->assertStatus(422);

        // Staff directory lists inspectors for the assignment picker.
        $this->getJson('/api/v1/admin/staff?role=inspector', $this->token($admin))
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $inspector->id);

        // Assign, then the inspector sees it under ?mine=1.
        $this->postJson("/api/v1/admin/moderation/cars/{$car->id}/schedule-inspection", [
            'inspection_type' => 'garage_dropoff',
            'inspector_id' => $inspector->id,
        ], $this->token($admin))->assertOk();

        $this->getJson('/api/v1/admin/moderation/cars?mine=1', $this->token($inspector))
            ->assertOk()
            ->assertJsonCount(1, 'data');
        $this->getJson('/api/v1/admin/appointments?mine=1', $this->token($inspector))
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    public function test_admin_can_approve_and_publish_verified_car_build(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin->value]);
        $seller = User::factory()->create(['role' => UserRole::Seller->value]);
        $car = Car::factory()->for($seller, 'seller')->create([
            'status' => CarStatus::Inspected->value,
            'is_approved' => false,
        ]);

        $res = $this->postJson("/api/v1/admin/moderation/cars/{$car->id}/approve", [], $this->token($admin))->assertOk();

        $res->assertJsonPath('data.status', 'active');
        $res->assertJsonPath('data.is_approved', true);

        // Listed on public marketplace
        $this->getJson('/api/v1/marketplace/cars')->assertOk()->assertJsonCount(1, 'data');
    }

    public function test_admin_can_reject_unroadworthy_car_build(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin->value]);
        $seller = User::factory()->create(['role' => UserRole::Seller->value]);
        $car = Car::factory()->for($seller, 'seller')->create(['status' => CarStatus::PendingInspection->value]);

        $res = $this->postJson("/api/v1/admin/moderation/cars/{$car->id}/reject", [
            'reason' => 'Chassis rust detected in rear quarter subframe.',
        ], $this->token($admin))->assertOk();

        $res->assertJsonPath('data.status', 'rejected');
        $res->assertJsonPath('data.is_approved', false);
        $res->assertJsonPath('data.rejection_reason', 'Chassis rust detected in rear quarter subframe.');
    }

    public function test_admin_can_monitor_appointments_calendar(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin->value]);
        $seller = User::factory()->create(['role' => UserRole::Seller->value]);

        Car::factory()->for($seller, 'seller')->create([
            'inspection_type' => 'garage_dropoff',
            'inspection_status' => 'scheduled',
            'inspection_date' => now()->addDays(1),
        ]);

        Car::factory()->for($seller, 'seller')->create([
            'inspection_type' => 'onsite_visit',
            'inspection_status' => 'scheduled',
            'inspection_date' => now()->addDays(2),
        ]);

        $res = $this->getJson('/api/v1/admin/appointments', $this->token($admin))->assertOk();
        $res->assertJsonCount(2, 'data');

        $filtered = $this->getJson('/api/v1/admin/appointments?type=garage_dropoff', $this->token($admin))->assertOk();
        $filtered->assertJsonCount(1, 'data');
    }

    public function test_admin_can_audit_chats_and_pii_redaction_alerts(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin->value]);
        $userA = User::factory()->create(['role' => UserRole::Buyer->value, 'name' => 'Buyer Uno']);
        $userB = User::factory()->create(['role' => UserRole::Seller->value, 'name' => 'Seller Dos']);

        $conv = Conversation::create([
            'user_one_id' => min($userA->id, $userB->id),
            'user_two_id' => max($userA->id, $userB->id),
            'last_message_at' => now(),
        ]);

        Message::create([
            'conversation_id' => $conv->id,
            'sender_id' => $userA->id,
            'body' => 'Call me at [Phone Number Redacted for Safety]',
            'is_redacted' => true,
        ]);

        $res = $this->getJson('/api/v1/admin/chat/conversations', $this->token($admin))->assertOk();
        $res->assertJsonCount(1, 'data');
        $res->assertJsonPath('data.0.has_pii_alerts', true);
        $res->assertJsonPath('data.0.redacted_messages_count', 1);

        $show = $this->getJson("/api/v1/admin/chat/conversations/{$conv->id}", $this->token($admin))->assertOk();
        $show->assertJsonCount(1, 'messages');
    }

    public function test_admin_can_manage_users_and_update_role_rbac(): void
    {
        $superAdmin = User::factory()->create(['role' => UserRole::SuperAdmin->value]);
        $targetUser = User::factory()->create(['role' => UserRole::Buyer->value]);

        $list = $this->getJson('/api/v1/admin/users', $this->token($superAdmin))->assertOk();
        $list->assertJsonStructure(['data', 'stats', 'meta']);

        $update = $this->patchJson("/api/v1/admin/users/{$targetUser->id}/role", [
            'role' => 'inspector',
        ], $this->token($superAdmin))->assertOk();

        $update->assertJsonPath('user.role', 'inspector');
        $this->assertEquals('inspector', $targetUser->fresh()->role->value);
    }

    public function test_admin_receives_tailored_role_metrics_for_buyers_sellers_dealers(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin->value]);
        $buyer = User::factory()->create(['role' => UserRole::Buyer->value]);
        $seller = User::factory()->create(['role' => UserRole::Seller->value]);
        $dealer = User::factory()->create(['role' => UserRole::Dealer->value]);

        Car::factory()->for($seller, 'seller')->create(['status' => CarStatus::Active->value, 'price' => 1500000]);
        Car::factory()->for($dealer, 'seller')->create(['status' => CarStatus::Active->value, 'price' => 2500000]);

        // Buyer metrics
        $buyerRes = $this->getJson('/api/v1/admin/users?role=buyer', $this->token($admin))->assertOk();
        $buyerRes->assertJsonStructure(['data', 'stats' => ['total_count', 'active_shoppers', 'total_orders', 'total_spend']]);

        // Seller metrics
        $sellerRes = $this->getJson('/api/v1/admin/users?role=seller', $this->token($admin))->assertOk();
        $sellerRes->assertJsonStructure(['data', 'stats' => ['total_count', 'active_cars', 'pending_cars', 'total_valuation']]);
        $this->assertEquals(1500000, $sellerRes->json('stats.total_valuation'));

        // Dealer metrics
        $dealerRes = $this->getJson('/api/v1/admin/users?role=dealer', $this->token($admin))->assertOk();
        $dealerRes->assertJsonStructure(['data', 'stats' => ['total_count', 'fleet_size', 'parts_catalog', 'portfolio_valuation']]);
        $this->assertEquals(2500000, $dealerRes->json('stats.portfolio_valuation'));
    }
}
