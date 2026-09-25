<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Supplier extends Model
{
    protected $fillable = [
        'owner_id', 'name', 'contact_person', 'email', 'phone',
        'address', 'city', 'lead_time_days', 'notes', 'is_active',
    ];

    protected function casts(): array
    {
        return ['lead_time_days' => 'integer', 'is_active' => 'boolean'];
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function partLinks(): HasMany
    {
        return $this->hasMany(PartSupplier::class);
    }
}
