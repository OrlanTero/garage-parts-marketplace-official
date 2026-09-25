<?php

namespace Tests\Feature;

use App\Events\MessageRead;
use App\Events\MessageSent;
use App\Models\Car;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\Part;
use App\Models\User;
use App\Services\PiiSecurityService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

class ChatSystemTest extends TestCase
{
    use RefreshDatabase;

    private function authToken(User $user): array
    {
        $token = $user->createToken('test-token')->plainTextToken;
        return [
            'Authorization' => 'Bearer ' . $token,
            'Accept' => 'application/json',
        ];
    }

    public function test_1_to_1_conversation_idempotency_and_uniqueness(): void
    {
        $buyer = User::factory()->buyer()->create();
        $seller = User::factory()->seller()->create();

        // 1. First call to create conversation
        $response1 = $this->postJson('/api/v1/chat/conversations', [
            'recipient_id' => $seller->id,
            'initial_message' => 'Hello seller, is this car negotiable?',
        ], $this->authToken($buyer));

        $response1->assertStatus(201);
        $convId1 = $response1->json('data.id');
        $this->assertNotNull($convId1);

        // 2. Second call with same users from buyer to seller
        $response2 = $this->postJson('/api/v1/chat/conversations', [
            'recipient_id' => $seller->id,
        ], $this->authToken($buyer));

        $response2->assertStatus(201);
        $convId2 = $response2->json('data.id');
        $this->assertEquals($convId1, $convId2);

        // 3. Third call initiated inversely from seller to buyer
        $response3 = $this->postJson('/api/v1/chat/conversations', [
            'recipient_id' => $buyer->id,
        ], $this->authToken($seller));

        $response3->assertStatus(201);
        $convId3 = $response3->json('data.id');
        $this->assertEquals($convId1, $convId3);

        // Exactly one conversation row in the database
        $this->assertEquals(1, Conversation::count());
    }

