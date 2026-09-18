<?php

namespace App\Models;

use App\Enums\UserRole;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'provider',
        'provider_id',
        'avatar_url',
        'last_login_at',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'last_login_at' => 'datetime',
            'password' => 'hashed',
            'role' => UserRole::class,
        ];
    }

    public function hasRole(string|UserRole ...$roles): bool
    {
        $current = $this->role instanceof UserRole ? $this->role->value : $this->role;

        foreach ($roles as $role) {
            $value = $role instanceof UserRole ? $role->value : $role;
            if ($current === $value) {
                return true;
            }
        }

        return false;
    }

    public function isBuyer(): bool
    {
        return $this->hasRole(UserRole::Buyer);
    }

    public function isSeller(): bool
    {
        return $this->hasRole(UserRole::Seller);
    }

    public function isDealer(): bool
    {
        return $this->hasRole(UserRole::Dealer);
    }

    public function isPartsSeller(): bool
    {
        return $this->hasRole(UserRole::PartsSeller);
    }

    public function isAdmin(): bool
    {
        return $this->hasRole(UserRole::Admin);
    }

    public function cars(): HasMany
    {
        return $this->hasMany(Car::class, 'seller_id');
    }

    public function parts(): HasMany
    {
        return $this->hasMany(Part::class, 'seller_id');
    }
}
