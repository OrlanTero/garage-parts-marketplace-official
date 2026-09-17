<?php

namespace App\Http\Requests\Car;

use App\Enums\BodyStyle;
use App\Enums\CarCondition;
use App\Enums\FuelType;
use App\Enums\Transmission;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateCarRequest extends FormRequest
{
    public function authorize(): bool
    {
        $car = $this->route('car') ?? $this->route('id');

        if ($car && method_exists($car, 'getKey')) {
            return $this->user()?->can('update', $car) ?? false;
        }

        return (bool) $this->user();
    }

    public function rules(): array
    {
        $nextYear = (int) date('Y') + 1;
        $carId = $this->route('car')?->id ?? $this->route('id');

        return [
            // NOTE: status is NOT mass-assignable — use publish/unpublish/sold endpoints.
            'title' => ['sometimes', 'string', 'max:255'],
            'brand' => ['sometimes', 'string', 'max:80'],
            'model' => ['sometimes', 'string', 'max:80'],
            'year' => ['sometimes', 'integer', 'min:1900', "max:{$nextYear}"],
            'price' => ['sometimes', 'numeric', 'min:0', 'max:9999999999.99'],
            'original_price' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:9999999999.99'],
            'mileage_km' => ['sometimes', 'integer', 'min:0', 'max:2000000'],
            'body_style' => ['sometimes', 'string', Rule::enum(BodyStyle::class)],
            'fuel_type' => ['sometimes', 'string', Rule::enum(FuelType::class)],
            'transmission' => ['sometimes', 'string', Rule::enum(Transmission::class)],
            'condition' => ['sometimes', 'string', Rule::enum(CarCondition::class)],
            'tag' => ['sometimes', 'nullable', 'string', 'max:100'],
            'color' => ['sometimes', 'nullable', 'string', 'max:50'],
            'vin' => ['sometimes', 'nullable', 'string', 'size:17', Rule::unique('cars', 'vin')->ignore($carId)],
            'description' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'city' => ['sometimes', 'nullable', 'string', 'max:120'],
            'location' => ['sometimes', 'nullable', 'string', 'max:120'],
            'rating' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:5'],
            'inspection_score' => ['sometimes', 'nullable', 'string', 'max:30'],
            'images' => ['sometimes', 'array'],
            'media' => ['sometimes', 'array'],
        ];
    }
}