    public function test_self_messaging_is_rejected(): void
    {
        $user = User::factory()->buyer()->create();

        $response = $this->postJson('/api/v1/chat/conversations', [
            'recipient_id' => $user->id,
            'initial_message' => 'Talking to myself',
        ], $this->authToken($user));

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['recipient_id']);
    }

    public function test_pii_sanitization_and_redaction_in_messages(): void
    {
        $buyer = User::factory()->buyer()->create();
        $seller = User::factory()->seller()->create();
        $conversation = Conversation::findOrCreateBetween($buyer->id, $seller->id);

        $sensitiveText = 'Please call me at 0917-555-1234 or email buyer@example.com';

        $response = $this->postJson("/api/v1/chat/conversations/{$conversation->id}/messages", [
            'body' => $sensitiveText,
        ], $this->authToken($buyer));

        $response->assertStatus(201)
            ->assertJson([
                'data' => [
                    'is_redacted' => true,
                ],
            ]);

        $body = $response->json('data.body');
        $this->assertStringContainsString(PiiSecurityService::REDACTED_PHONE, $body);
        $this->assertStringContainsString(PiiSecurityService::REDACTED_EMAIL, $body);
        $this->assertStringNotContainsString('0917-555-1234', $body);
        $this->assertStringNotContainsString('buyer@example.com', $body);

        // Verify in database
        $this->assertDatabaseHas('messages', [
            'conversation_id' => $conversation->id,
            'sender_id' => $buyer->id,
            'is_redacted' => true,
        ]);
    }

    public function test_pii_redaction_with_external_links_and_social_handles(): void
    {
        $buyer = User::factory()->buyer()->create();
        $seller = User::factory()->seller()->create();
        $conversation = Conversation::findOrCreateBetween($buyer->id, $seller->id);

        $response = $this->postJson("/api/v1/chat/conversations/{$conversation->id}/messages", [
            'body' => 'Check my fb profile https://facebook.com/seller_profile or telegram: @turboseller',
        ], $this->authToken($buyer));

        $response->assertStatus(201)
            ->assertJson([
                'data' => [
                    'is_redacted' => true,
                ],
            ]);

        $body = $response->json('data.body');
        $this->assertStringNotContainsString('https://facebook.com/seller_profile', $body);
    }

    public function test_listing_context_linkage_for_car_and_part(): void
    {
        $seller = User::factory()->seller()->create();
        $buyer = User::factory()->buyer()->create();

        $car = Car::factory()->create([
            'seller_id' => $seller->id,
            'title' => '2024 Honda Civic Type R FL5',
            'price' => 3850000,
        ]);

        $part = Part::factory()->create([
            'seller_id' => $seller->id,
            'title' => 'Brembo 6-Pot Monobloc Caliper Kit',
            'price' => 125000,
        ]);

        $conversation = Conversation::findOrCreateBetween($buyer->id, $seller->id);

        // 1. Send message with Car context
        $carMsgResponse = $this->postJson("/api/v1/chat/conversations/{$conversation->id}/messages", [
            'body' => 'Is this Type R available for showroom inspection tomorrow?',
            'listing_type' => 'car',
            'listing_id' => $car->id,
        ], $this->authToken($buyer));

        $carMsgResponse->assertStatus(201)
            ->assertJsonPath('data.listing.type', 'car')
            ->assertJsonPath('data.listing.id', $car->id)
            ->assertJsonPath('data.listing.title', '2024 Honda Civic Type R FL5')
            ->assertJsonPath('data.listing.price', 3850000);

        // 2. Send message with Part context
        $partMsgResponse = $this->postJson("/api/v1/chat/conversations/{$conversation->id}/messages", [
            'body' => 'Does this Brembo kit fit an FL5 chassis?',
            'listing_type' => 'part',
            'listing_id' => $part->id,
        ], $this->authToken($buyer));

        $partMsgResponse->assertStatus(201)
            ->assertJsonPath('data.listing.type', 'part')
            ->assertJsonPath('data.listing.id', $part->id);
    }

    public function test_unauthorized_user_cannot_access_or_send_to_other_conversation(): void
    {
        $userA = User::factory()->buyer()->create();
        $userB = User::factory()->seller()->create();
        $userC = User::factory()->buyer()->create();

        $conversation = Conversation::findOrCreateBetween($userA->id, $userB->id);

        // User C tries to fetch messages
        $showResponse = $this->getJson("/api/v1/chat/conversations/{$conversation->id}", $this->authToken($userC));
        $showResponse->assertStatus(403);

        $messagesResponse = $this->getJson("/api/v1/chat/conversations/{$conversation->id}/messages", $this->authToken($userC));
        $messagesResponse->assertStatus(403);

        // User C tries to send message
        $sendResponse = $this->postJson("/api/v1/chat/conversations/{$conversation->id}/messages", [
            'body' => 'Intruder trying to send message',
        ], $this->authToken($userC));
        $sendResponse->assertStatus(403);
    }

    public function test_mark_as_read_and_unread_count_tracking(): void
    {
        $buyer = User::factory()->buyer()->create();
        $seller = User::factory()->seller()->create();
        $conversation = Conversation::findOrCreateBetween($buyer->id, $seller->id);

        // Seller sends 2 messages to Buyer
        $this->postJson("/api/v1/chat/conversations/{$conversation->id}/messages", [
            'body' => 'Message 1 from seller',
        ], $this->authToken($seller));

        $this->postJson("/api/v1/chat/conversations/{$conversation->id}/messages", [
            'body' => 'Message 2 from seller',
        ], $this->authToken($seller));

        // Buyer checks unread count
        $unreadResponse = $this->getJson('/api/v1/chat/unread-count', $this->authToken($buyer));
        $unreadResponse->assertStatus(200)
            ->assertJson(['unread_count' => 2]);

        // Buyer marks conversation as read
        $readResponse = $this->postJson("/api/v1/chat/conversations/{$conversation->id}/read", [], $this->authToken($buyer));
        $readResponse->assertStatus(200)
            ->assertJson(['marked_count' => 2]);

        // Buyer checks unread count again
        $unreadResponse2 = $this->getJson('/api/v1/chat/unread-count', $this->authToken($buyer));
        $unreadResponse2->assertStatus(200)
            ->assertJson(['unread_count' => 0]);
    }

    public function test_realtime_events_dispatched_on_send_and_read(): void
    {
        Event::fake([MessageSent::class, MessageRead::class]);

        $buyer = User::factory()->buyer()->create();
        $seller = User::factory()->seller()->create();
        $conversation = Conversation::findOrCreateBetween($buyer->id, $seller->id);

        // Send message
        $this->postJson("/api/v1/chat/conversations/{$conversation->id}/messages", [
            'body' => 'Hello real-time chat',
        ], $this->authToken($buyer));

        Event::assertDispatched(MessageSent::class, function (MessageSent $event) use ($conversation, $seller) {
            return $event->message->conversation_id === $conversation->id &&
                   $event->recipientId === $seller->id;
        });

        // Mark read
        $this->postJson("/api/v1/chat/conversations/{$conversation->id}/read", [], $this->authToken($seller));

        Event::assertDispatched(MessageRead::class, function (MessageRead $event) use ($conversation, $seller, $buyer) {
            return $event->conversationId === $conversation->id &&
                   $event->readerId === $seller->id &&
                   $event->senderId === $buyer->id;
        });
    }

    public function test_conversation_channel_authorization_rule(): void
    {
        config([
            'broadcasting.default' => 'reverb',
            'broadcasting.connections.reverb.key' => 'test-key',
            'broadcasting.connections.reverb.secret' => 'test-secret',
            'broadcasting.connections.reverb.app_id' => 'test-app-id',
        ]);
        require base_path('routes/channels.php');

        $userA = User::factory()->buyer()->create();
        $userB = User::factory()->seller()->create();
        $userC = User::factory()->buyer()->create();

        $conversation = Conversation::findOrCreateBetween($userA->id, $userB->id);

        // Participant User A authorized
        $responseA = $this->postJson('/api/v1/broadcasting/auth', [
            'channel_name' => 'private-conversation.' . $conversation->id,
            'socket_id' => '1234.5678',
        ], $this->authToken($userA));
        $responseA->assertStatus(200);

        // Non-participant User C rejected
        $responseC = $this->postJson('/api/v1/broadcasting/auth', [
            'channel_name' => 'private-conversation.' . $conversation->id,
            'socket_id' => '1234.5678',
        ], $this->authToken($userC));
        $responseC->assertStatus(403);
    }
}
