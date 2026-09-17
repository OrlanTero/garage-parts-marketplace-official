<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CarResource;
use App\Models\Car;
use App\Services\CarService;
use Illuminate\Http\Request;

/** Public marketplace — no auth required. Only `active` cars are visible. */
class MarketplaceCarController extends Controller
{
    public function __construct(private CarService $cars) {}

    public function index(Request $request)
    {
        $validated = $request->validate([
            'search' => ['sometimes', 'string', 'max:120'],
            'brand' => ['sometimes', 'string', 'max:80'],
            'model' => ['sometimes', 'string', 'max:80'],
            'body_style' => ['sometimes', 'string', 'max:30'],
            'fuel_type' => ['sometimes', 'string', 'max:30'],
            'transmission' => ['sometimes', 'string', 'max:30'],
            'condition' => ['sometimes', 'string', 'max:30'],
            'city' => ['sometimes', 'string', 'max:120'],
            'min_price' => ['sometimes', 'numeric', 'min:0'],
            'max_price' => ['sometimes', 'numeric', 'min:0'],
            'min_year' => ['sometimes', 'integer', 'min:1900'],
            'max_year' => ['sometimes', 'integer', 'min:1900'],
            'max_mileage' => ['sometimes', 'integer', 'min:0'],
            'sort' => ['sometimes', 'in:newest,price_asc,price_desc,mileage_asc,year_desc'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:50'],
        ]);

        $paginator = $this->cars->marketplace($validated, (int) ($validated['per_page'] ?? 15));

        return CarResource::collection($paginator);
    }

    public function show(Car $car)
    {
        $this->authorize('view', $car);

        return new CarResource($car->loadMissing('seller:id,name'));
    }
}
