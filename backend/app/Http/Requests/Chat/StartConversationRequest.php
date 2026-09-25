<?php

namespace App\Http\Requests\Chat;

use Illuminate\Foundation\Http\FormRequest;

class StartConversationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $currentUserId = $this->user()?->id;

        return [
            'recipient_id' => [
                'required',
                'integer',
                'exists:users,id',
                function ($attribute, $value, $fail) use ($currentUserId) {
                    if ((int) $value === (int) $currentUserId) {
                        $fail('You cannot start a conversation with yourself.');
                    }
                },
            ],
            'initial_message' => ['nullable', 'string', 'max:5000'],
            'listing_type' => ['nullable', 'string', 'in:car,part'],
            'listing_id' => ['nullable', 'integer'],
        ];
    }

    public function messages(): array
    {
        return [
            'recipient_id.required' => 'Recipient ID is required to start a conversation.',
            'recipient_id.exists' => 'The selected recipient user does not exist.',
            'listing_type.in' => 'Listing type must be either car or part.',
        ];
    }
}
