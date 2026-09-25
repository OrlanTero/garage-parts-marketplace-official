<?php

namespace App\Models;

use App\Enums\BodyStyle;
use App\Enums\CarCondition;
use App\Enums\CarStatus;
use App\Enums\FuelType;
use App\Enums\Transmission;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Car extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'uuid',
        'seller_id',
        'brand_id',
        'model_id',
        'title',
        'brand',
        'model',
        'year',
        'price',
        'original_price',
        'mileage_km',
        'body_style',
        'fuel_type',
        'transmission',
        'condition',
        'quantity',
        'tag',
        'color',
        'vin',
        'description',
        'city',
        'location',
        'status',
        'rating',
        'inspection_score',
        'inspection_type',
        'inspection_status',
        'inspection_date',
        'inspection_location',
        'inspector_id',
        'inspector_notes',
        'is_approved',
        'approved_by',
        'approved_at',
        'rejection_reason',
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
            'year' => 'integer',
            'quantity' => 'integer',
            'price' => 'decimal:2',
            'original_price' => 'decimal:2',
            'mileage_km' => 'integer',
            'rating' => 'decimal:2',
            'body_style' => BodyStyle::class,
            'fuel_type' => FuelType::class,
            'transmission' => Transmission::class,
            'condition' => CarCondition::class,
            'status' => CarStatus::class,
            'is_approved' => 'boolean',
            'inspection_date' => 'datetime',
            'approved_at' => 'datetime',
            'published_at' => 'datetime',
            'sold_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function ($model) {
            if (empty($model->uuid)) {
                $model->uuid = (string) \Illuminate\Support\Str::uuid();
            }
            // Auto-sync legacy strings from taxonomy FKs so old filters keep working.
            if (!empty($model->brand_id) && empty($model->brand)) {
                $model->brand = Brand::whereKey($model->brand_id)->value('name') ?? $model->brand;
            }
            if (!empty($model->model_id) && empty($model->model)) {
                $model->model = CarModel::whereKey($model->model_id)->value('name') ?? $model->model;
            }
        });

        static::updating(function ($model) {
            if ($model->isDirty('brand_id') && !empty($model->brand_id)) {
                $name = Brand::whereKey($model->brand_id)->value('name');
                if ($name) {
                    $model->brand = $name;
                }
            }
            if ($model->isDirty('model_id') && !empty($model->model_id)) {
                $name = CarModel::whereKey($model->model_id)->value('name');
                if ($name) {
                    $model->model = $name;
                }
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

    public function seller(): BelongsTo
    {
        return $this->belongsTo(User::class, 'seller_id');
    }

    public function brandRef(): BelongsTo
    {
        return $this->belongsTo(Brand::class, 'brand_id');
    }

    public function carModel(): BelongsTo
    {
        return $this->belongsTo(CarModel::class, 'model_id');
    }

    public function inspector(): BelongsTo
    {
        return $this->belongsTo(User::class, 'inspector_id');
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
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

    /** Public marketplace scope: approved active listings, newest first. */
    public function scopeListed(Builder $query): Builder
    {
        return $query->where('status', CarStatus::Active->value)
            ->where('is_approved', true)
            ->whereNotNull('published_at')
            ->orderByDesc('published_at');
    }

    public function scopePendingModeration(Builder $query): Builder
    {
        return $query->whereIn('status', [
            CarStatus::PendingInspection->value,
            CarStatus::Inspected->value,
            CarStatus::Draft->value,
        ])->orWhere('is_approved', false);
    }

    public function scopeOfSeller(Builder $query, int $sellerId): Builder
    {
        return $query->where('seller_id', $sellerId);
    }

    /** Shared marketplace filters (search, specs, ranges, sort). */
    public function scopeFilter(Builder $query, array $filters): Builder
    {
        $query
            ->when($filters['search'] ?? null, function (Builder $q, string $search) {
                $like = "%{$search}%";
                $q->where(fn (Builder $inner) => $inner
                    ->where('title', 'like', $like)
                    ->orWhere('brand', 'like', $like)
                    ->orWhere('model', 'like', $like));
            })
            ->when($filters['brand'] ?? null, fn (Builder $q, $v) => $q->where('brand', $v))
            ->when($filters['model'] ?? null, fn (Builder $q, $v) => $q->where('model', $v))
            ->when($filters['body_style'] ?? null, fn (Builder $q, $v) => $q->where('body_style', $v))
            ->when($filters['fuel_type'] ?? null, fn (Builder $q, $v) => $q->where('fuel_type', $v))
            ->when($filters['transmission'] ?? null, fn (Builder $q, $v) => $q->where('transmission', $v))
            ->when($filters['condition'] ?? null, fn (Builder $q, $v) => $q->where('condition', $v))
            ->when($filters['city'] ?? null, fn (Builder $q, $v) => $q->where('city', $v))
            ->when($filters['min_price'] ?? null, fn (Builder $q, $v) => $q->where('price', '>=', $v))
            ->when($filters['max_price'] ?? null, fn (Builder $q, $v) => $q->where('price', '<=', $v))
            ->when($filters['min_year'] ?? null, fn (Builder $q, $v) => $q->where('year', '>=', $v))
            ->when($filters['max_year'] ?? null, fn (Builder $q, $v) => $q->where('year', '<=', $v))
            ->when($filters['max_mileage'] ?? null, fn (Builder $q, $v) => $q->where('mileage_km', '<=', $v))
            ->when($filters['in_stock'] ?? null, fn (Builder $q) => $q->where('quantity', '>', 0));

        // Sorting (whitelisted — never raw user input into orderBy).
        match ($filters['sort'] ?? 'newest') {
            'price_asc' => $query->reorder()->orderBy('price'),
            'price_desc' => $query->reorder()->orderByDesc('price'),
            'mileage_asc' => $query->reorder()->orderBy('mileage_km'),
            'year_desc' => $query->reorder()->orderByDesc('year'),
            default => $query->reorder()->orderByDesc('published_at'),
        };

        return $query;
    }
}
