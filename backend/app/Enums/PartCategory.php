<?php

namespace App\Enums;

enum PartCategory: string
{
    case Engine = 'engine';
    case Transmission = 'transmission';
    case Suspension = 'suspension';
    case Brakes = 'brakes';
    case Electrical = 'electrical';
    case TiresWheels = 'tires_wheels';
    case BodyExterior = 'body_exterior';
    case Interior = 'interior';
    case FluidsLubricants = 'fluids_lubricants';
    case Accessories = 'accessories';
    case Other = 'other';
}
