<?php

namespace Tests\Feature;

use App\Models\Car;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InspectionFlowTest extends TestCase
{
    use RefreshDatabase;

    private function token(User $user): array
    {
        return ['Authorization' => 'Bearer ' . $user->createToken('t')->plainTextToken];
    }

    private function carPayload(): array
    {
        return [
            'title' => '2019 Toyota Vios 1.3 E CVT',
            'brand' => 'Toyota',
            'model' => 'Vios',
            'year' => 2019,
            'price' => 528000,
            'mileage_km' => 42000,
            'body_style' => 'sedan',
            'fuel_type' => 'petrol',
            'transmission' => 'automatic',
            'condition' => 'used',
            'city' => 'Cebu City',
            // A seller-supplied score must never stick — inspectors score.
            'inspection_score' => '99/100',
        ];
    }

    public function test_submit_schedule_record_approve_publishes_with_inspector_score(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $inspector = User::factory()->create(['role' => 'inspector']);
        $seller = User::factory()->kycVerified()->create(['role' => 'seller']);

        // Submit lands in draft with NO seller score and off marketplace.
        $carId = $this->postJson('/api/v1/seller/cars', $this->carPayload(), $this->token($seller))
            ->assertCreated()
            ->assertJsonPath('data.status', 'draft')
            ->assertJsonPath('data.inspection_score', null)
            ->json('data.id');
        $this->getJson('/api/v1/marketplace/cars')->assertOk()->assertJsonCount(0, 'data');

        // Seller self-publish is closed — inspection first.
        $this->postJson("/api/v1/seller/cars/{$carId}/publish", [], $this->token($seller))
            ->assertStatus(422);

        // Submit for inspection (on-site visit path).
        $this->postJson("/api/v1/seller/cars/{$carId}/submit-inspection", [
            'inspection_type' => 'onsite_visit',
        ], $this->token($seller))
            ->assertOk()
            ->assertJsonPath('data.status', 'pending_inspection')
            ->assertJsonPath('data.inspection_type', 'onsite_visit');

        // Admin sees it and assigns the inspector (drop-off override here).
        $this->postJson("/api/v1/admin/moderation/cars/{$carId}/schedule-inspection", [
            'inspection_type' => 'garage_dropoff',
            'inspector_id' => $inspector->id,
        ], $this->token($admin))->assertOk();

        // Inspector records the verdict with the real score.
        $this->postJson("/api/v1/admin/moderation/cars/{$carId}/record-inspection", [
            'passed' => true,
            'inspection_score' => '96/100',
            'inspector_notes' => 'Clean chassis.',
        ], $this->token($inspector))
            ->assertOk()
            ->assertJsonPath('data.status', 'inspected')
            ->assertJsonPath('data.score', '96/100');

        // Still NOT on the marketplace until approval.
        $this->getJson('/api/v1/marketplace/cars')->assertOk()->assertJsonCount(0, 'data');

        // Approval publishes WITH the inspector's score.
        $this->postJson("/api/v1/admin/moderation/cars/{$carId}/approve", [], $this->token($admin))
            ->assertOk()
            ->assertJsonPath('data.status', 'active')
            ->assertJsonPath('data.score', '96/100');

        $this->getJson('/api/v1/marketplace/cars')->assertOk()->assertJsonCount(1, 'data');

        // Seller was notified at every step.
        $titles = Notification::where('user_id', $seller->id)->where('type', 'listing')->pluck('title')->all();
        $this->assertNotEmpty($titles);
    }

    public function test_rejection_returns_reason_and_resubmission_reopens_queue(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $inspector = User::factory()->create(['role' => 'inspector']);
        $seller = User::factory()->kycVerified()->create(['role' => 'seller']);

        $carId = $this->postJson('/api/v1/seller/cars', $this->carPayload(), $this->token($seller))
            ->assertCreated()->json('data.id');

        $this->postJson("/api/v1/seller/cars/{$carId}/submit-inspection", [], $this->token($seller))->assertOk();
        $this->postJson("/api/v1/admin/moderation/cars/{$carId}/schedule-inspection", [
            'inspection_type' => 'garage_dropoff',
            'inspector_id' => $inspector->id,
        ], $this->token($admin))->assertOk();
        $this->postJson("/api/v1/admin/moderation/cars/{$carId}/record-inspection", [
            'passed' => false,
            'inspection_score' => '52/100',
        ], $this->token($inspector))
            ->assertOk()->assertJsonPath('data.status', 'rejected');

        // Approval without a pass is refused.
        $this->postJson("/api/v1/admin/moderation/cars/{$carId}/approve", [], $this->token($admin))
            ->assertStatus(422);

        // Fix and resubmit reopens the queue.
        $this->postJson("/api/v1/seller/cars/{$carId}/submit-inspection", [
            'inspection_type' => 'onsite_visit',
        ], $this->token($seller))
            ->assertOk()
            ->assertJsonPath('data.status', 'pending_inspection')
            ->assertJsonPath('data.rejection_reason', null);

        $reason = Notification::where('user_id', $seller->id)
            ->where('type', 'listing')->latest()->firstOrFail();
        $this->assertNotEmpty($reason->body);
    }

    public function test_status_picker_cannot_self_activate(): void
    {
        $seller = User::factory()->kycVerified()->create(['role' => 'seller']);
        $car = Car::factory()->for($seller, 'seller')->create(['status' => 'draft']);

        $this->postJson("/api/v1/seller/cars/{$car->id}/status", [
            'status' => 'active',
        ], $this->token($seller))->assertStatus(422);
    }
}
