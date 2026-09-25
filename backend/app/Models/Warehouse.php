<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Warehouse extends Model
{
    protected $fillable = [
        'owner_id', 'name', 'code', 'address', 'city', 'is_default', 'is_active',
    ];

    protected function casts(): array
    {
        return ['is_default' => 'boolean', 'is_active' => 'boolean'];
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function bins(): HasMany
    {
        return $this->hasMany(Bin::class)->orderBy('code');
    }

    public function movements(): HasMany
    {
        return $this->hasMany(StockMovement::class);
    }
}
