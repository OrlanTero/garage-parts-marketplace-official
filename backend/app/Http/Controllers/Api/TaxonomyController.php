<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\BrandResource;
use App\Http\Resources\CarModelResource;
use App\Http\Resources\CategoryResource;
use App\Models\Brand;
use App\Models\CarModel;
use App\Models\Category;
use Illuminate\Http\Request;

/**
 * Public taxonomy reads — powers frontend dropdowns, Home category grid,
 * quick-finder Make/Model/Category selects (replaces hardcoded constants).
 */
class TaxonomyController extends Controller
{
    /** GET /v1/taxonomy/brands — all active brands with model + listing counts. */
    public function brands(Request $request)
    {
        $query = Brand::query()
            ->where('is_active', true)
            ->withCount(['carModels', 'cars'])
            ->with(['carModels' => fn ($q) => $q->where('is_active', true)
                ->withCount('compatibleParts')->orderBy('sort_order')->orderBy('name')])
            ->orderBy('sort_order')
            ->orderBy('name');

        if ($region = $request->query('region')) {
            $query->where('region', $region);
        }

        if ($search = $request->query('search')) {
            $query->where('name', 'like', "%{$search}%");
        }

        return BrandResource::collection($query->get());
    }

    /** GET /v1/taxonomy/brands/{brand} */
    public function brand(Brand $brand)
    {
        $brand->loadCount(['carModels', 'cars'])
            ->load(['carModels' => fn ($q) => $q->withCount('compatibleParts')->orderBy('sort_order')]);

        return new BrandResource($brand);
    }

    /** GET /v1/taxonomy/models — flat model list (for Model/Chassis dropdown). */
    public function models(Request $request)
    {
        $query = CarModel::query()
            ->where('is_active', true)
            ->with(['brand:id,name,slug'])
            ->withCount(['compatibleParts', 'cars'])
            ->orderBy('name');

        if ($brandId = $request->query('brand_id')) {
            $query->where('brand_id', $brandId);
        }

        if ($brand = $request->query('brand')) {
            $query->whereHas('brand', fn ($q) => $q->where('slug', $brand)->orWhere('name', $brand));
        }

        if ($search = $request->query('search')) {
            $like = "%{$search}%";
            $query->where(fn ($q) => $q->where('name', 'like', $like)->orWhere('chassis_code', 'like', $like));
        }

        return CarModelResource::collection($query->paginate(min((int) $request->query('per_page', 50), 100)));
    }

    /** GET /v1/taxonomy/categories — all active categories with live parts counts. */
    public function categories(Request $request)
    {
        $query = Category::query()
            ->where('is_active', true)
            ->with(['subcategories' => fn ($q) => $q->where('is_active', true)->orderBy('sort_order')])
            ->withCount('parts')
            ->orderBy('sort_order')
            ->orderBy('name');

        return CategoryResource::collection($query->get());
    }

    /** GET /v1/taxonomy/part-brands — distinct part-maker brands with live counts. */
    public function partBrands()
    {
        $rows = \App\Models\Part::query()
            ->selectRaw('brand, COUNT(*) as parts_count')
            ->whereNotNull('brand')
            ->where('brand', '!=', '')
            ->groupBy('brand')
            ->orderByDesc('parts_count')
            ->orderBy('brand')
            ->limit(100)
            ->get();

        return response()->json([
            'data' => $rows->map(fn ($r) => [
                'name' => $r->brand,
                'parts_count' => (int) $r->parts_count,
            ]),
        ]);
    }

    /** GET /v1/taxonomy/meta — single payload for frontend filter bootstrapping. */
    public function meta()
    {
        return response()->json([
            'data' => [
                'brands' => BrandResource::collection(
                    Brand::where('is_active', true)
                        ->withCount(['carModels', 'cars'])
                        ->orderBy('sort_order')->orderBy('name')->get()
                ),
                'categories' => CategoryResource::collection(
                    Category::where('is_active', true)
                        ->with(['subcategories' => fn ($q) => $q->where('is_active', true)->orderBy('sort_order')])
                        ->withCount('parts')
                        ->orderBy('sort_order')->get()
                ),
                // Vehicle/part spec vocabularies (backend enums = source of truth
                // for every Body Style / Transmission / Fuel / Condition select).
                'specs' => [
                    'body_styles' => array_column(\App\Enums\BodyStyle::cases(), 'value'),
                    'transmissions' => array_column(\App\Enums\Transmission::cases(), 'value'),
                    'fuel_types' => array_column(\App\Enums\FuelType::cases(), 'value'),
                    'car_conditions' => array_column(\App\Enums\CarCondition::cases(), 'value'),
                    'part_conditions' => array_column(\App\Enums\PartCondition::cases(), 'value'),
                ],
                'counts' => [
                    'brands' => Brand::where('is_active', true)->count(),
                    'models' => \App\Models\CarModel::where('is_active', true)->count(),
                    'categories' => Category::where('is_active', true)->count(),
                    'cars' => \App\Models\Car::count(),
                    'parts' => \App\Models\Part::count(),
                ],
            ],
        ]);
    }
}
