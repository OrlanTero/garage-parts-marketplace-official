<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Car;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminAppointmentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $type = $request->query('type'); // garage_dropoff | onsite_visit | all
        $status = $request->query('status'); // scheduled | passed | failed | all

        $query = Car::query()
            ->whereNotNull('inspection_type')
            ->with(['seller:id,name,email,role', 'inspector:id,name', 'media'])
            ->when($type && $type !== 'all', fn ($q) => $q->where('inspection_type', $type))
            ->when($status && $status !== 'all', fn ($q) => $q->where('inspection_status', $status))
            ->orderByDesc('inspection_date');

        $appointments = $query->paginate((int) ($request->query('per_page', 25)));

        $data = collect($appointments->items())->map(function ($car) {
            return [
                'id' => $car->id,
                'car_id' => $car->id,
                'car_title' => $car->title,
                'car_brand' => $car->brand,
                'car_model' => $car->model,
                'vin' => $car->vin,
                'seller_id' => $car->seller_id,
                'seller_name' => $car->seller?->name ?? 'Unknown Seller',
                'seller_email' => $car->seller?->email,
                'inspection_type' => $car->inspection_type,
                'inspection_status' => $car->inspection_status,
                'inspection_date' => $car->inspection_date?->toISOString() ?? $car->inspection_date,
                'inspection_location' => $car->inspection_location,
                'inspector_id' => $car->inspector_id,
                'inspector_name' => $car->inspector?->name ?? 'Unassigned Inspector',
                'inspector_notes' => $car->inspector_notes,
                'inspection_score' => $car->inspection_score,
                'primary_image_url' => $car->primary_image_url,
                'created_at' => $car->created_at?->toISOString(),
            ];
        });

        return response()->json([
            'data' => $data,
            'meta' => [
                'current_page' => $appointments->currentPage(),
                'last_page' => $appointments->lastPage(),
                'per_page' => $appointments->perPage(),
                'total' => $appointments->total(),
            ],
        ]);
    }
}
