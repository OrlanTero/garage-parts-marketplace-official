<?php

namespace Tests\Feature;

use App\Models\Car;
use App\Models\Conversation;
use App\Models\Part;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ChatListingInboxTest extends TestCase
{
    use RefreshDatabase;

    private function authToken(User $user): array
    {
        return [
            'Authorization' => 'Bearer ' . $user->createToken('test-token')->plainTextToken,
            'Accept' => 'application/json',
        ];
    }

    public function test_seller_inbox_lists_owned_listings_by_name(): void
    {
        $seller = User::factory()->seller()->create();
        $car = Car::factory()->active()->create([
            'seller_id' => $seller->id,
            'title' => '1972 Toyota Celica GT TA22',
            'price' => 1850000,
        ]);

        $response = $this->getJson('/api/v1/chat/inbox', $this->authToken($seller));

        $response->assertOk()
            ->assertJsonPath('data.0.role', 'selling')
            ->assertJsonPath('data.0.listing_type', 'car')
            ->assertJsonPath('data.0.listing_id', $car->id)
            ->assertJsonPath('data.0.listing.title', '1972 Toyota Celica GT TA22')
            ->assertJsonPath('data.0.inquiry_count', 0);
    }

    public function test_buyer_inbox_lists_listing_after_inquiry(): void
    {
        $seller = User::factory()->seller()->create();
        $buyer = User::factory()->buyer()->create();
        $car = Car::factory()->active()->create([
            'seller_id' => $seller->id,
            'title' => '1998 Nissan Silvia S15',
        ]);

        $this->postJson('/api/v1/chat/conversations', [
            'recipient_id' => $seller->id,
            'listing_type' => 'car',
            'listing_id' => $car->id,
            'initial_message' => 'Is this Silvia still available?',
        ], $this->authToken($buyer))->assertCreated();

        $buyerInbox = $this->getJson('/api/v1/chat/inbox', $this->authToken($buyer));
        $buyerInbox->assertOk()
            ->assertJsonPath('data.0.role', 'buying')
            ->assertJsonPath('data.0.listing.title', '1998 Nissan Silvia S15')
            ->assertJsonPath('data.0.inquiry_count', 1);

        $sellerInbox = $this->getJson('/api/v1/chat/inbox', $this->authToken($seller));
        $sellerInbox->assertOk()
            ->assertJsonPath('data.0.role', 'selling')
            ->assertJsonPath('data.0.listing.title', '1998 Nissan Silvia S15')
            ->assertJsonPath('data.0.inquiry_count', 1)
            ->assertJsonPath('data.0.unread_count', 1);
    }

    public function test_same_users_get_separate_conversations_per_listing(): void
    {
        $seller = User::factory()->seller()->create();
        $buyer = User::factory()->buyer()->create();
        $car = Car::factory()->active()->create([
            'seller_id' => $seller->id,
            'title' => 'Honda Civic Type R',
        ]);
        $part = Part::factory()->active()->create([
            'seller_id' => $seller->id,
            'title' => 'Brembo 6-Pot Kit',
        ]);

        $carConv = $this->postJson('/api/v1/chat/conversations', [
            'recipient_id' => $seller->id,
            'listing_type' => 'car',
            'listing_id' => $car->id,
        ], $this->authToken($buyer))->assertCreated()->json('data.id');

        $partConv = $this->postJson('/api/v1/chat/conversations', [
            'recipient_id' => $seller->id,
            'listing_type' => 'part',
            'listing_id' => $part->id,
        ], $this->authToken($buyer))->assertCreated()->json('data.id');

        $this->assertNotEquals($carConv, $partConv);
        $this->assertEquals(2, Conversation::count());

        $inbox = $this->getJson('/api/v1/chat/inbox', $this->authToken($buyer));
        $inbox->assertOk();
        $titles = collect($inbox->json('data'))->pluck('listing.title')->all();
        $this->assertContains('Honda Civic Type R', $titles);
        $this->assertContains('Brembo 6-Pot Kit', $titles);
    }

    public function test_seller_listing_thread_shows_all_buyer_conversations(): void
    {
        $seller = User::factory()->seller()->create();
        $buyerA = User::factory()->buyer()->create(['username' => 'buyer_a']);
        $buyerB = User::factory()->buyer()->create(['username' => 'buyer_b']);
        $car = Car::factory()->active()->create([
            'seller_id' => $seller->id,
            'title' => 'Mazda RX-7 FD',
        ]);

        $this->postJson('/api/v1/chat/conversations', [
            'recipient_id' => $seller->id,
            'listing_type' => 'car',
            'listing_id' => $car->id,
            'initial_message' => 'Offer from buyer A',
        ], $this->authToken($buyerA))->assertCreated();

        $this->postJson('/api/v1/chat/conversations', [
            'recipient_id' => $seller->id,
            'listing_type' => 'car',
            'listing_id' => $car->id,
            'initial_message' => 'Offer from buyer B',
        ], $this->authToken($buyerB))->assertCreated();

        $sellerThread = $this->getJson("/api/v1/chat/listings/car/{$car->id}", $this->authToken($seller));
        $sellerThread->assertOk()
            ->assertJsonPath('listing.title', 'Mazda RX-7 FD')
            ->assertJsonPath('role', 'selling');
        $this->assertCount(2, $sellerThread->json('conversations'));
        $this->assertCount(2, $sellerThread->json('data'));
        $bodies = collect($sellerThread->json('data'))->pluck('body')->all();
        $this->assertContains('Offer from buyer A', $bodies);
        $this->assertContains('Offer from buyer B', $bodies);

        $buyerThread = $this->getJson("/api/v1/chat/listings/car/{$car->id}", $this->authToken($buyerA));
        $buyerThread->assertOk()
            ->assertJsonPath('role', 'buying');
        $this->assertCount(1, $buyerThread->json('conversations'));
        $this->assertCount(1, $buyerThread->json('data'));
        $this->assertEquals('Offer from buyer A', $buyerThread->json('data.0.body'));
        $this->assertNotContains('Offer from buyer B', collect($buyerThread->json('data'))->pluck('body')->all());
    }

    public function test_thread_carries_per_conversation_unread_and_lock_flags(): void
    {
        $seller = User::factory()->seller()->create();
        $buyerA = User::factory()->buyer()->create();
        $buyerB = User::factory()->buyer()->create();
        $car = Car::factory()->active()->create(['seller_id' => $seller->id]);

        foreach ([$buyerA, $buyerB] as $buyer) {
            $this->postJson('/api/v1/chat/conversations', [
                'recipient_id' => $seller->id,
                'listing_type' => 'car',
                'listing_id' => $car->id,
                'initial_message' => "Hello from {$buyer->username}",
            ], $this->authToken($buyer))->assertCreated();
        }

        $thread = $this->getJson("/api/v1/chat/listings/car/{$car->id}", $this->authToken($seller))
            ->assertOk();
        $convs = $thread->json('conversations');
        $this->assertCount(2, $convs);
        foreach ($convs as $conv) {
            $this->assertEquals(1, $conv['unread_count']);
            $this->assertFalse((bool) $conv['locked_for_viewer']);
        }
        $this->assertCount(2, $thread->json('data'));
    }

    public function test_stranger_cannot_open_listing_thread(): void
    {
        $seller = User::factory()->seller()->create();
        $stranger = User::factory()->buyer()->create();
        $car = Car::factory()->active()->create([
            'seller_id' => $seller->id,
            'title' => 'Hidden Listing',
        ]);

        $this->getJson("/api/v1/chat/listings/car/{$car->id}", $this->authToken($stranger))
            ->assertStatus(403);
    }

    public function test_listing_conversation_is_idempotent_for_same_listing(): void
    {
        $seller = User::factory()->seller()->create();
        $buyer = User::factory()->buyer()->create();
        $car = Car::factory()->active()->create(['seller_id' => $seller->id]);

        $first = $this->postJson('/api/v1/chat/conversations', [
            'recipient_id' => $seller->id,
            'listing_type' => 'car',
            'listing_id' => $car->id,
        ], $this->authToken($buyer))->assertCreated()->json('data.id');

        $second = $this->postJson('/api/v1/chat/conversations', [
            'recipient_id' => $seller->id,
            'listing_type' => 'car',
            'listing_id' => $car->id,
        ], $this->authToken($buyer))->assertCreated()->json('data.id');

        $this->assertEquals($first, $second);
        $this->assertEquals(1, Conversation::count());
    }
}
