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
            // Listing-focused inbox: every conversation must belong to a listing.
            'listing_type' => ['required', 'string', 'in:car,part'],
            'listing_id' => ['required', 'integer'],
        ];
    }

    public function messages(): array
    {
        return [
            'recipient_id.required' => 'Recipient ID is required to start a conversation.',
            'recipient_id.exists' => 'The selected recipient user does not exist.',
            'listing_type.required' => 'A listing is required — conversations are per listing.',
            'listing_id.required' => 'A listing is required — conversations are per listing.',
            'listing_type.in' => 'Listing type must be either car or part.',
        ];
    }
}
