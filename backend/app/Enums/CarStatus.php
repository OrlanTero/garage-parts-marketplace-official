<?php

namespace App\Enums;

/**
 * Listing lifecycle for a car.
 * Only `active` cars appear on the public marketplace.
 */
enum CarStatus: string
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
