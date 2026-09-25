<?php

namespace App\Http\Controllers\Api;

use App\Enums\CarStatus;
use App\Enums\PartStatus;
use App\Http\Controllers\Controller;
use App\Models\Car;
use App\Models\Part;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Seller storefront overview — per-status inventory counts across the
 * seller's own cars and parts, including pending moderation states.
 */
class SellerDashboardController extends Controller
{
    public function summary(Request $request): JsonResponse
    {
        $userId = (int) $request->user()->id;

        $carCounts = Car::query()
            ->ofSeller($userId)
            ->selectRaw('status, COUNT(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status')
            ->all();

        $partCounts = Part::query()
            ->ofSeller($userId)
            ->selectRaw('status, COUNT(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status')
            ->all();

        $cars = [];
        foreach (CarStatus::cases() as $case) {
            $cars[$case->value] = (int) ($carCounts[$case->value] ?? 0);
        }

        $parts = [];
        foreach (PartStatus::cases() as $case) {
            $parts[$case->value] = (int) ($partCounts[$case->value] ?? 0);
        }

        return response()->json([
            'cars' => $cars + ['total' => array_sum($cars)],
            'parts' => $parts + ['total' => array_sum($parts)],
            'pending_moderation' => ($cars[CarStatus::PendingInspection->value] ?? 0)
                + ($cars[CarStatus::Inspected->value] ?? 0),
        ]);
    }
}
