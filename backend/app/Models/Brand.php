<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Brand extends Model
{
    protected $fillable = [
        'name', 'slug', 'country', 'region', 'logo_url', 'is_active', 'sort_order',
    ];

    protected function casts(): array
    {
        return ['is_active' => 'boolean', 'sort_order' => 'integer'];
    }

    protected static function booted(): void
    {
        static::creating(function (Brand $brand) {
            if (empty($brand->slug) && !empty($brand->name)) {
                $brand->slug = Str::slug($brand->name);
            }
        });

        static::updating(function (Brand $brand) {
            if (empty($brand->slug) && !empty($brand->name)) {
                $brand->slug = Str::slug($brand->name);
            }
        });
    }

    public function carModels(): HasMany
    {
        return $this->hasMany(CarModel::class)->orderBy('sort_order')->orderBy('name');
    }

    public function cars(): HasMany
    {
        return $this->hasMany(Car::class);
    }

    public function parts(): HasMany
    {
        return $this->hasMany(Part::class);
    }
}
