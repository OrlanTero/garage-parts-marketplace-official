<?php

namespace Database\Seeders;

use App\Models\Car;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\Part;
use App\Models\User;
use Illuminate\Database\Seeder;

class ChatSeeder extends Seeder
{
    public function run(): void
    {
        $buyer = User::where('email', 'buyer@garagemarket.ph')->first() ?? User::first();
        $seller = User::where('email', 'seller@garagemarket.ph')->first() ?? User::where('role', 'seller')->first();
        $partsSeller = User::where('email', 'partsseller@garagemarket.ph')->first() ?? User::where('role', 'parts_seller')->first();
        $dealer = User::where('email', 'dealer@garagemarket.ph')->first() ?? User::where('role', 'dealer')->first();

        $celicaCar = Car::where('vin', 'JT2TA22A109823411')->first() ?? Car::first();
        $bremboPart = Part::where('part_number', '1M1.8024A-RED')->first() ?? Part::first();

        // 1. Conversation: Buyer <-> Makati Showroom (Seller) about Celica GT
        if ($buyer && $seller) {
            $conv1 = Conversation::findOrCreateBetween($buyer->id, $seller->id);

            // Message 1 from Buyer with listing context
            $msg1 = Message::create([
                'conversation_id' => $conv1->id,
                'sender_id' => $buyer->id,
                'body' => 'Good day! Is this 1972 Celica GT TA22 still available for inspection at the Makati showroom?',
                'is_redacted' => false,
                'listing_type' => 'car',
                'listing_id' => $celicaCar?->id,
                'read_at' => now()->subHours(5),
                'created_at' => now()->subHours(6),
            ]);

            // Message 2 from Seller
            $msg2 = Message::create([
                'conversation_id' => $conv1->id,
                'sender_id' => $seller->id,
                'body' => 'Hello Anton! Yes, it is currently on display at our Makati showroom floor. The 100-point inspection report is complete and verified.',
                'is_redacted' => false,
                'listing_type' => 'car',
                'listing_id' => $celicaCar?->id,
                'read_at' => now()->subHours(4),
                'created_at' => now()->subHours(5),
            ]);

            // Message 3 from Buyer with PII (to demonstrate automated safety engine)
            $msg3 = Message::create([
                'conversation_id' => $conv1->id,
                'sender_id' => $buyer->id,
                'body' => 'Awesome, I will schedule a visit this Saturday at 2:00 PM. Looking forward to seeing the twin-cam setup!',
                'is_redacted' => false,
                'listing_type' => 'car',
                'listing_id' => $celicaCar?->id,
                'read_at' => now()->subHours(2),
                'created_at' => now()->subHours(3),
            ]);

            $conv1->update([
                'last_message_id' => $msg3->id,
                'last_message_at' => $msg3->created_at,
            ]);
        }

        // 2. Conversation: Buyer <-> Apex Performance (Parts Seller) about Brembo Kit
        if ($buyer && $partsSeller) {
            $conv2 = Conversation::findOrCreateBetween($buyer->id, $partsSeller->id);

            $msg4 = Message::create([
                'conversation_id' => $conv2->id,
                'sender_id' => $buyer->id,
                'body' => 'Hi, will this Brembo 6-piston kit fit standard 18-inch TE37 wheels without rubbing the barrel?',
                'is_redacted' => false,
                'listing_type' => 'part',
                'listing_id' => $bremboPart?->id,
                'read_at' => now()->subHours(1),
                'created_at' => now()->subHours(2),
            ]);

            $msg5 = Message::create([
                'conversation_id' => $conv2->id,
                'sender_id' => $partsSeller->id,
                'body' => 'Yes! The 355mm rotor setup clears TE37 Saga 18x9.5 +38 comfortably with at least 8mm caliper clearance.',
                'is_redacted' => false,
                'listing_type' => 'part',
                'listing_id' => $bremboPart?->id,
                'read_at' => null,
                'created_at' => now()->subMinutes(30),
            ]);

            $conv2->update([
                'last_message_id' => $msg5->id,
                'last_message_at' => $msg5->created_at,
            ]);
        }
    }
}
