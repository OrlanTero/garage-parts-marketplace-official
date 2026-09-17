<?php

namespace App\Enums;

/**
 * Account type chosen at registration / OAuth signup.
 * Only buyer + seller are user-facing; admin is reserved for ops.
 */
enum UserRole: string
{
    case Buyer = 'buyer';
    case Seller = 'seller';
    case Admin = 'admin';

    /** Roles a new user is allowed to self-select. */
    public static function selfSelectable(): array
    {
        return [self::Buyer->value, self::Seller->value];
    }
}
