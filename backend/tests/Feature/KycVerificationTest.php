<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\Car;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class KycVerificationTest extends TestCase
{
    use RefreshDatabase;

    protected function token(User $user): array
    {
        $token = $user->createToken('test')->plainTextToken;

        return ['Authorization' => "Bearer {$token}"];
    }

    public function test_seller_can_submit_kyc_verification(): void
    {
        Storage::fake('public');

        $seller = User::factory()->create([
            'role' => UserRole::Seller->value,
            'kyc_status' => 'not_submitted',
            'is_kyc_verified' => false,
        ]);

        $statusRes = $this->getJson('/api/v1/kyc/status', $this->token($seller))->assertOk();
        $statusRes->assertJsonPath('kyc.status', 'not_submitted');
        $statusRes->assertJsonPath('kyc.is_verified', false);

        $file = UploadedFile::fake()->image('drivers_license.jpg', 800, 600);
        $selfie = UploadedFile::fake()->image('selfie.jpg', 600, 600);

        $submitRes = $this->postJson('/api/v1/kyc/submit', [
            'document_type' => 'drivers_license',
            'document_number' => 'N02-99-123456',
            'document_file' => $file,
            'selfie_file' => $selfie,
            'notes' => 'Official Philippine Driver\'s License',
        ], $this->token($seller))->assertOk();

        $submitRes->assertJsonPath('kyc.status', 'pending');
        $submitRes->assertJsonPath('kyc.is_verified', false);
        $submitRes->assertJsonPath('kyc.document_number', 'N02-99-123456');

        $fresh = $seller->fresh();
        $this->assertEquals('pending', $fresh->kyc_status);
        $this->assertFalse($fresh->is_kyc_verified);
        $this->assertNotNull($fresh->kyc_document_url);
        $this->assertNotNull($fresh->kyc_selfie_url);
        $this->assertNotNull($fresh->kyc_submitted_at);
    }

    public function test_admin_can_approve_kyc_and_grant_verified_badge(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin->value]);
        $seller = User::factory()->kycPending()->create(['role' => UserRole::Seller->value]);

        $list = $this->getJson('/api/v1/admin/kyc-verifications?status=pending', $this->token($admin))->assertOk();
        $list->assertJsonPath('stats.pending_verifications', 1);

        $approveRes = $this->postJson("/api/v1/admin/kyc-verifications/{$seller->id}/approve", [], $this->token($admin))->assertOk();
        $approveRes->assertJsonPath('user.is_kyc_verified', true);
        $approveRes->assertJsonPath('user.kyc_status', 'approved');

        $fresh = $seller->fresh();
        $this->assertTrue($fresh->is_kyc_verified);
        $this->assertEquals('approved', $fresh->kyc_status);
        $this->assertEquals($admin->id, $fresh->kyc_verified_by);
        $this->assertNotNull($fresh->kyc_verified_at);
    }

    public function test_admin_can_reject_kyc_with_reason(): void
    {
        $admin = User::factory()->create(['role' => UserRole::Admin->value]);
        $seller = User::factory()->kycPending()->create(['role' => UserRole::Seller->value]);

        $rejectRes = $this->postJson("/api/v1/admin/kyc-verifications/{$seller->id}/reject", [
            'reason' => 'Government ID is expired. Please submit an updated ID.',
        ], $this->token($admin))->assertOk();

        $rejectRes->assertJsonPath('user.is_kyc_verified', false);
        $rejectRes->assertJsonPath('user.kyc_status', 'rejected');

        $fresh = $seller->fresh();
        $this->assertFalse($fresh->is_kyc_verified);
        $this->assertEquals('rejected', $fresh->kyc_status);
        $this->assertEquals('Government ID is expired. Please submit an updated ID.', $fresh->kyc_rejection_reason);
    }

    public function test_car_build_marketplace_only_exposes_username_and_verified_badge(): void
    {
        $seller = User::factory()->kycVerified()->create([
            'name' => 'Secret Real Name John Doe',
            'username' => 'jdm_legend_99',
            'email' => 'private_email@example.com',
            'role' => UserRole::Seller->value,
        ]);

        $car = Car::factory()->for($seller, 'seller')->create([
            'status' => 'active',
            'title' => 'Custom 1999 Nissan Skyline GT-R',
        ]);

        $response = $this->getJson("/api/v1/marketplace/cars/{$car->id}")->assertOk();

        // Must include username and verified badge
        $response->assertJsonPath('data.seller.username', 'jdm_legend_99');
        $response->assertJsonPath('data.seller.is_kyc_verified', true);
        $response->assertJsonPath('data.seller.kyc_status', 'approved');

        // Must NOT expose real name or email or phone
        $sellerData = $response->json('data.seller');
        $this->assertArrayNotHasKey('name', $sellerData);
        $this->assertArrayNotHasKey('email', $sellerData);
        $this->assertArrayNotHasKey('phone', $sellerData);
    }

    public function test_chat_messages_and_conversations_only_expose_username_and_avatar(): void
    {
        $buyer = User::factory()->create([
            'name' => 'Buyer Full Name',
            'username' => 'buyer_turbo',
            'email' => 'buyer_private@example.com',
        ]);
        $seller = User::factory()->kycVerified()->create([
            'name' => 'Seller Full Name',
            'username' => 'speed_garage_tokyo',
            'email' => 'seller_private@example.com',
        ]);

        $conv = Conversation::create([
            'user_one_id' => min($buyer->id, $seller->id),
            'user_two_id' => max($buyer->id, $seller->id),
            'last_message_at' => now(),
        ]);

        $msg = Message::create([
            'conversation_id' => $conv->id,
            'sender_id' => $seller->id,
            'body' => 'Yes, this build is available for garage inspection.',
        ]);

        // Check Conversation list
        $convList = $this->getJson('/api/v1/chat/conversations', $this->token($buyer))->assertOk();
        $otherUser = $convList->json('data.0.other_user');
        $this->assertEquals('speed_garage_tokyo', $otherUser['username']);
        $this->assertTrue($otherUser['is_kyc_verified']);
        $this->assertArrayNotHasKey('name', $otherUser);
        $this->assertArrayNotHasKey('email', $otherUser);

        // Check Message stream
        $msgList = $this->getJson("/api/v1/chat/conversations/{$conv->id}/messages", $this->token($buyer))->assertOk();
        $sender = $msgList->json('data.0.sender');
        $this->assertEquals('speed_garage_tokyo', $sender['username']);
        $this->assertTrue($sender['is_kyc_verified']);
        $this->assertArrayNotHasKey('name', $sender);
        $this->assertArrayNotHasKey('email', $sender);
    }
}
