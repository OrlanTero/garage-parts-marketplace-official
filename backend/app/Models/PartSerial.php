<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PartSerial extends Model
{
    public const STATUSES = ['in_stock', 'reserved', 'sold', 'damaged'];

    protected $fillable = [
        'part_id', 'serial', 'status', 'warehouse_id', 'bin_id',
    ];

    public function part(): BelongsTo
    {
        return $this->belongsTo(Part::class);
    }

    public function warehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class);
    }

    public function bin(): BelongsTo
    {
        return $this->belongsTo(Bin::class);
    }
}
