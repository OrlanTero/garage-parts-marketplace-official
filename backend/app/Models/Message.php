<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class Message extends Model
{
    use HasFactory;

    protected $fillable = [
        'conversation_id',
        'sender_id',
        'body',
        'is_redacted',
        'listing_type',
        'listing_id',
        'read_at',
    ];

    protected function casts(): array
    {
        return [
            'is_redacted' => 'boolean',
            'read_at' => 'datetime',
        ];
    }

    public function conversation(): BelongsTo
    {
        return $this->belongsTo(Conversation::class);
    }

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_id');
    }

    /**
     * Resolve the associated Car or Part listing.
     */
    public function getListingAttribute()
    {
        if ($this->listing_type === 'car' && $this->listing_id) {
            return Car::with(['media', 'seller'])->find($this->listing_id);
        }

        if ($this->listing_type === 'part' && $this->listing_id) {
            return Part::with(['media', 'seller'])->find($this->listing_id);
        }

        return null;
    }

    /**
     * Mark this message as read if not already read.
     */
    public function markAsRead(): bool
    {
        if ($this->read_at === null) {
            $this->read_at = now();
            return $this->save();
        }

        return false;
    }
}
