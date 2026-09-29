<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PartSupplier extends Model
{
    protected $fillable = [
        'part_id', 'supplier_id', 'supplier_sku', 'cost_price',
        'lead_time_days', 'moq', 'is_preferred',
    ];

    protected function casts(): array
    {
        return [
            'cost_price' => 'decimal:2',
            'lead_time_days' => 'integer',
            'moq' => 'integer',
            'is_preferred' => 'boolean',
        ];
    }

    public function part(): BelongsTo
    {
        return $this->belongsTo(Part::class);
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }
}
