<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ShowroomSetting extends Model
{
    protected $fillable = [
        'key',
        'value',
        'description',
    ];

    public static function getSetting(string $key, mixed $default = null): mixed
    {
        $setting = static::where('key', $key)->first();
        return $setting ? $setting->value : $default;
    }

    public static function setSetting(string $key, mixed $value, ?string $description = null): static
    {
        return static::updateOrCreate(
            ['key' => $key],
            [
                'value' => (string) $value,
                'description' => $description ?? static::where('key', $key)->value('description'),
            ]
        );
    }

    public static function getParkingFeePercentage(): float
    {
        return (float) static::getSetting('parking_fee_percentage', 5.00);
    }

    public static function calculateParkingFee(float $carPrice): array
    {
        $percentage = static::getParkingFeePercentage();
        $minFee = (float) static::getSetting('min_parking_fee', 5000.00);
        $rawFee = round($carPrice * ($percentage / 100), 2);
        $finalFee = max($minFee, $rawFee);

        return [
            'car_price' => $carPrice,
            'fee_percentage' => $percentage,
            'min_fee' => $minFee,
            'calculated_fee' => $finalFee,
        ];
    }
}
