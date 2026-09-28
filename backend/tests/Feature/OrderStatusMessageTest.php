<?php

namespace Tests\Feature;

use App\Models\Car;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\Notification;
use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrderStatusMessageTest extends TestCase
{
    use RefreshDatabase;

    private function token(User $user): array
    {
        return ['Authorization' => 'Bearer ' . $user->createToken('t')->plainTextToken];
    }

    private function makeCar(User $seller): Car
    {
        return Car::create([
            'seller_id' => $seller->id,
            'title' => '2000 Honda Civic SiR EK4',
            'brand' => 'Honda',
            'model' => 'Civic SiR',
            'year' => 2000,
            'price' => 620000.00,
            'quantity' => 3,
            'status' => 'active',
            'is_approved' => true,
            'published_at' => now(),
        ]);
    }

    private function makeOrder(User $seller, User $buyer, Car $car): Order
    {
        return Order::create([
            'order_number' => 'SO-2026-' . strtoupper(substr(md5(uniqid()), 0, 6)),
            'user_id' => $buyer->id,
            'buyer_name' => $buyer->name,
            'buyer_email' => $buyer->email,
            'shipping_address' => 'Makati',
            'item_type' => 'car',
            'car_id' => $car->id,
            'seller_id' => $seller->id,
            'item_name' => $car->title,
            'quantity' => 1,
            'unit_price' => $car->price,
            'shipping_fee' => 0,
            'total_amount' => $car->price,
            'payment_method' => 'bank_transfer',
            'payment_reference' => 'MSG-REF-1',
            'payment_status' => 'paid',
            'status' => 'processing',
            'verification_status' => 'pending',
        ]);
    }

    public function test_seller_status_move_messages_buyer_thread(): void
    {
        $seller = User::factory()->create(['role' => 'seller']);
        $buyer = User::factory()->create(['role' => 'buyer']);
        $car = $this->makeCar($seller);
        $order = $this->makeOrder($seller, $buyer, $car);

        $this->postJson("/api/v1/seller/orders/{$order->id}/accept", [], $this->token($seller))->assertOk();

        // Verification itself messages the buyer.
        $this->assertTrue(
            Message::whereHas('conversation', fn ($q) => $q->where('listing_key', "car:{$car->id}"))
                ->where('sender_id', $seller->id)
                ->where('body', 'like', '%verified and accepted%')
                ->exists()
        );

        // Seller advances to shipped → buyer thread gets the update.
        $this->patchJson("/api/v1/seller/orders/{$order->id}/status", [
            'status' => 'shipped',
            'carrier' => 'LBC Express',
            'tracking_number' => 'LBC-VAL-0099',
        ], $this->token($seller))->assertOk();

        $msg = Message::whereHas('conversation', fn ($q) => $q->where('listing_key', "car:{$car->id}"))
            ->where('sender_id', $seller->id)
            ->where('body', 'like', '%has shipped%')
            ->firstOrFail();
        $this->assertStringContainsString('LBC-VAL-0099', $msg->body);
        $this->assertStringContainsString('LBC Express', $msg->body);

        // Buyer was notified too.
        $this->assertTrue(
            Notification::where('user_id', $buyer->id)->where('type', 'order')->exists()
        );
    }

    public function test_guest_order_without_account_skips_silently(): void
    {
        $seller = User::factory()->create(['role' => 'seller']);
        $car = $this->makeCar($seller);
        $order = $this->makeOrder($seller, User::factory()->create(['role' => 'buyer']), $car);
        $order->forceFill(['user_id' => null, 'buyer_email' => 'ghost@nowhere.test'])->save();

        $this->postJson("/api/v1/seller/orders/{$order->id}/accept", [], $this->token($seller))->assertOk();
        $this->patchJson("/api/v1/seller/orders/{$order->id}/status", [
            'status' => 'negotiating',
        ], $this->token($seller))->assertOk();

        $this->assertEquals(0, Conversation::where('listing_key', "car:{$car->id}")->count());
        $this->assertEquals(0, Message::where('listing_id', $car->id)->count());
    }
}
