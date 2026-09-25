<?php

namespace App\Models;

use App\Enums\SellerApplicationStatus;
use App\Enums\UserRole;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SellerApplication extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'requested_role',
        'status',
        'shop_name',
        'contact_phone',
        'city',
        'address',
        'reason',
        'review_notes',
        'reviewed_by',
        'reviewed_at',
    ];

    protected function casts(): array
    {
        return [
            'status' => SellerApplicationStatus::class,
            'reviewed_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function requestedRole(): ?UserRole
    {
        return UserRole::tryFrom($this->requested_role);
    }

    public function isPending(): bool
    {
        $status = $this->status instanceof SellerApplicationStatus
            ? $this->status
            : SellerApplicationStatus::from($this->status);

        return $status === SellerApplicationStatus::Pending;
    }
}
