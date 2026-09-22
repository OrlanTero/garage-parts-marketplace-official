<?php

namespace App\Models;

use App\Enums\UserRole;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Str;
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
        'agent_code',
        'commission_rate',
        'is_agent',
        'agent_tagline',
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
            'commission_rate' => 'decimal:2',
            'is_agent' => 'boolean',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (User $user) {
            if (empty($user->agent_code)) {
                $slug = Str::slug($user->name ?: 'AGENT', '');
                $prefix = strtoupper(substr($slug, 0, 4)) ?: 'AGT';
                $user->agent_code = 'AGT-' . $prefix . strtoupper(Str::random(4));
            }
            if ($user->commission_rate === null) {
                $user->commission_rate = 5.00;
            }
            if ($user->is_agent === null) {
                $user->is_agent = true;
            }
        });
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

    public function favorites(): HasMany
    {
        return $this->hasMany(Favorite::class);
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class, 'user_id');
    }

    public function referredOrders(): HasMany
    {
        return $this->hasMany(Order::class, 'agent_id');
    }
}
