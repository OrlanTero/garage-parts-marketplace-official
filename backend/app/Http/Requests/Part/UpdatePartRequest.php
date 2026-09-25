<?php

namespace App\Http\Requests\Part;

use App\Enums\PartCategory;
use App\Enums\PartCondition;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdatePartRequest extends FormRequest
{
    public function authorize(): bool
    {
        $part = $this->route('part') ?? $this->route('id');

        if ($part && method_exists($part, 'getKey')) {
            return $this->user()?->can('update', $part) ?? false;
        }

        return (bool) $this->user();
    }

    public function rules(): array
    {
        return [
            // NOTE: status is NOT mass-assignable — use publish/unpublish/sold endpoints.
            'title' => ['sometimes', 'string', 'max:255'],
            'brand_id' => ['sometimes', 'nullable', 'integer', 'exists:brands,id'],
            'category_id' => ['sometimes', 'nullable', 'integer', 'exists:categories,id'],
            'subcategory_id' => ['sometimes', 'nullable', 'integer', 'exists:subcategories,id'],
            'compatible_model_ids' => ['sometimes', 'array'],
            'compatible_model_ids.*' => ['integer', 'exists:car_models,id'],
            'category' => ['sometimes', 'string', Rule::enum(PartCategory::class)],
            'brand' => ['sometimes', 'nullable', 'string', 'max:80'],
            'part_number' => ['sometimes', 'nullable', 'string', 'max:80'],
            'compatibility' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'condition' => ['sometimes', 'string', Rule::enum(PartCondition::class)],
            'tag' => ['sometimes', 'nullable', 'string', 'max:100'],
            'quantity' => ['sometimes', 'integer', 'min:0', 'max:1000000'],
            'price' => ['sometimes', 'numeric', 'min:0', 'max:9999999999.99'],
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
