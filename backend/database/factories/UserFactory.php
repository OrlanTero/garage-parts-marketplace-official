<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class UserFactory extends Factory
{
    protected static ?string $password = null;

    public function definition(): array
    {
        $name = fake()->name();
        $username = Str::slug($name, '_') . '_' . fake()->unique()->numberBetween(10, 999);

        return [
            'name' => $name,
            'username' => $username,
            'email' => fake()->unique()->safeEmail(),
            'email_verified_at' => now(),
            'password' => static::$password ??= Hash::make('password'),
            'role' => 'buyer',
            'kyc_status' => 'not_submitted',
            'is_kyc_verified' => false,
            'remember_token' => Str::random(10),
        ];
    }

    public function kycVerified(): static
    {
        return $this->state(fn (array $attributes) => [
            'kyc_status' => 'approved',
            'is_kyc_verified' => true,
            'kyc_document_type' => 'drivers_license',
            'kyc_document_number' => 'N02-' . fake()->numerify('##-######'),
            'kyc_document_url' => 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=800',
            'kyc_selfie_url' => 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800',
            'kyc_submitted_at' => now()->subDays(5),
            'kyc_verified_at' => now()->subDays(3),
        ]);
    }

    public function kycPending(): static
    {
        return $this->state(fn (array $attributes) => [
            'kyc_status' => 'pending',
            'is_kyc_verified' => false,
            'kyc_document_type' => 'passport',
            'kyc_document_number' => 'P' . fake()->numerify('#######A'),
            'kyc_document_url' => 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=800',
            'kyc_submitted_at' => now()->subHours(6),
        ]);
    }

    public function kycRejected(): static
    {
        return $this->state(fn (array $attributes) => [
            'kyc_status' => 'rejected',
            'is_kyc_verified' => false,
            'kyc_document_type' => 'national_id',
            'kyc_document_number' => fake()->numerify('####-####-####-####'),
            'kyc_rejection_reason' => 'Document scan is blurry. Please re-upload a clear photo of your ID.',
            'kyc_submitted_at' => now()->subDays(2),
        ]);
    }

    public function buyer(): static
    {
        return $this->state(fn (array $attributes) => [
            'role' => 'buyer',
        ]);
    }

    public function seller(): static
    {
        return $this->state(fn (array $attributes) => [
            'role' => 'seller',
        ]);
    }

    public function dealer(): static
    {
        return $this->state(fn (array $attributes) => [
            'role' => 'dealer',
        ]);
    }

    public function partsSeller(): static
    {
        return $this->state(fn (array $attributes) => [
            'role' => 'parts_seller',
        ]);
    }

    public function admin(): static
    {
        return $this->state(fn (array $attributes) => [
            'role' => 'admin',
        ]);
    }
}
