<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Bin extends Model
{
    protected $fillable = [
        'warehouse_id', 'code', 'zone', 'rack', 'shelf', 'name', 'capacity', 'is_active',
    ];

    protected function casts(): array
    {
        return ['capacity' => 'integer', 'is_active' => 'boolean'];
    }

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class);
    }

    /** Full hierarchical path: Warehouse → Zone → Rack → Shelf → Bin. */
    public function getPathAttribute(): string
    {
        return implode(' / ', array_filter([
            $this->warehouse?->code ?? $this->warehouse?->name,
            $this->zone ? "Z:{$this->zone}" : null,
            $this->rack ? "R:{$this->rack}" : null,
            $this->shelf ? "S:{$this->shelf}" : null,
            $this->code,
        ]));
    }
}
