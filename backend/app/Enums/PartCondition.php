<?php

namespace App\Enums;

enum PartCondition: string
{
    case New = 'new';
    case Used = 'used';
    case Refurbished = 'refurbished';
}
