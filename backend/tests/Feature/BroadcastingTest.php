<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Events\CarCreated;
use App\Events\CarSold;
use App\Events\CarStatusChanged;
use App\Events\CarUpdated;
use App\Events\PartCreated;
use App\Events\PartSold;
use App\Events\PartStatusChanged;
use App\Events\PartUpdated;
use App\Models\Car;
use App\Models\Part;
use App\Models\User;
use App\Services\CarService;
use App\Services\PartService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BroadcastingTest extends TestCase
{
    use RefreshDatabase;

    private User $seller;
    private PartService $partService;
    private CarService $carService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seller = User::factory()->create(['role' => UserRole::Seller->value]);
        $this->partService = app(PartService::class);
        $this->carService = app(CarService::class);
    }

    public function test_part_lifecycle_events_dispatched_and_channels_configured(): void
    {
        Event::fake([
            PartCreated::class,
            PartUpdated::class,
            PartStatusChanged::class,
            PartSold::class,
        ]);

        // 1. Create draft
        $part = $this->partService->create($this->seller, [
            'title' => 'Brembo Brake Pads',
            'category' => 'brakes',
            'brand' => 'Brembo',
            'price' => 15000,
            'quantity' => 2,
        ]);

        Event::assertDispatched(PartCreated::class, function (PartCreated $event) use ($part) {
            $channels = array_map(fn ($c) => (string) $c, $event->broadcastOn());
            $this->assertContains('private-user.' . $this->seller->id, $channels);
            $this->assertEquals('part.created', $event->broadcastAs());
            return $event->part->id === $part->id;
        });

        // 2. Publish
        $this->partService->publish($part);

        Event::assertDispatched(PartStatusChanged::class, function (PartStatusChanged $event) use ($part) {
            $channels = array_map(fn ($c) => (string) $c, $event->broadcastOn());
            $this->assertContains('marketplace.parts', $channels);
            $this->assertContains('parts.' . $part->id, $channels);
            $this->assertEquals('part.status_changed', $event->broadcastAs());
            return $event->part->id === $part->id && $event->previousStatus === 'draft';
        });

        // 3. Update
        $this->partService->update($part, ['price' => 14000]);

        Event::assertDispatched(PartUpdated::class, function (PartUpdated $event) use ($part) {
            $channels = array_map(fn ($c) => (string) $c, $event->broadcastOn());
            $this->assertContains('marketplace.parts', $channels);
            $this->assertContains('parts.' . $part->id, $channels);
            $this->assertEquals('part.updated', $event->broadcastAs());
            return $event->part->id === $part->id;
        });

        // 4. Mark Sold
        $this->partService->markSold($part);

        Event::assertDispatched(PartSold::class, function (PartSold $event) use ($part) {
            $channels = array_map(fn ($c) => (string) $c, $event->broadcastOn());
            $this->assertContains('marketplace.parts', $channels);
            $this->assertContains('parts.' . $part->id, $channels);
            $this->assertEquals('part.sold', $event->broadcastAs());
            return $event->part->id === $part->id;
        });
    }

    public function test_car_lifecycle_events_dispatched_and_channels_configured(): void
    {
        Event::fake([
            CarCreated::class,
            CarUpdated::class,
            CarStatusChanged::class,
            CarSold::class,
        ]);

        // 1. Create draft
        $car = $this->carService->create($this->seller, [
            'title' => '2021 Toyota GR Yaris',
            'brand' => 'Toyota',
            'model' => 'GR Yaris',
            'year' => 2021,
            'price' => 2400000,
            'mileage_km' => 15000,
        ]);

        Event::assertDispatched(CarCreated::class, function (CarCreated $event) use ($car) {
            $channels = array_map(fn ($c) => (string) $c, $event->broadcastOn());
            $this->assertContains('private-user.' . $this->seller->id, $channels);
            $this->assertEquals('car.created', $event->broadcastAs());
            return $event->car->id === $car->id;
        });

        // 2. Publish
        $this->carService->publish($car);

        Event::assertDispatched(CarStatusChanged::class, function (CarStatusChanged $event) use ($car) {
            $channels = array_map(fn ($c) => (string) $c, $event->broadcastOn());
            $this->assertContains('marketplace.cars', $channels);
            $this->assertContains('cars.' . $car->id, $channels);
            $this->assertEquals('car.status_changed', $event->broadcastAs());
            return $event->car->id === $car->id && $event->previousStatus === 'draft';
        });

        // 3. Update
        $this->carService->update($car, ['price' => 2350000]);

        Event::assertDispatched(CarUpdated::class, function (CarUpdated $event) use ($car) {
            $channels = array_map(fn ($c) => (string) $c, $event->broadcastOn());
            $this->assertContains('marketplace.cars', $channels);
            $this->assertContains('cars.' . $car->id, $channels);
            $this->assertEquals('car.updated', $event->broadcastAs());
            return $event->car->id === $car->id;
        });

        // 4. Mark Sold
        $this->carService->markSold($car);

        Event::assertDispatched(CarSold::class, function (CarSold $event) use ($car) {
            $channels = array_map(fn ($c) => (string) $c, $event->broadcastOn());
            $this->assertContains('marketplace.cars', $channels);
            $this->assertContains('cars.' . $car->id, $channels);
            $this->assertEquals('car.sold', $event->broadcastAs());
            return $event->car->id === $car->id;
        });
    }

    public function test_broadcasting_auth_endpoint_authenticates_sanctum_user_and_channels(): void
    {
        config([
            'broadcasting.default' => 'reverb',
            'broadcasting.connections.reverb.key' => 'test-key',
            'broadcasting.connections.reverb.secret' => 'test-secret',
            'broadcasting.connections.reverb.app_id' => 'test-app-id',
        ]);
        require base_path('routes/channels.php');

        $token = $this->seller->createToken('test-token')->plainTextToken;

        // 1. Authorize user private channel -> 200 with auth signature
        $response = $this->withToken($token)
            ->postJson('/api/v1/broadcasting/auth', [
                'socket_id' => '1234.5678',
                'channel_name' => 'private-user.' . $this->seller->id,
            ]);

        $response->assertStatus(200)
            ->assertJsonStructure(['auth']);

        // 2. Authorize seller channel -> 200 with auth signature
        $responseSeller = $this->withToken($token)
            ->postJson('/api/v1/broadcasting/auth', [
                'socket_id' => '1234.5678',
                'channel_name' => 'private-seller.' . $this->seller->id,
            ]);

        $responseSeller->assertStatus(200)
            ->assertJsonStructure(['auth']);

        // Authorize dealer on seller channel -> 200
        $dealer = User::factory()->create(['role' => UserRole::Dealer->value]);
        $dealerToken = $dealer->createToken('test-dealer-token')->plainTextToken;
        $this->withToken($dealerToken)
            ->postJson('/api/v1/broadcasting/auth', [
                'socket_id' => '1234.5678',
                'channel_name' => 'private-seller.' . $dealer->id,
            ])
            ->assertStatus(200)
            ->assertJsonStructure(['auth']);

        // Authorize parts seller on seller channel -> 200
        $partsSeller = User::factory()->create(['role' => UserRole::PartsSeller->value]);
        $partsSellerToken = $partsSeller->createToken('test-parts-token')->plainTextToken;
        $this->withToken($partsSellerToken)
            ->postJson('/api/v1/broadcasting/auth', [
                'socket_id' => '1234.5678',
                'channel_name' => 'private-seller.' . $partsSeller->id,
            ])
            ->assertStatus(200)
            ->assertJsonStructure(['auth']);

        // Buyer cannot access seller channel -> 403
        $buyer = User::factory()->create(['role' => UserRole::Buyer->value]);
        $buyerToken = $buyer->createToken('test-buyer-token')->plainTextToken;
        $this->withToken($buyerToken)
            ->postJson('/api/v1/broadcasting/auth', [
                'socket_id' => '1234.5678',
                'channel_name' => 'private-seller.' . $buyer->id,
            ])
            ->assertStatus(403);

        // 3. Authorize presence marketplace channel -> 200 with auth signature & channel_data
        $responsePresence = $this->withToken($token)
            ->postJson('/api/v1/broadcasting/auth', [
                'socket_id' => '1234.5678',
                'channel_name' => 'presence-marketplace',
            ]);

        $responsePresence->assertStatus(200)
            ->assertJsonStructure(['auth', 'channel_data']);

        // 4. Unauthorized user trying to access other user's private channel -> 403
        $otherUser = User::factory()->create();
        $responseForbidden = $this->withToken($token)
            ->postJson('/api/v1/broadcasting/auth', [
                'socket_id' => '1234.5678',
                'channel_name' => 'private-user.' . $otherUser->id,
            ]);

        $responseForbidden->assertStatus(403);
    }
}
