<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\BrandResource;
use App\Http\Resources\CarModelResource;
use App\Http\Resources\CategoryResource;
use App\Models\Brand;
use App\Models\CarModel;
use App\Models\Category;
use App\Models\Subcategory;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

/**
 * Admin taxonomy CRUD — backs Admin "Brand, Model & Category" page.
 * Replaces local-only useState adds with persistent, backend-visible records.
 */
class AdminTaxonomyController extends Controller
{
    // ---------- Brands ----------

    public function storeBrand(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:80', 'unique:brands,name'],
            'country' => ['nullable', 'string', 'max:80'],
            'region' => ['nullable', 'string', 'max:30'],
            'logo_url' => ['nullable', 'url', 'max:500'],
            'is_active' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
        ]);

        $data['slug'] = Str::slug($data['name']);

        $brand = Brand::create($data);

        return (new BrandResource($brand->loadCount(['carModels', 'cars'])))
            ->response()->setStatusCode(201);
    }

    public function updateBrand(Request $request, Brand $brand)
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:80', Rule::unique('brands', 'name')->ignore($brand->id)],
            'country' => ['nullable', 'string', 'max:80'],
            'region' => ['nullable', 'string', 'max:30'],
            'logo_url' => ['nullable', 'url', 'max:500'],
            'is_active' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
        ]);

        if (isset($data['name'])) {
            $data['slug'] = Str::slug($data['name']);
        }

        $brand->update($data);

        return new BrandResource($brand->loadCount(['carModels', 'cars']));
    }

    public function destroyBrand(Brand $brand)
    {
        $brand->delete();

        return response()->json(['message' => 'Brand removed from taxonomy.']);
    }

    // ---------- Models ----------

    public function storeModel(Request $request, Brand $brand)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'chassis_code' => ['nullable', 'string', 'max:120'],
            'years_label' => ['nullable', 'string', 'max:60'],
            'years' => ['nullable', 'string', 'max:60'],
            'year_from' => ['nullable', 'integer', 'min:1900', 'max:2100'],
            'year_to' => ['nullable', 'integer', 'min:1900', 'max:2100'],
            'engines' => ['nullable', 'array'],
            'engines.*' => ['string', 'max:120'],
            'engine_text' => ['nullable', 'string', 'max:500'],
            'description' => ['nullable', 'string', 'max:2000'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        // Accept comma-separated string from admin form too.
        if (empty($data['engines']) && !empty($data['engine_text'])) {
            $data['engines'] = collect(explode(',', $data['engine_text']))
                ->map(fn ($s) => trim($s))->filter()->values()->all();
        }
        unset($data['engine_text']);

        if (!empty($data['years']) && empty($data['years_label'])) {
            $data['years_label'] = $data['years'];
        }
        unset($data['years']);

        $data['slug'] = Str::slug($data['name']);

        $model = $brand->carModels()->create($data);

        return (new CarModelResource($model->load(['brand'])->loadCount('compatibleParts')))
            ->response()->setStatusCode(201);
    }

    public function updateModel(Request $request, CarModel $model)
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:120'],
            'chassis_code' => ['nullable', 'string', 'max:120'],
            'years_label' => ['nullable', 'string', 'max:60'],
            'year_from' => ['nullable', 'integer', 'min:1900', 'max:2100'],
            'year_to' => ['nullable', 'integer', 'min:1900', 'max:2100'],
            'engines' => ['nullable', 'array'],
            'engines.*' => ['string', 'max:120'],
            'description' => ['nullable', 'string', 'max:2000'],
            'is_active' => ['sometimes', 'boolean'],
            'brand_id' => ['sometimes', 'exists:brands,id'],
        ]);

        if (isset($data['name'])) {
            $data['slug'] = Str::slug($data['name']);
        }

        $model->update($data);

        return new CarModelResource($model->load(['brand'])->loadCount('compatibleParts'));
    }

    public function destroyModel(CarModel $model)
    {
        $model->delete();

        return response()->json(['message' => 'Model removed from taxonomy.']);
    }

    // ---------- Categories ----------

    public function storeCategory(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120', 'unique:categories,name'],
            'code' => ['nullable', 'string', 'max:30', 'unique:categories,code'],
            'description' => ['nullable', 'string', 'max:2000'],
            'image_url' => ['nullable', 'url', 'max:500'],
            'icon' => ['nullable', 'string', 'max:60'],
            'is_active' => ['sometimes', 'boolean'],
            'subcategories' => ['nullable', 'array'],
            'subcategories.*' => ['string', 'max:140'],
            'subcategory_text' => ['nullable', 'string', 'max:2000'],
        ]);

        if (empty($data['subcategories']) && !empty($data['subcategory_text'])) {
            $data['subcategories'] = collect(explode(',', $data['subcategory_text']))
                ->map(fn ($s) => trim($s))->filter()->values()->all();
        }
        $subs = $data['subcategories'] ?? [];
        unset($data['subcategories'], $data['subcategory_text']);

        $data['slug'] = Str::slug($data['name']);
        if (!empty($data['code'])) {
            $data['code'] = strtoupper($data['code']);
        }

        $category = Category::create($data);

        foreach ($subs as $i => $name) {
            $category->subcategories()->create([
                'name' => $name,
                'slug' => Str::slug($name),
                'sort_order' => $i,
            ]);
        }

        return (new CategoryResource($category->load('subcategories')->loadCount('parts')))
            ->response()->setStatusCode(201);
    }

    public function updateCategory(Request $request, Category $category)
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:120', Rule::unique('categories', 'name')->ignore($category->id)],
            'code' => ['nullable', 'string', 'max:30', Rule::unique('categories', 'code')->ignore($category->id)],
            'description' => ['nullable', 'string', 'max:2000'],
            'image_url' => ['nullable', 'url', 'max:500'],
            'icon' => ['nullable', 'string', 'max:60'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        if (isset($data['name'])) {
            $data['slug'] = Str::slug($data['name']);
        }
        if (!empty($data['code'])) {
            $data['code'] = strtoupper($data['code']);
        }

        $category->update($data);

        return new CategoryResource($category->load('subcategories')->loadCount('parts'));
    }

    public function destroyCategory(Category $category)
    {
        $category->delete();

        return response()->json(['message' => 'Category removed from catalog taxonomy.']);
    }

    public function storeSubcategory(Request $request, Category $category)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:140'],
            'description' => ['nullable', 'string', 'max:2000'],
        ]);

        $sub = $category->subcategories()->create([
            'name' => $data['name'],
            'slug' => Str::slug($data['name']),
            'description' => $data['description'] ?? null,
        ]);

        return response()->json(['data' => $sub], 201);
    }

    public function destroySubcategory(Subcategory $subcategory)
    {
        $subcategory->delete();

        return response()->json(['message' => 'Subcategory removed.']);
    }

    // ---------- Fitment ----------

    /** Link a part to one or more models — drives "Compatible Parts" counts. */
    public function syncFitment(Request $request, CarModel $model)
    {
        $data = $request->validate([
            'part_ids' => ['required', 'array'],
            'part_ids.*' => ['integer', 'exists:parts,id'],
            'detach' => ['sometimes', 'boolean'],
        ]);

        if (!empty($data['detach'])) {
            $model->compatibleParts()->detach($data['part_ids']);
        } else {
            $model->compatibleParts()->syncWithoutDetaching($data['part_ids']);
        }

        return new CarModelResource($model->load(['brand'])->loadCount('compatibleParts'));
    }
}
