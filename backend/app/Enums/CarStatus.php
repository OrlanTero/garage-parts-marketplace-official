<?php

namespace App\Enums;

/**
 * Listing lifecycle for a car.
 * Only `active` cars appear on the public marketplace.
 */
enum CarStatus: string
{
    case Draft = 'draft';
    case PendingInspection = 'pending_inspection';
    case Inspected = 'inspected';
    case Active = 'active';
    case Rejected = 'rejected';
    case Sold = 'sold';
    case Archived = 'archived';

    public function isListable(): bool
    {
        return $this === self::Active;
    }
}
