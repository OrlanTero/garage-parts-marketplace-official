<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StockMovement extends Model
{
    public const TYPES = [
        'receipt', 'issue', 'transfer_in', 'transfer_out', 'adjustment',
        'return', 'reservation', 'release', 'consumption', 'damage', 'count',
    ];

    /** Movement types that change on-hand quantity (vs memo/reserve-only). */
    public const ON_HAND_TYPES = [
        'receipt', 'issue', 'transfer_in', 'transfer_out',
        'adjustment', 'return', 'consumption', 'damage', 'count',
    ];

    protected $fillable = [
        'part_id', 'warehouse_id', 'bin_id', 'type', 'quantity_change',
        'quantity_after', 'unit_cost', 'reference', 'reason', 'user_id',
    ];

    protected function casts(): array
    {
        return [
            'quantity_change' => 'integer',
            'quantity_after' => 'integer',
            'unit_cost' => 'decimal:2',
        ];
    }

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

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
