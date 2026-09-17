<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class PartFactory extends Factory
{
    public function definition(): array
    {
        return [
            'seller_id' => User::factory(),
            'title' => fake()->words(4, true),
            'category' => fake()->randomElement(['engine', 'brakes', 'suspension', 'electrical', 'tires_wheels', 'accessories']),
            'brand' => fake()->randomElement(['Bosch', 'Denso', 'NGK', 'Brembo', 'OEM']),
            'part_number' => strtoupper(fake()->bothify('??-####-??')),
            'compatibility' => fake()->randomElement(['Toyota Vios 2019+', 'Honda Civic 2016-2021', 'Universal fit', null]),
            'condition' => fake()->randomElement(['new', 'used', 'refurbished']),
            'quantity' => fake()->numberBetween(1, 20),
            'price' => fake()->numberBetween(500, 85000),
            'description' => fake()->sentence(),
            'city' => fake()->city(),
            'status' => 'draft',
        ];
    }

    public function active(): static
    {
        return $this->state(fn () => [
            'status' => 'active',
            'published_at' => now(),
        ]);
    }
}
