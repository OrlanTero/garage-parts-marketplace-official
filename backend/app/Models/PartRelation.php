<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PartRelation extends Model
{
    public const TYPES = ['compatible', 'substitute', 'superseded_by', 'interchangeable', 'component'];

    protected $fillable = [
        'part_id', 'related_part_id', 'relation_type', 'quantity', 'notes',
    ];

    protected function casts(): array
    {
        return ['quantity' => 'decimal:3'];
    }

    public function part(): BelongsTo
    {
        return $this->belongsTo(Part::class, 'part_id');
    }

    public function relatedPart(): BelongsTo
    {
        return $this->belongsTo(Part::class, 'related_part_id');
    }
}
