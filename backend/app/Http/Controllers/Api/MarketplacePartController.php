<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\PartResource;
use App\Models\Part;
use App\Services\PartService;
use Illuminate\Http\Request;

/** Public marketplace — no auth required. Only `active` parts are visible. */
class MarketplacePartController extends Controller
{
    public function __construct(private PartService $parts) {}

    public function index(Request $request)
    {
        $validated = $request->validate([
            'search' => ['sometimes', 'string', 'max:120'],
            'category' => ['sometimes', 'string', 'max:30'],
            'brand' => ['sometimes', 'string', 'max:80'],
            'condition' => ['sometimes', 'string', 'max:30'],
            'city' => ['sometimes', 'string', 'max:120'],
            'min_price' => ['sometimes', 'numeric', 'min:0'],
            'max_price' => ['sometimes', 'numeric', 'min:0'],
            'in_stock' => ['sometimes', 'boolean'],
            'sort' => ['sometimes', 'in:newest,price_asc,price_desc'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:50'],
        ]);

        $paginator = $this->parts->marketplace($validated, (int) ($validated['per_page'] ?? 15));

        return PartResource::collection($paginator);
    }

    public function show(Part $part)
    {
        $this->authorize('view', $part);

        return new PartResource($part->loadMissing('seller:id,name'));
    }
}
