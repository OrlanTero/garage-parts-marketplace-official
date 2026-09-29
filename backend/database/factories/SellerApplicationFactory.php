<?php

namespace Database\Factories;

use App\Enums\SellerApplicationStatus;
use App\Models\SellerApplication;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class SellerApplicationFactory extends Factory
{
    protected $model = SellerApplication::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'requested_role' => 'seller',
            'status' => SellerApplicationStatus::Pending->value,
            'shop_name' => fake()->company() . ' Garage',
            'contact_phone' => '09' . fake()->numerify('#########'),
            'city' => fake()->randomElement(['Makati City', 'Cebu City', 'Davao City', 'Quezon City']),
            'address' => fake()->streetAddress(),
            'reason' => 'I want to sell my restored builds on the marketplace.',
        ];
    }

    public function approved(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => SellerApplicationStatus::Approved->value,
            'review_notes' => 'Credentials verified. Approved.',
            'reviewed_by' => User::factory()->admin(),
            'reviewed_at' => now(),
        ]);
    }

    public function rejected(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => SellerApplicationStatus::Rejected->value,
            'review_notes' => 'Incomplete business details.',
            'reviewed_by' => User::factory()->admin(),
            'reviewed_at' => now(),
        ]);
    }
}
