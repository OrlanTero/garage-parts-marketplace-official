<?php

namespace App\Enums;

/**
 * Lifecycle of a buyer-to-seller upgrade request.
 * pending -> approved | rejected | withdrawn (applicant cancels).
 * Rejected/withdrawn applicants may submit a fresh application.
 */
enum SellerApplicationStatus: string
{
    case Pending = 'pending';
    case Approved = 'approved';
    case Rejected = 'rejected';
    case Withdrawn = 'withdrawn';

    public function isFinal(): bool
    {
        return $this !== self::Pending;
    }
}
