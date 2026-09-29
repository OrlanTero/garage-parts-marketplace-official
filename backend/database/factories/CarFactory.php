<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class CarFactory extends Factory
{
    public function definition(): array
    {
        return [
            'seller_id' => User::factory(),
            'title' => fake()->words(3, true),
            'brand' => fake()->randomElement(['Toyota', 'Honda', 'Ford', 'BMW', 'Hyundai']),
            'model' => fake()->randomElement(['Vios', 'Civic', 'Ranger', 'X3', 'Tucson']),
            'year' => fake()->numberBetween(2010, (int) date('Y')),
            'price' => fake()->numberBetween(200000, 2500000),
            'mileage_km' => fake()->numberBetween(0, 150000),
            'body_style' => fake()->randomElement(['sedan', 'suv', 'hatchback', 'pickup']),
            'fuel_type' => fake()->randomElement(['petrol', 'diesel', 'hybrid']),
            'transmission' => fake()->randomElement(['manual', 'automatic']),
            'condition' => fake()->randomElement(['new', 'used']),
            'color' => fake()->colorName(),
            'description' => fake()->sentence(),
            'city' => fake()->city(),
            'status' => 'draft',
        ];
    }

    public function active(): static
    {
        return $this->state(fn () => [
            'status' => 'active',
            'is_approved' => true,
            'published_at' => now(),
        ]);
    }
}
