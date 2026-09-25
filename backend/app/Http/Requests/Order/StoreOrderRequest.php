<?php

namespace App\Http\Requests\Order;

use Illuminate\Foundation\Http\FormRequest;

class StoreOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            // Customer & Delivery Information
            'buyer_name' => ['required', 'string', 'max:255'],
            'buyer_email' => ['required', 'email', 'max:255'],
            'buyer_phone' => ['nullable', 'string', 'max:50'],
            'shipping_address' => ['required', 'string', 'max:500'],
            'shipping_city' => ['nullable', 'string', 'max:120'],
            'shipping_postal_code' => ['nullable', 'string', 'max:30'],

            // Optional delivery pinpoint (also settable later on the sales order).
            'delivery_latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'delivery_longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'delivery_label' => ['nullable', 'string', 'max:500'],

            // Vehicle Fitment & Identification Details.
            // Mandatory for PART orders (buyer's vehicle must match the part).
            // Excluded for CAR orders (the purchased vehicle speaks for itself —
            // its own VIN is recorded automatically from the listing).
            'chassis_number' => ['exclude_if:item_type,car', 'required', 'string', 'min:3', 'max:100'],
            'vin' => ['exclude_if:item_type,car', 'required', 'string', 'min:3', 'max:100'],
            'vehicle_make_model' => ['nullable', 'string', 'max:255'],

            // Sales Agent & Referral Tracking
            'agent_code' => ['nullable', 'string', 'max:50'],
            'ref' => ['nullable', 'string', 'max:50'],

            // Item Information
            'part_id' => ['nullable', 'integer', 'exists:parts,id'],
            'car_id' => ['nullable', 'integer', 'exists:cars,id'],
            'item_type' => ['nullable', 'string', 'in:part,car,general'],
            'item_name' => ['nullable', 'string', 'max:255'],
            'item_sku' => ['nullable', 'string', 'max:100'],
            'quantity' => ['nullable', 'integer', 'min:1', 'max:100'],
            'payment_method' => ['nullable', 'string', 'max:50'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }

    public function messages(): array
    {
        return [
            'chassis_number.required' => 'Vehicle Chassis Number is required for fitment verification and sales order generation.',
            'vin.required' => 'Vehicle Identification Number (VIN) is required for sales order serialization.',
            'shipping_address.required' => 'A delivery destination address is required.',
        ];
    }
}
