<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AccountSettingsTest extends TestCase
{
    use RefreshDatabase;

    private function as(User $user): void
    {
        $this->withToken($user->createToken('t')->plainTextToken);
    }

    public function test_user_can_update_own_profile(): void
    {
        $user = User::factory()->create(['role' => 'buyer']);

        $this->as($user);
        $response = $this->patchJson('/api/v1/auth/profile', [
            'name' => 'Juan Dela Cruz',
            'phone' => '+63 917 123 4567',
            'avatar_url' => 'https://example.com/avatar.jpg',
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('name', 'Juan Dela Cruz')
            ->assertJsonPath('phone', '+63 917 123 4567');

        $this->assertDatabaseHas('users', ['id' => $user->id, 'phone' => '+63 917 123 4567']);
    }

    public function test_username_must_stay_unique(): void
    {
        $existing = User::factory()->create(['role' => 'buyer', 'username' => 'taken_name']);
        $user = User::factory()->create(['role' => 'buyer']);

        $this->as($user);
        $this->patchJson('/api/v1/auth/profile', ['username' => 'taken_name'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['username']);
    }

    public function test_user_can_change_password_with_current(): void
    {
        $user = User::factory()->create(['role' => 'buyer', 'password' => 'old-secret-1']);

        $this->as($user);
        $this->postJson('/api/v1/auth/password', [
            'current_password' => 'old-secret-1',
            'password' => 'brand-new-secret-2',
            'password_confirmation' => 'brand-new-secret-2',
        ])->assertStatus(200);

        $this->assertTrue(Hash::check('brand-new-secret-2', $user->refresh()->password));
    }

    public function test_password_change_rejects_wrong_current(): void
    {
        $user = User::factory()->create(['role' => 'buyer', 'password' => 'old-secret-1']);

        $this->as($user);
        $this->postJson('/api/v1/auth/password', [
            'current_password' => 'wrong-password',
            'password' => 'brand-new-secret-2',
            'password_confirmation' => 'brand-new-secret-2',
        ])->assertStatus(422);
    }

    public function test_address_book_crud_with_single_default(): void
    {
        $user = User::factory()->create(['role' => 'buyer']);
        $this->as($user);

        $payload = [
            'label' => 'Home',
            'recipient_name' => 'Juan Dela Cruz',
            'phone' => '+63 917 123 4567',
            'address_line' => '123 Mabini St, Brgy Poblacion',
            'city' => 'Makati',
            'postal_code' => '1200',
            'latitude' => 14.5547,
            'longitude' => 121.0244,
            'landmark' => 'Blue gate beside chapel',
        ];

        // First entry auto-becomes default.
        $first = $this->postJson('/api/v1/addresses', $payload)
            ->assertStatus(201)
            ->assertJsonPath('data.is_default', true)
            ->assertJsonPath('data.has_pin', true)
            ->json('data');

        $second = $this->postJson('/api/v1/addresses', array_merge($payload, ['label' => 'Office']))
            ->assertStatus(201)
            ->assertJsonPath('data.is_default', false)
            ->json('data');

        // Promote second → first loses default.
        $this->postJson("/api/v1/addresses/{$second['id']}/default")
            ->assertStatus(200)
            ->assertJsonPath('data.is_default', true);

        $this->assertDatabaseHas('addresses', ['id' => $first['id'], 'is_default' => false]);

        // Deleting the default promotes the remaining entry.
        $this->deleteJson("/api/v1/addresses/{$second['id']}")->assertStatus(200);
        $this->assertDatabaseHas('addresses', ['id' => $first['id'], 'is_default' => true]);
    }

    public function test_users_cannot_touch_each_others_addresses(): void
    {
        $owner = User::factory()->create(['role' => 'buyer']);
        $stranger = User::factory()->create(['role' => 'buyer']);

        $address = \App\Models\Address::create([
            'user_id' => $owner->id,
            'label' => 'Home',
            'recipient_name' => 'Owner',
            'address_line' => '1 Main St',
            'is_default' => true,
        ]);

        $this->as($stranger);
        $this->putJson("/api/v1/addresses/{$address->id}", ['label' => 'Hacked'])->assertStatus(403);
        $this->deleteJson("/api/v1/addresses/{$address->id}")->assertStatus(403);
    }

    public function test_address_validation_rejects_bad_coords(): void
    {
        $user = User::factory()->create(['role' => 'buyer']);
        $this->as($user);

        $this->postJson('/api/v1/addresses', [
            'label' => 'Home',
            'recipient_name' => 'Juan',
            'address_line' => '1 Main St',
            'latitude' => 95,
            'longitude' => 200,
        ])->assertStatus(422)->assertJsonValidationErrors(['latitude', 'longitude']);
    }
}
