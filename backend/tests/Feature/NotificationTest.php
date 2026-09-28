<?php

namespace Tests\Feature;

use App\Models\Notification;
use App\Models\Order;
use App\Models\Part;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NotificationTest extends TestCase
{
    use RefreshDatabase;

    private function token(User $user): array
    {
        return ['Authorization' => 'Bearer ' . $user->createToken('t')->plainTextToken];
    }

    public function test_user_lists_mark_and_clears_notifications(): void
    {
        $user = User::factory()->create(['role' => 'buyer']);
        $headers = $this->token($user);

        Notification::create(['user_id' => $user->id, 'type' => 'order', 'title' => 'Order update', 'body' => 'Shipped']);
        Notification::create(['user_id' => $user->id, 'type' => 'chat', 'title' => 'New message', 'read_at' => now()]);

        $index = $this->getJson('/api/v1/notifications', $headers)->assertOk();
        $this->assertEquals(2, $index->json('meta.total'));
        $this->assertEquals(1, $index->json('unread_count'));

        $unreadOnly = $this->getJson('/api/v1/notifications?unread=1', $headers)->assertOk();
        $this->assertEquals(1, $unreadOnly->json('meta.total'));

        $unreadId = collect($index->json('data'))->firstWhere('read_at', null)['id'];
        $this->postJson("/api/v1/notifications/{$unreadId}/read", [], $headers)->assertOk();

        $this->getJson('/api/v1/notifications/unread-count', $headers)
            ->assertOk()->assertJsonPath('unread_count', 0);

        $this->deleteJson('/api/v1/notifications', [], $headers)->assertOk()
            ->assertJsonPath('deleted_count', 2);
        $this->assertEquals(0, Notification::where('user_id', $user->id)->count());
    }

    public function test_users_cannot_touch_each_others_notifications(): void
    {
        $owner = User::factory()->create(['role' => 'buyer']);
        $stranger = User::factory()->create(['role' => 'buyer']);
        $row = Notification::create(['user_id' => $owner->id, 'type' => 'order', 'title' => 'Mine']);

        $this->postJson("/api/v1/notifications/{$row->id}/read", [], $this->token($stranger))->assertStatus(403);
        $this->deleteJson("/api/v1/notifications/{$row->id}", [], $this->token($stranger))->assertStatus(403);
    }

    public function test_order_lifecycle_creates_buyer_and_seller_notifications(): void
    {
        $seller = User::factory()->create(['role' => 'seller']);
        $part = Part::create([
            'seller_id' => $seller->id,
            'title' => 'HKS Blow-Off Valve',
            'category' => 'engine',
            'brand' => 'HKS',
            'part_number' => 'HKS-BOV-01',
            'price' => 8500.00,
            'status' => 'active',
            'published_at' => now(),
        ]);

        $orderNumber = $this->postJson('/api/v1/orders', [
            'buyer_name' => 'Buyer One',
            'buyer_email' => 'buyer1@garage.test',
            'shipping_address' => 'Makati',
            'chassis_number' => 'JZA80-001',
            'vin' => 'VIN12345678901234',
            'part_id' => $part->id,
            'quantity' => 1,
        ])->assertCreated()->json('data.order_number');

        // Seller got a "new order" notification (guest buyer has no account).
        $this->assertTrue(
            Notification::where('user_id', $seller->id)->where('type', 'order')->exists()
        );

        // Status move notifies the seller again.
        $admin = User::factory()->create(['role' => 'admin']);
        $order = Order::where('order_number', $orderNumber)->firstOrFail();
        $this->postJson("/api/v1/seller/orders/{$order->id}/accept", [], $this->token($seller))->assertOk();
        $this->patchJson("/api/v1/admin/orders/{$order->id}/status", [
            'status' => 'preparing',
        ], $this->token($admin))->assertOk();

        $this->assertGreaterThanOrEqual(
            2,
            Notification::where('user_id', $seller->id)->where('type', 'order')->count()
        );
    }

    public function test_chat_send_notifies_recipient_with_thread_link(): void
    {
        $seller = User::factory()->create(['role' => 'seller']);
        $buyer = User::factory()->create(['role' => 'buyer']);
        $part = Part::create([
            'seller_id' => $seller->id,
            'title' => 'Cusco Coilovers',
            'category' => 'suspension',
            'brand' => 'Cusco',
            'part_number' => 'CUS-01',
            'price' => 45000.00,
            'status' => 'active',
            'published_at' => now(),
        ]);

        $convId = $this->postJson('/api/v1/chat/conversations', [
            'recipient_id' => $seller->id,
            'listing_type' => 'part',
            'listing_id' => $part->id,
        ], $this->token($buyer))->assertCreated()->json('data.id');

        $this->postJson("/api/v1/chat/conversations/{$convId}/messages", [
            'body' => 'Is this still available?',
            'listing_type' => 'part',
            'listing_id' => $part->id,
        ], $this->token($buyer))->assertCreated();

        $row = Notification::where('user_id', $seller->id)->where('type', 'chat')->firstOrFail();
        $this->assertStringContainsString('/messages?listing=part:', $row->link);
        $this->assertEquals($convId, $row->data['conversation_id']);
    }

    public function test_admin_broadcast_reaches_role_audience(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $seller = User::factory()->create(['role' => 'seller']);
        $buyer = User::factory()->create(['role' => 'buyer']);

        $this->postJson('/api/v1/admin/notifications/broadcast', [
            'title' => 'Maintenance tonight',
            'body' => 'Downtime 2AM-3AM.',
            'type' => 'broadcast',
            'audience' => 'role',
            'role' => 'seller',
        ], $this->token($admin))->assertCreated()->assertJsonPath('data.sent_count', 1);

        $this->assertTrue(Notification::where('user_id', $seller->id)->where('type', 'broadcast')->exists());
        $this->assertFalse(Notification::where('user_id', $buyer->id)->where('type', 'broadcast')->exists());

        $stats = $this->getJson('/api/v1/admin/notifications/stats', $this->token($admin))->assertOk();
        $this->assertEquals(1, $stats->json('data.sent_today'));
    }

    public function test_kyc_approval_notifies_user(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $seller = User::factory()->create(['role' => 'seller', 'kyc_status' => 'pending']);

        $this->postJson("/api/v1/admin/kyc-verifications/{$seller->id}/approve", [], $this->token($admin))->assertOk();

        $this->assertTrue(
            Notification::where('user_id', $seller->id)->where('type', 'kyc')->exists()
        );
    }
}
