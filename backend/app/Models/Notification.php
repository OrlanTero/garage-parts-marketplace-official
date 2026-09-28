<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class Notification extends Model
{
    use HasFactory;

    public const TYPES = [
        'order', 'payment', 'chat', 'payout', 'kyc',
        'listing', 'dispute', 'system', 'broadcast', 'info',
    ];

    protected $fillable = [
        'uuid',
        'user_id',
        'sender_id',
        'type',
        'title',
        'body',
        'data',
        'link',
        'read_at',
    ];

    protected function casts(): array
    {
        return [
            'data' => 'array',
            'read_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (Notification $notification) {
            if (empty($notification->uuid)) {
                $notification->uuid = (string) Str::uuid();
            }
            if (empty($notification->type) || !in_array($notification->type, self::TYPES, true)) {
                $notification->type = 'info';
            }
        });
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_id');
    }

    public function scopeUnread(Builder $query): Builder
    {
        return $query->whereNull('read_at');
    }

    public function scopeOfType(Builder $query, string $type): Builder
    {
        return $query->where('type', $type);
    }

    public function markAsRead(): bool
    {
        if ($this->read_at !== null) {
            return false;
        }

        return (bool) $this->forceFill(['read_at' => now()])->save();
    }
}
