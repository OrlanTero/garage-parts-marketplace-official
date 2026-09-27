<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class CarAuction extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'uuid',
        'title',
        'car_id',
        'brand',
        'model',
        'year',
        'mileage_km',
        'body_style',
        'fuel_type',
        'transmission',
        'condition',
        'vin',
        'color',
        'city',
        'location',
        'description',
        'images',
        'starting_price',
        'current_bid',
        'bid_increment',
        'reserve_price',
        'buy_now_price',
        'start_time',
        'end_time',
        'status',
        'winner_id',
        'winner_name',
        'winner_email',
        'winner_phone',
        'winning_bid',
        'total_bids',
        'featured',
        'created_by',
    ];

    protected $casts = [
        'year' => 'integer',
        'mileage_km' => 'integer',
        'images' => 'array',
        'starting_price' => 'decimal:2',
        'current_bid' => 'decimal:2',
        'bid_increment' => 'decimal:2',
        'reserve_price' => 'decimal:2',
        'buy_now_price' => 'decimal:2',
        'winning_bid' => 'decimal:2',
        'total_bids' => 'integer',
        'featured' => 'boolean',
        'start_time' => 'datetime',
        'end_time' => 'datetime',
    ];

    protected $appends = [
        'is_ended',
        'time_remaining_seconds',
        'min_next_bid',
        'primary_image',
    ];

    protected static function booted(): void
    {
        static::creating(function ($auction) {
            if (empty($auction->uuid)) {
                $auction->uuid = (string) Str::uuid();
            }
            if ($auction->current_bid <= 0 && $auction->starting_price > 0) {
                $auction->current_bid = $auction->starting_price;
            }
            if (empty($auction->start_time)) {
                $auction->start_time = now();
            }
            if (empty($auction->end_time)) {
                $auction->end_time = now()->addDays(3);
            }
        });
    }

    public function resolveRouteBinding($value, $field = null)
    {
        if ($field) {
            return parent::resolveRouteBinding($value, $field);
        }

        return $this->where('uuid', $value)
            ->orWhere('id', is_numeric($value) ? (int) $value : 0)
            ->first();
    }

    public function car(): BelongsTo
    {
        return $this->belongsTo(Car::class, 'car_id');
    }

    public function bids(): HasMany
    {
        return $this->hasMany(CarBid::class, 'car_auction_id')->orderByDesc('bid_amount')->orderByDesc('created_at');
    }

    public function highestBid(): BelongsTo
    {
        return $this->belongsTo(CarBid::class, 'car_auction_id')->latestOfMany('bid_amount');
    }

    public function winner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'winner_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function getIsEndedAttribute(): bool
    {
        if (in_array($this->status, ['ended', 'awarded', 'cancelled'])) {
            return true;
        }

        if ($this->end_time && Carbon::now()->greaterThanOrEqualTo($this->end_time)) {
            return true;
        }

        return false;
    }

    public function getTimeRemainingSecondsAttribute(): int
    {
        if (!$this->end_time) {
            return 0;
        }

        $now = Carbon::now();
        if ($now->greaterThanOrEqualTo($this->end_time)) {
            return 0;
        }

        return $now->diffInSeconds($this->end_time, false);
    }

    public function getMinNextBidAttribute(): float
    {
        $current = (float) ($this->current_bid ?: $this->starting_price ?: 0);
        $increment = (float) ($this->bid_increment ?: 5000);

        if ($this->total_bids === 0) {
            return $current;
        }

        return $current + $increment;
    }

    public function getPrimaryImageAttribute(): ?string
    {
        if (is_array($this->images) && count($this->images) > 0) {
            return $this->images[0];
        }

        if ($this->car && $this->car->primary_image_url) {
            return $this->car->primary_image_url;
        }

        return 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=1200&q=80';
    }

    /**
     * Check if auction time has expired and sync status & winner.
     */
    public function checkAndFinalizeStatus(): void
    {
        if ($this->status === 'active' && $this->end_time && Carbon::now()->greaterThanOrEqualTo($this->end_time)) {
            $this->status = 'ended';
            
            // Determine top bidder
            $topBid = $this->bids()->orderByDesc('bid_amount')->first();
            if ($topBid) {
                $this->winner_id = $topBid->user_id;
                $this->winner_name = $topBid->bidder_name;
                $this->winner_email = $topBid->bidder_email;
                $this->winner_phone = $topBid->bidder_phone;
                $this->winning_bid = $topBid->bid_amount;
                $topBid->update(['status' => 'won']);
            }
            $this->save();
        }
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', 'active')
            ->where(function ($q) {
                $q->whereNull('end_time')
                    ->orWhere('end_time', '>', now());
            });
    }

    public function scopeEnded(Builder $query): Builder
    {
        return $query->where(function ($q) {
            $q->whereIn('status', ['ended', 'awarded'])
                ->orWhere(function ($q2) {
                    $q2->where('status', 'active')->where('end_time', '<=', now());
                });
        });
    }

    public function scopeUpcoming(Builder $query): Builder
    {
        return $query->where('status', 'upcoming')
            ->orWhere(function ($q) {
                $q->where('status', 'active')->where('start_time', '>', now());
            });
    }
}
