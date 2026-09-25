<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class CarModel extends Model
{
    protected $fillable = [
        'brand_id', 'name', 'slug', 'chassis_code', 'years_label',
        'year_from', 'year_to', 'engines', 'description', 'is_active', 'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'engines' => 'array',
            'year_from' => 'integer',
            'year_to' => 'integer',
            'is_active' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (CarModel $model) {
            if (empty($model->slug) && !empty($model->name)) {
                $model->slug = Str::slug($model->name);
            }
        });
    }

    public function brand(): BelongsTo
    {
        return $this->belongsTo(Brand::class);
    }

    public function cars(): HasMany
    {
        return $this->hasMany(Car::class);
    }

    /** Parts verified compatible with this model (fitment pivot). */
    public function compatibleParts(): BelongsToMany
    {
        return $this->belongsToMany(Part::class, 'car_model_part')->withTimestamps();
    }
}
