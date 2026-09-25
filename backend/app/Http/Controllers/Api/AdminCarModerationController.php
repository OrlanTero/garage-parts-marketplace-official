<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CarResource;
use App\Models\Car;
use App\Services\CarService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminCarModerationController extends Controller
{
    public function __construct(private CarService $cars) {}

    public function index(Request $request)
    {
        $status = $request->query('status');
        $inspectionStatus = $request->query('inspection_status');
        $search = $request->query('q');

        $query = Car::query()
            ->with(['seller:id,name,email,role', 'inspector:id,name', 'approver:id,name', 'media'])
            ->when($status && $status !== 'all', fn ($q) => $q->where('status', $status))
            ->when($inspectionStatus && $inspectionStatus !== 'all', fn ($q) => $q->where('inspection_status', $inspectionStatus))
            ->when($request->boolean('mine'), fn ($q) => $q->where('inspector_id', $request->user()->id))
            ->when($request->boolean('unassigned'), fn ($q) => $q->whereNull('inspector_id'))
            ->when($search, function ($q, $s) {
                $q->where(fn ($sub) => $sub->where('title', 'like', "%{$s}%")
                    ->orWhere('brand', 'like', "%{$s}%")
                    ->orWhere('model', 'like', "%{$s}%")
                    ->orWhere('vin', 'like', "%{$s}%")
                );
            })
            ->orderByDesc('updated_at');

        return CarResource::collection($query->paginate((int) ($request->query('per_page', 20))));
    }

    public function scheduleInspection(Request $request, Car $car): JsonResponse
    {
        $validated = $request->validate([
            'inspection_type' => ['required', 'string', 'in:garage_dropoff,onsite_visit'],
            'inspection_date' => ['nullable', 'date'],
            'inspection_location' => ['nullable', 'string', 'max:255'],
            'inspector_id' => [
                'nullable',
                'integer',
                'exists:users,id',
                // Assignees must be staff — never buyers/sellers/dealers.
                function ($attribute, $value, $fail) {
                    $assignee = \App\Models\User::find($value);
                    $role = $assignee?->role instanceof \App\Enums\UserRole ? $assignee->role->value : $assignee?->role;
                    if (!$assignee || !in_array($role, ['admin', 'super_admin', 'inspector'], true)) {
                        $fail('The selected inspector must be a staff member (admin or inspector).');
                    }
                },
            ],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);

        $updatedCar = $this->cars->scheduleInspection($car, $validated, $request->user());

        return (new CarResource($updatedCar))->response()->setStatusCode(200);
    }

    public function recordInspection(Request $request, Car $car): JsonResponse
    {
        // Only the assigned inspector (or an admin override) may record results.
        $user = $request->user();
        $isAssigned = $car->inspector_id && (int) $car->inspector_id === (int) $user->id;
        if (!$isAssigned && !$user->isAdmin()) {
            abort(403, 'Only the assigned inspector (or an administrator) can record this inspection.');
        }

        $validated = $request->validate([
            'passed' => ['required', 'boolean'],
            'inspection_score' => ['nullable', 'string', 'max:20'],
            'inspector_notes' => ['nullable', 'string', 'max:2000'],
            'rejection_reason' => ['nullable', 'string', 'max:1000'],
        ]);

        $updatedCar = $this->cars->recordInspection($car, $validated, $request->user());

        return (new CarResource($updatedCar))->response()->setStatusCode(200);
    }

    public function approve(Request $request, Car $car): JsonResponse
    {
        $updatedCar = $this->cars->approveListing($car, $request->user());

        return (new CarResource($updatedCar))->response()->setStatusCode(200);
    }

    public function reject(Request $request, Car $car): JsonResponse
    {
        $validated = $request->validate([
            'reason' => ['required', 'string', 'max:1000'],
        ]);

        $updatedCar = $this->cars->rejectListing($car, $validated['reason'], $request->user());

        return (new CarResource($updatedCar))->response()->setStatusCode(200);
    }
}
