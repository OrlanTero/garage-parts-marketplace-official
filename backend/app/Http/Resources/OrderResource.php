<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OrderResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     * Includes vehicle chassis number and VIN in the generated sales order payload.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'order_number' => $this->order_number,
            'status' => $this->status,
            'status_label' => ucfirst($this->status),
            'status_variant' => match ($this->status) {
                'processing' => 'rust',
                'confirmed' => 'info',
                'shipped' => 'warning',
                'delivered' => 'success',
                'cancelled' => 'danger',
                default => 'secondary',
            },

            // Buyer Information
            'buyer' => [
                'name' => $this->buyer_name,
                'email' => $this->buyer_email,
                'phone' => $this->buyer_phone,
                'shipping_address' => $this->shipping_address,
                'city' => $this->shipping_city,
                'postal_code' => $this->shipping_postal_code,
                'full_address' => implode(', ', array_filter([
                    $this->shipping_address,
                    $this->shipping_city,
                    $this->shipping_postal_code,
                ])),
            ],

            // Vehicle Fitment & Identification Details (Mandatory Sales Order Fields)
            'vehicle' => [
                'chassis_number' => $this->chassis_number,
                'vin' => $this->vin,
                'make_model' => $this->vehicle_make_model,
                'verified' => true,
            ],
            // Direct aliases for easy top-level access
            'chassis_number' => $this->chassis_number,
            'vin' => $this->vin,
            'vehicle_make_model' => $this->vehicle_make_model,
            'agent_code' => $this->agent_code,
            'agent_name' => $this->agent_name,
            'commission_amount' => (float) ($this->commission_amount ?? 0.00),

            // Seller verification lifecycle (multi-request queue per listing).
            // Payment & fulfillment unlock only after acceptance.
            'verification_status' => $this->verification_status ?? 'pending',
            'verification_label' => match ($this->verification_status ?? 'pending') {
                'accepted' => 'Verified & Accepted',
                'rejected' => 'Declined by Seller',
                default => 'Awaiting Seller Verification',
            },
            'verification_note' => $this->verification_note,

            // Precise delivery pinpoint (parts freight, set after acceptance).
            'delivery' => [
                'latitude' => $this->delivery_latitude !== null ? (float) $this->delivery_latitude : null,
                'longitude' => $this->delivery_longitude !== null ? (float) $this->delivery_longitude : null,
                'label' => $this->delivery_label,
                'has_pin' => $this->delivery_latitude !== null && $this->delivery_longitude !== null,
            ],

            // Sales Agent & Referral Partner Information
            'agent' => $this->agent_code ? [
                'id' => $this->agent_id,
                'code' => $this->agent_code,
                'name' => $this->agent_name ?? 'Affiliate Sales Partner',
                'commission_rate' => (float) ($this->commission_rate ?? 5.00),
                'commission_amount' => (float) ($this->commission_amount ?? 0.00),
                'formatted_commission_amount' => '₱ ' . number_format((float) ($this->commission_amount ?? 0.00), 2),
                'commission_status' => $this->commission_status ?? 'pending',
            ] : null,

            // Item Details
            'item' => [
                'type' => $this->item_type,
                'part_id' => $this->part_id,
                'car_id' => $this->car_id,
                'name' => $this->item_name,
                'sku' => $this->item_sku,
                'image_url' => $this->item_image_url,
                'seller_name' => $this->seller_name,
            ],

            // Financial Breakdown
            'financials' => [
                'quantity' => $this->quantity,
                'unit_price' => (float) $this->unit_price,
                'formatted_unit_price' => '₱ ' . number_format((float) $this->unit_price, 2),
                'shipping_fee' => (float) $this->shipping_fee,
                'formatted_shipping_fee' => $this->shipping_fee > 0 ? '₱ ' . number_format((float) $this->shipping_fee, 2) : 'FREE',
                'total_amount' => (float) $this->total_amount,
                'formatted_total' => '₱ ' . number_format((float) $this->total_amount, 2),
                'payment_method' => $this->payment_method,
                'payment_status' => $this->payment_status,
            ],

            // Line items array format for admin tables & multi-item compatibility
            'items' => [
                [
                    'name' => $this->item_name,
                    'sku' => $this->item_sku ?? 'GP-ITEM-' . $this->id,
                    'qty' => $this->quantity,
                    'price' => '₱ ' . number_format((float) $this->unit_price, 2),
                    'total' => '₱ ' . number_format((float) ($this->unit_price * $this->quantity), 2),
                ]
            ],

            'shipping_address' => $this->shipping_address,
            'tracking_number' => $this->tracking_number,
            'carrier' => $this->carrier,
            'notes' => $this->notes,
            'placed_at' => $this->created_at?->format('Y-m-d h:i A'),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
