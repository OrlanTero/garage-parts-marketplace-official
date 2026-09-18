<?php

namespace App\Models;

use App\Enums\PartCategory;
use App\Enums\PartCondition;
use App\Enums\PartStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Part extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'seller_id',
        'title',
        'category',
        'brand',
        'part_number',
        'compatibility',
        'condition',
        'tag',
        'quantity',
        'price',
        'original_price',
        'free_shipping',
        'description',
        'city',
        'location',
        'status',
        'rating',
        'reviews_count',
        'published_at',
        'sold_at',
    ];

    protected $appends = [
        'primary_image_url',
        'image_urls',
    ];

    protected function casts(): array
    {
        return [
            'category' => PartCategory::class,
            'condition' => PartCondition::class,
            'quantity' => 'integer',
            'price' => 'decimal:2',
            'original_price' => 'decimal:2',
            'free_shipping' => 'boolean',
            'rating' => 'decimal:2',
            'reviews_count' => 'integer',
            'status' => PartStatus::class,
            'published_at' => 'datetime',
            'sold_at' => 'datetime',
        ];
    }

    public function seller(): BelongsTo
    {
        return $this->belongsTo(User::class, 'seller_id');
    }

    public function media(): \Illuminate\Database\Eloquent\Relations\MorphMany
    {
        return $this->morphMany(Media::class, 'mediable')
            ->orderByDesc('is_primary')
            ->orderBy('order')
            ->orderBy('id');
    }

    public function images(): \Illuminate\Database\Eloquent\Relations\MorphMany
    {
        return $this->morphMany(Media::class, 'mediable')
            ->where('type', 'image')
            ->orderByDesc('is_primary')
            ->orderBy('order')
            ->orderBy('id');
    }

    public function primaryMedia(): \Illuminate\Database\Eloquent\Relations\MorphOne
    {
        return $this->morphOne(Media::class, 'mediable')
            ->ofMany(['order' => 'min', 'id' => 'min'], fn ($q) => $q->where('is_primary', true)->orWhere('type', 'image'));
    }

    public function favorites(): \Illuminate\Database\Eloquent\Relations\MorphMany
    {
        return $this->morphMany(Favorite::class, 'favoritable');
    }

    public function getPrimaryImageUrlAttribute(): ?string
    {
        if ($this->relationLoaded('media')) {
            $primary = $this->media->firstWhere('is_primary', true) ?? $this->media->first();
            return $primary?->url;
        }

        return $this->media()->where('is_primary', true)->value('url') 
            ?? $this->media()->value('url');
    }

    public function getImageUrlsAttribute(): array
    {
        if ($this->relationLoaded('media')) {
            return $this->media->pluck('url')->all();
        }

        return $this->media()->pluck('url')->all();
    }

    /** Public marketplace scope: active listings, newest first. */
    public function scopeListed(Builder $query): Builder
    {
        return $query->where('status', PartStatus::Active->value)
            ->whereNotNull('published_at')
            ->orderByDesc('published_at');
    }

    public function scopeOfSeller(Builder $query, int $sellerId): Builder
    {
        return $query->where('seller_id', $sellerId);
    }

    /** Shared marketplace filters (search, category, condition, ranges, sort). */
    public function scopeFilter(Builder $query, array $filters): Builder
    {
        $query
            ->when($filters['search'] ?? null, function (Builder $q, string $search) {
                $like = "%{$search}%";
                $q->where(fn (Builder $inner) => $inner
                    ->where('title', 'like', $like)
                    ->orWhere('brand', 'like', $like)
                    ->orWhere('part_number', 'like', $like));
            })
            ->when($filters['category'] ?? null, fn (Builder $q, $v) => $q->where('category', $v))
            ->when($filters['brand'] ?? null, fn (Builder $q, $v) => $q->where('brand', $v))
            ->when($filters['condition'] ?? null, fn (Builder $q, $v) => $q->where('condition', $v))
            ->when($filters['city'] ?? null, fn (Builder $q, $v) => $q->where('city', $v))
            ->when($filters['min_price'] ?? null, fn (Builder $q, $v) => $q->where('price', '>=', $v))
            ->when($filters['max_price'] ?? null, fn (Builder $q, $v) => $q->where('price', '<=', $v))
            ->when($filters['in_stock'] ?? null, fn (Builder $q) => $q->where('quantity', '>', 0));

        // Sorting (whitelisted — never raw user input into orderBy).
        match ($filters['sort'] ?? 'newest') {
            'price_asc' => $query->reorder()->orderBy('price'),
            'price_desc' => $query->reorder()->orderByDesc('price'),
            default => $query->reorder()->orderByDesc('published_at'),
        };

        return $query;
    }
}
