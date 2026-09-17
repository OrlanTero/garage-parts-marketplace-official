<?php

namespace App\Http\Requests\Car;

use App\Enums\BodyStyle;
use App\Enums\CarCondition;
use App\Enums\FuelType;
use App\Enums\Transmission;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCarRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasRole('seller', 'admin') ?? false;
    }

    public function rules(): array
    {
        $nextYear = (int) date('Y') + 1;

        return [
            'title' => ['required', 'string', 'max:255'],
            'brand' => ['required', 'string', 'max:80'],
            'model' => ['required', 'string', 'max:80'],
            'year' => ['required', 'integer', 'min:1900', "max:{$nextYear}"],
            'price' => ['required', 'numeric', 'min:0', 'max:9999999999.99'],
            'original_price' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:9999999999.99'],
            'mileage_km' => ['sometimes', 'integer', 'min:0', 'max:2000000'],
            'body_style' => ['sometimes', 'string', Rule::enum(BodyStyle::class)],
            'fuel_type' => ['sometimes', 'string', Rule::enum(FuelType::class)],
            'transmission' => ['sometimes', 'string', Rule::enum(Transmission::class)],
            'condition' => ['sometimes', 'string', Rule::enum(CarCondition::class)],
            'tag' => ['sometimes', 'nullable', 'string', 'max:100'],
            'color' => ['sometimes', 'nullable', 'string', 'max:50'],
            'vin' => ['sometimes', 'nullable', 'string', 'size:17', 'unique:cars,vin'],
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
