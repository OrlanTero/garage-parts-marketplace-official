<?php

namespace App\Http\Controllers\Api;

use App\Enums\CarStatus;
use App\Http\Controllers\Controller;
use App\Models\Car;
use App\Models\ShowroomSetting;
use App\Models\ShowroomSlot;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SellerShowroomController extends Controller
{
    /**
     * Get seller's showroom status, fee configuration, cars, and application history.
     */
    public function status(Request $request): JsonResponse
    {
        $seller = $request->user();
        $feeConfig = [
            'parking_fee_percentage' => ShowroomSetting::getParkingFeePercentage(),
            'min_parking_fee' => (float) ShowroomSetting::getSetting('min_parking_fee', 5000.00),
            'showroom_enabled' => filter_var(ShowroomSetting::getSetting('showroom_enabled', 'true'), FILTER_VALIDATE_BOOLEAN),
        ];

        // Seller's active cars with calculated fee for each
        $cars = Car::query()
            ->where('seller_id', $seller->id)
            ->where('status', CarStatus::Active->value)
            ->with('media')
            ->latest()
            ->get()
            ->map(function ($car) use ($feeConfig) {
                $calc = ShowroomSetting::calculateParkingFee((float) $car->price);
                return [
                    'id' => $car->id,
                    'uuid' => $car->uuid,
                    'title' => $car->title,
                    'brand' => $car->brand,
                    'model' => $car->model,
                    'year' => $car->year,
                    'price' => (float) $car->price,
                    'is_in_showroom' => (bool) $car->is_in_showroom,
                    'showroom_status' => $car->showroom_status ?? 'none',
                    'primary_image_url' => $car->primary_image_url,
                    'calculated_fee' => $calc['calculated_fee'],
                    'fee_percentage' => $calc['fee_percentage'],
                ];
            });

        // Showroom application history
        $slots = ShowroomSlot::query()
            ->where('seller_id', $seller->id)
            ->with(['car:id,uuid,title,brand,model,year,price'])
            ->latest()
            ->get();

        // Resilient read: active if the flag says so OR any approved slot
        // is on the floor (covers seeded / directly-written slots whose
        // seller flag was never flipped).
        $hasFloorSlot = $slots->contains(fn ($slot) => $slot->status === 'approved');

        return response()->json([
            'status' => 'success',
            'data' => [
                'is_showroom_active' => (bool) $seller->is_showroom_active || $hasFloorSlot,
                'showroom_activated_at' => $seller->showroom_activated_at,
                'fee_config' => $feeConfig,
                'cars' => $cars,
                'applications' => $slots,
            ],
        ]);
    }

    /**
     * Calculate parking fee breakdown for a specific car or price.
     */
    public function calculateFee(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'car_id' => ['nullable', 'integer', 'exists:cars,id'],
            'price' => ['nullable', 'numeric', 'min:0'],
        ]);

        $price = 0;
        if (!empty($validated['car_id'])) {
            $car = Car::where('id', $validated['car_id'])->where('seller_id', $request->user()->id)->firstOrFail();
            $price = (float) $car->price;
        } elseif (isset($validated['price'])) {
            $price = (float) $validated['price'];
        }

        $calc = ShowroomSetting::calculateParkingFee($price);

        return response()->json([
            'status' => 'success',
            'data' => $calc,
        ]);
    }

    /**
     * Apply for a showroom parking slot for a vehicle build.
     */
    public function apply(Request $request): JsonResponse
    {
        $seller = $request->user();

        $validated = $request->validate([
            'car_id' => ['required', 'integer', 'exists:cars,id'],
            'payment_method' => ['required', 'string', 'in:gcash,bank_transfer,maya,cash_dropoff'],
            'payment_reference' => ['nullable', 'string', 'max:120'],
            'payment_proof_url' => ['nullable', 'string', 'max:2048'],
            'seller_notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $car = Car::where('id', $validated['car_id'])
            ->where('seller_id', $seller->id)
            ->firstOrFail();

        // Check if car already has an approved slot or pending application
        $existing = ShowroomSlot::where('car_id', $car->id)
            ->whereIn('status', ['pending', 'approved'])
            ->first();

        if ($existing) {
            if ($existing->status === 'approved') {
                return response()->json([
                    'status' => 'error',
                    'message' => 'This vehicle already has an approved and active showroom parking slot.',
                ], 422);
            }
            return response()->json([
                'status' => 'error',
                'message' => 'There is already a pending showroom parking application for this vehicle.',
            ], 422);
        }

        $calc = ShowroomSetting::calculateParkingFee((float) $car->price);

        $slot = ShowroomSlot::create([
            'seller_id' => $seller->id,
            'car_id' => $car->id,
            'car_price' => $calc['car_price'],
            'fee_percentage' => $calc['fee_percentage'],
            'calculated_fee' => $calc['calculated_fee'],
            'payment_method' => $validated['payment_method'],
            'payment_reference' => $validated['payment_reference'] ?? null,
            'payment_proof_url' => $validated['payment_proof_url'] ?? null,
            'seller_notes' => $validated['seller_notes'] ?? null,
            'status' => 'pending',
        ]);

        $car->update([
            'showroom_status' => 'pending',
        ]);

        return response()->json([
            'status' => 'success',
            'message' => "Showroom parking application for {$car->title} submitted successfully! Awaiting admin review.",
            'data' => $slot->load('car'),
        ], 201);
    }
}
