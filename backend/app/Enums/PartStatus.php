<?php

namespace App\Enums;

/**
 * Listing lifecycle for a part.
 * Only `active` parts appear on the public marketplace.
 */
enum PartStatus: string
{
    case Draft = 'draft';
    case Active = 'active';
    case Sold = 'sold';
    case Archived = 'archived';

    public function isListable(): bool
    {
        return $this === self::Active;
    }
}
