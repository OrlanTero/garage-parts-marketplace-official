<?php

namespace App\Enums;

enum BodyStyle: string
{
    case Sedan = 'sedan';
    case Hatchback = 'hatchback';
    case Suv = 'suv';
    case Crossover = 'crossover';
    case Coupe = 'coupe';
    case Convertible = 'convertible';
    case Pickup = 'pickup';
    case Van = 'van';
    case Wagon = 'wagon';
    case Other = 'other';
}
