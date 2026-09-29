<?php

namespace App\Http\Requests\Chat;

use Illuminate\Foundation\Http\FormRequest;

class SendMessageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'body' => ['required', 'string', 'min:1', 'max:5000'],
            'listing_type' => ['nullable', 'string', 'in:car,part'],
            'listing_id' => ['nullable', 'integer'],
        ];
    }

    public function messages(): array
    {
        return [
            'body.required' => 'Message body cannot be empty.',
            'listing_type.in' => 'Listing type must be either car or part.',
        ];
    }
}
