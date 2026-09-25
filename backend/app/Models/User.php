<?php

namespace App\Models;

use App\Enums\UserRole;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
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
        'username',
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
        'kyc_status',
        'is_kyc_verified',
        'kyc_document_type',
        'kyc_document_number',
        'kyc_document_url',
        'kyc_selfie_url',
        'kyc_notes',
        'kyc_rejection_reason',
        'kyc_submitted_at',
        'kyc_verified_at',
        'kyc_verified_by',
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
            'is_kyc_verified' => 'boolean',
            'kyc_submitted_at' => 'datetime',
            'kyc_verified_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (User $user) {
            if (empty($user->username)) {
                $base = !empty($user->email) ? explode('@', $user->email)[0] : ($user->name ?: 'user');
                $slug = Str::slug($base, '_') ?: 'user';
                $candidate = $slug;
                $counter = 1;
                while (static::where('username', $candidate)->exists()) {
                    $candidate = $slug . '_' . $counter++;
                }
                $user->username = $candidate;
            }
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
            if (empty($user->kyc_status)) {
                $user->kyc_status = 'not_submitted';
            }
            if ($user->is_kyc_verified === null) {
                $user->is_kyc_verified = false;
            }
        });
    }

    public function hasRole(string|UserRole ...$roles): bool
    {
        $current = $this->role instanceof UserRole ? $this->role->value : $this->role;

        // Super Admin has full platform clearance for all administrative and operational permissions
        if ($current === UserRole::SuperAdmin->value) {
            return true;
        }

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

    public function isSuperAdmin(): bool
    {
        return $this->hasRole(UserRole::SuperAdmin);
    }

    public function isInspector(): bool
    {
        return $this->hasRole(UserRole::Inspector);
    }

    public function isAdmin(): bool
    {
        return $this->hasRole(UserRole::Admin, UserRole::SuperAdmin);
    }

    public function isStaffOrAdmin(): bool
    {
        return $this->hasRole(UserRole::Admin, UserRole::SuperAdmin, UserRole::Inspector);
    }

    public function isKycVerified(): bool
    {
        return (bool) $this->is_kyc_verified && $this->kyc_status === 'approved';
    }

    public function kycVerifier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'kyc_verified_by');
    }

    public function sellerApplications(): HasMany
    {
        return $this->hasMany(SellerApplication::class);
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

    public function conversationsAsUserOne(): HasMany
    {
        return $this->hasMany(Conversation::class, 'user_one_id');
    }

    public function conversationsAsUserTwo(): HasMany
    {
        return $this->hasMany(Conversation::class, 'user_two_id');
    }

    public function sentMessages(): HasMany
    {
        return $this->hasMany(Message::class, 'sender_id');
    }

    public function conversations()
    {
        return Conversation::where('user_one_id', $this->id)
            ->orWhere('user_two_id', $this->id);
    }
}
