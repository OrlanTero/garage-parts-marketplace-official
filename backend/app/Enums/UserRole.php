<?php

namespace App\Enums;

/**
 * Account types in Garage Parts Marketplace.
 * Buyer, Seller, Dealer, and Parts Seller are user-facing; Admin is reserved for ops.
 */
enum UserRole: string
{
    case Buyer = 'buyer';
    case Seller = 'seller';
    case Dealer = 'dealer';
    case PartsSeller = 'parts_seller';
    case Admin = 'admin';

    /** Roles a new user is allowed to self-select. */
    public static function selfSelectable(): array
    {
        return [
            self::Buyer->value,
            self::Seller->value,
            self::Dealer->value,
            self::PartsSeller->value,
        ];
    }
}
