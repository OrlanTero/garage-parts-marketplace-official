<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Car;
use App\Models\PlatformTransaction;
use App\Models\ShowroomSetting;
use App\Models\ShowroomSlot;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminShowroomController extends Controller
{
    /**
     * List showroom parking slot applications with filter and KPIs.
     */
    public function index(Request $request): JsonResponse
    {
        $status = $request->input('status', 'all');
        $search = $request->input('q') ?: $request->input('search');

        $query = ShowroomSlot::query()
            ->with([
                'seller:id,name,username,avatar_url,email,is_showroom_active',
                'car:id,uuid,title,brand,model,year,price,status,is_in_showroom,showroom_status',
                'approver:id,username',
            ]);

        if (!empty($status) && $status !== 'all') {
            $query->where('status', $status);
        }

        if (!empty($search)) {
            $like = "%{$search}%";
            $query->where(function (Builder $inner) use ($like) {
                $inner->where('payment_reference', 'like', $like)
                    ->orWhere('payment_method', 'like', $like)
                    ->orWhereHas('seller', fn ($s) => $s->where('username', 'like', $like)->orWhere('name', 'like', $like)->orWhere('email', 'like', $like))
                    ->orWhereHas('car', fn ($c) => $c->where('title', 'like', $like)->orWhere('brand', 'like', $like)->orWhere('model', 'like', $like));
            });
        }

        $slots = $query->latest()->get();

        // Admin KPI Stats
        $stats = [
            'total_applications' => ShowroomSlot::count(),
            'pending_applications' => ShowroomSlot::where('status', 'pending')->count(),
            'approved_slots' => ShowroomSlot::where('status', 'approved')->count(),
            'total_fees_collected' => (float) ShowroomSlot::where('status', 'approved')->sum('calculated_fee'),
            'active_showrooms_count' => User::where('is_showroom_active', true)->count(),
            'cars_on_floor' => Car::where('is_in_showroom', true)->count(),
            'parking_fee_percentage' => ShowroomSetting::getParkingFeePercentage(),
        ];

        return response()->json([
            'status' => 'success',
            'data' => $slots,
            'stats' => $stats,
        ]);
    }

    /**
     * Get configurable showroom parameters.
     */
    public function getSettings(): JsonResponse
    {
        return response()->json([
            'status' => 'success',
            'data' => [
                'parking_fee_percentage' => ShowroomSetting::getParkingFeePercentage(),
                'min_parking_fee' => (float) ShowroomSetting::getSetting('min_parking_fee', 5000.00),
                'showroom_enabled' => filter_var(ShowroomSetting::getSetting('showroom_enabled', 'true'), FILTER_VALIDATE_BOOLEAN),
            ],
        ]);
    }

    /**
     * Update configurable showroom parameters.
     */
    public function updateSettings(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'parking_fee_percentage' => ['required', 'numeric', 'min:0', 'max:100'],
            'min_parking_fee' => ['nullable', 'numeric', 'min:0'],
            'showroom_enabled' => ['nullable', 'boolean'],
        ]);

        ShowroomSetting::setSetting('parking_fee_percentage', (string) $validated['parking_fee_percentage'], 'Parking fee percentage charged on vehicle listing price.');

        if (isset($validated['min_parking_fee'])) {
            ShowroomSetting::setSetting('min_parking_fee', (string) $validated['min_parking_fee'], 'Minimum showroom parking fee in PHP.');
        }

        if (isset($validated['showroom_enabled'])) {
            ShowroomSetting::setSetting('showroom_enabled', $validated['showroom_enabled'] ? 'true' : 'false', 'Global showroom parking status toggle.');
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Showroom parking parameters updated successfully.',
            'data' => [
                'parking_fee_percentage' => ShowroomSetting::getParkingFeePercentage(),
                'min_parking_fee' => (float) ShowroomSetting::getSetting('min_parking_fee', 5000.00),
                'showroom_enabled' => filter_var(ShowroomSetting::getSetting('showroom_enabled', 'true'), FILTER_VALIDATE_BOOLEAN),
            ],
        ]);
    }

    /**
     * Approve showroom slot application, activate seller's showroom, and place car on floor.
     */
    public function approve(Request $request, ShowroomSlot $slot): JsonResponse
    {
        $slot->update([
            'status' => 'approved',
            'approved_at' => now(),
            'approved_by' => $request->user()->id,
            'admin_notes' => $request->input('admin_notes', $slot->admin_notes),
        ]);

        // Activate seller's showroom
        $seller = $slot->seller;
        if ($seller) {
            $seller->update([
                'is_showroom_active' => true,
                'showroom_activated_at' => $seller->showroom_activated_at ?? now(),
            ]);
        }

        // Place car in showroom
        $car = $slot->car;
        if ($car) {
            $car->update([
                'is_in_showroom' => true,
                'showroom_status' => 'approved',
            ]);
        }

        // Record or update Platform Transaction for Parking Fee
        $existingTxn = PlatformTransaction::where('showroom_slot_id', $slot->id)->first();
        if ($existingTxn) {
            $existingTxn->update([
                'status' => 'completed',
                'settled_at' => now(),
            ]);
        } else {
            PlatformTransaction::recordParkingFee($slot);
        }

        return response()->json([
            'status' => 'success',
            'message' => "Showroom slot #{$slot->id} approved. Seller @{$seller?->username} showroom activated and vehicle placed on the floor!",
            'data' => $slot->fresh(['seller', 'car', 'approver']),
        ]);
    }

    /**
     * Reject showroom slot application.
     */
    public function reject(Request $request, ShowroomSlot $slot): JsonResponse
    {
        $slot->update([
            'status' => 'rejected',
            'admin_notes' => $request->input('admin_notes', 'Application rejected by admin review.'),
        ]);

        if ($slot->car) {
            $slot->car->update([
                'showroom_status' => 'rejected',
                'is_in_showroom' => false,
            ]);
        }

        return response()->json([
            'status' => 'success',
            'message' => "Showroom slot application #{$slot->id} rejected.",
            'data' => $slot->fresh(['seller', 'car']),
        ]);
    }

    /**
     * Revoke an active showroom slot. The seller stays active only while
     * at least one other approved slot remains on the floor.
     */
    public function revoke(Request $request, ShowroomSlot $slot): JsonResponse
    {
        $slot->update([
            'status' => 'revoked',
            'admin_notes' => $request->input('admin_notes', 'Showroom slot revoked by admin.'),
        ]);

        if ($slot->car) {
            $slot->car->update([
                'is_in_showroom' => false,
                'showroom_status' => 'revoked',
            ]);
        }

        $this->refreshSellerFlag((int) $slot->seller_id, (int) $slot->id);

        return response()->json([
            'status' => 'success',
            'message' => "Showroom slot #{$slot->id} revoked. Vehicle removed from showroom floor.",
            'data' => $slot->fresh(['seller', 'car']),
        ]);
    }

    /**
     * A seller is showroom-active exactly while ≥1 approved slot (other
     * than the excluded one) remains. Keeps the header flag consistent
     * with the floor — the source of the NOT-ACTIVATED paradox.
     */
    private function refreshSellerFlag(int $sellerId, int $excludeSlotId): void
    {
        $stillActive = ShowroomSlot::where('seller_id', $sellerId)
            ->where('id', '!=', $excludeSlotId)
            ->where('status', 'approved')
            ->exists();

        \App\Models\User::whereKey($sellerId)->update([
            'is_showroom_active' => $stillActive,
        ]);
    }

    /**
     * Direct toggle for seller showroom activation.
     */
    public function toggleSellerShowroom(Request $request, User $seller): JsonResponse
    {
        $newState = !$seller->is_showroom_active;
        if ($request->has('is_active')) {
            $newState = filter_var($request->input('is_active'), FILTER_VALIDATE_BOOLEAN);
        }

        $seller->update([
            'is_showroom_active' => $newState,
            'showroom_activated_at' => $newState ? ($seller->showroom_activated_at ?? now()) : $seller->showroom_activated_at,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => "Seller @{$seller->username} showroom status set to " . ($newState ? 'ACTIVE' : 'INACTIVE') . '.',
            'data' => [
                'seller_id' => $seller->id,
                'username' => $seller->username,
                'is_showroom_active' => (bool) $seller->is_showroom_active,
            ],
        ]);
    }

    /**
     * Direct toggle for car placement on showroom floor.
     */
    public function toggleCarShowroom(Request $request, Car $car): JsonResponse
    {
        $newState = !$car->is_in_showroom;
        if ($request->has('is_in_showroom')) {
            $newState = filter_var($request->input('is_in_showroom'), FILTER_VALIDATE_BOOLEAN);
        }

        $car->update([
            'is_in_showroom' => $newState,
            'showroom_status' => $newState ? 'approved' : 'none',
        ]);

        // Keep the slot ledger consistent with the floor: unplacing
        // revokes the car's approved slot.
        if (!$newState) {
            ShowroomSlot::where('car_id', $car->id)
                ->where('status', 'approved')
                ->update(['status' => 'revoked']);
        }

        if ($newState && $car->seller) {
            $car->seller->update([
                'is_showroom_active' => true,
                'showroom_activated_at' => $car->seller->showroom_activated_at ?? now(),
            ]);
        } elseif (!$newState && $car->seller_id) {
            // Unplacing the last floor car deactivates the seller.
            $remaining = ShowroomSlot::where('seller_id', $car->seller_id)
                ->where('status', 'approved')
                ->exists();
            if (!$remaining) {
                \App\Models\User::whereKey($car->seller_id)->update(['is_showroom_active' => false]);
            }
        }

        return response()->json([
            'status' => 'success',
            'message' => "Vehicle '{$car->title}' " . ($newState ? 'PLACED ON' : 'REMOVED FROM') . ' showroom floor.',
            'data' => [
                'car_id' => $car->id,
                'title' => $car->title,
                'is_in_showroom' => (bool) $car->is_in_showroom,
                'showroom_status' => $car->showroom_status,
            ],
        ]);
    }
}
