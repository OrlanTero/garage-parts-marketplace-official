<?php

namespace Tests\Feature;

use App\Models\Car;
use App\Models\Favorite;
use App\Models\Part;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FavoriteTest extends TestCase
{
    use RefreshDatabase;

    private function authToken(User $user): array
    {
        return ['Authorization' => 'Bearer '.$user->createToken('test')->plainTextToken];
    }

    public function test_guest_cannot_access_favorites(): void
    {
        $this->getJson('/api/v1/favorites')->assertUnauthorized();
        $this->getJson('/api/v1/favorites/ids')->assertUnauthorized();
        $this->postJson('/api/v1/favorites/toggle', ['type' => 'car', 'id' => 1])->assertUnauthorized();
    }

    public function test_user_can_toggle_car_favorites(): void
    {
        $user = User::factory()->create(['role' => 'buyer']);
        $seller = User::factory()->create(['role' => 'seller']);
        $car = Car::factory()->for($seller, 'seller')->active()->create([
            'title' => '2023 Honda Civic Type R FL5',
            'price' => 3800000,
        ]);

        $headers = $this->authToken($user);

        // 1. Toggle ON
        $response = $this->postJson('/api/v1/favorites/toggle', [
            'type' => 'car',
            'id' => $car->id,
        ], $headers);

        $response->assertOk()
            ->assertJsonPath('data.favorited', true)
            ->assertJsonPath('data.type', 'car')
            ->assertJsonPath('data.id', $car->id)
            ->assertJsonPath('data.counts.total', 1)
            ->assertJsonPath('data.counts.cars', 1)
            ->assertJsonPath('data.counts.parts', 0);

        $this->assertDatabaseHas('favorites', [
            'user_id' => $user->id,
            'favoritable_type' => Car::class,
            'favoritable_id' => $car->id,
        ]);

        // 2. Query IDs
        $idsRes = $this->getJson('/api/v1/favorites/ids', $headers);
        $idsRes->assertOk()
            ->assertJsonPath('data.cars', [$car->id])
            ->assertJsonPath('data.parts', [])
            ->assertJsonPath('data.total', 1);

        // 3. Toggle OFF
        $toggleOff = $this->postJson('/api/v1/favorites/toggle', [
            'type' => 'car',
            'id' => $car->id,
        ], $headers);

        $toggleOff->assertOk()
            ->assertJsonPath('data.favorited', false)
            ->assertJsonPath('data.counts.total', 0);

        $this->assertDatabaseMissing('favorites', [
            'user_id' => $user->id,
            'favoritable_type' => Car::class,
            'favoritable_id' => $car->id,
        ]);
    }

    public function test_user_can_toggle_part_favorites(): void
    {
        $user = User::factory()->create(['role' => 'buyer']);
        $seller = User::factory()->create(['role' => 'parts_seller']);
        $part = Part::factory()->for($seller, 'seller')->active()->create([
            'title' => 'Brembo 6-Pot Monobloc Big Brake Kit',
            'price' => 145000,
        ]);

        $headers = $this->authToken($user);

        $response = $this->postJson('/api/v1/favorites/toggle', [
            'type' => 'part',
            'id' => $part->id,
        ], $headers);

        $response->assertOk()
            ->assertJsonPath('data.favorited', true)
            ->assertJsonPath('data.type', 'part')
            ->assertJsonPath('data.counts.parts', 1);

        $this->assertDatabaseHas('favorites', [
            'user_id' => $user->id,
            'favoritable_type' => Part::class,
            'favoritable_id' => $part->id,
        ]);
    }

    public function test_user_can_list_favorites_with_eager_loaded_models_and_filter_by_type(): void
    {
        $user = User::factory()->create(['role' => 'buyer']);
        $seller = User::factory()->create(['role' => 'seller']);
        $headers = $this->authToken($user);

        $car = Car::factory()->for($seller, 'seller')->active()->create(['title' => 'Mazda RX-7 FD3S']);
        $part = Part::factory()->for($seller, 'seller')->active()->create(['title' => 'Apexi Power FC ECU']);

        Favorite::create(['user_id' => $user->id, 'favoritable_type' => Car::class, 'favoritable_id' => $car->id]);
        Favorite::create(['user_id' => $user->id, 'favoritable_type' => Part::class, 'favoritable_id' => $part->id]);

        // List all
        $allRes = $this->getJson('/api/v1/favorites', $headers);
        $allRes->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('meta.counts.total', 2)
            ->assertJsonPath('meta.counts.cars', 1)
            ->assertJsonPath('meta.counts.parts', 1);

        // Filter cars
        $carsRes = $this->getJson('/api/v1/favorites?type=car', $headers);
        $carsRes->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.type', 'car')
            ->assertJsonPath('data.0.item.title', 'Mazda RX-7 FD3S');

        // Filter parts
        $partsRes = $this->getJson('/api/v1/favorites?type=part', $headers);
        $partsRes->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.type', 'part')
            ->assertJsonPath('data.0.item.title', 'Apexi Power FC ECU');
    }

    public function test_favorites_are_isolated_between_users(): void
    {
        $user1 = User::factory()->create(['role' => 'buyer']);
        $user2 = User::factory()->create(['role' => 'buyer']);
        $seller = User::factory()->create(['role' => 'seller']);
        $car = Car::factory()->for($seller, 'seller')->active()->create();

        Favorite::create(['user_id' => $user1->id, 'favoritable_type' => Car::class, 'favoritable_id' => $car->id]);

        // User 1 sees 1 favorite
        $this->getJson('/api/v1/favorites/ids', $this->authToken($user1))
            ->assertOk()
            ->assertJsonPath('data.total', 1);

        // User 2 sees 0 favorites
        $this->getJson('/api/v1/favorites/ids', $this->authToken($user2))
            ->assertOk()
            ->assertJsonPath('data.total', 0)
            ->assertJsonPath('data.cars', []);
    }

    public function test_user_can_clear_all_favorites(): void
    {
        $user = User::factory()->create(['role' => 'buyer']);
        $seller = User::factory()->create(['role' => 'seller']);
        $headers = $this->authToken($user);

        $car = Car::factory()->for($seller, 'seller')->active()->create();
        $part = Part::factory()->for($seller, 'seller')->active()->create();

        Favorite::create(['user_id' => $user->id, 'favoritable_type' => Car::class, 'favoritable_id' => $car->id]);
        Favorite::create(['user_id' => $user->id, 'favoritable_type' => Part::class, 'favoritable_id' => $part->id]);

        $this->deleteJson('/api/v1/favorites/clear', [], $headers)
            ->assertOk()
            ->assertJsonPath('data.deleted_count', 2)
            ->assertJsonPath('data.counts.total', 0);

        $this->assertDatabaseMissing('favorites', ['user_id' => $user->id]);
    }
}
