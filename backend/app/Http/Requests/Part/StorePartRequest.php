<?php

namespace App\Http\Requests\Part;

use App\Enums\PartCategory;
use App\Enums\PartCondition;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePartRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasRole('seller', 'parts_seller', 'dealer', 'admin') ?? false;
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'category' => ['required', 'string', Rule::enum(PartCategory::class)],
            'brand' => ['sometimes', 'nullable', 'string', 'max:80'],
            'part_number' => ['sometimes', 'nullable', 'string', 'max:80'],
            'compatibility' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'condition' => ['sometimes', 'string', Rule::enum(PartCondition::class)],
            'tag' => ['sometimes', 'nullable', 'string', 'max:100'],
            'quantity' => ['sometimes', 'integer', 'min:0', 'max:1000000'],
            'price' => ['required', 'numeric', 'min:0', 'max:9999999999.99'],
            'original_price' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:9999999999.99'],
            'free_shipping' => ['sometimes', 'boolean'],
            'description' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'city' => ['sometimes', 'nullable', 'string', 'max:120'],
            'location' => ['sometimes', 'nullable', 'string', 'max:120'],
            'rating' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:5'],
            'reviews_count' => ['sometimes', 'integer', 'min:0'],
            'images' => ['sometimes', 'array'],
            'media' => ['sometimes', 'array'],
        ];
    }
}
