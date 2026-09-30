<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\Perk;
use App\Services\PerksService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Member perks (discount club): membership status, yearly subscribe,
 * and the merchant perks catalog (public list, admin CRUD).
 */
class PerksController extends Controller
{
    /** GET /perks — membership status + program economics + catalog. */
    public function status(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'status' => 'success',
            'data' => [
                'is_member' => PerksService::isActive($user),
                'perks_status' => $user->perks_status ?? 'inactive',
                'perks_expires_at' => $user->perks_expires_at?->toISOString(),
                'subscription_fee' => PerksService::fee(),
                'duration_days' => PerksService::durationDays(),
                'max_part_discount_pct' => PerksService::maxPartDiscountPct(),
                'user' => new UserResource($user->refresh()),
            ],
        ]);
    }

    /** POST /perks/subscribe — join / renew the yearly membership. */
    public function subscribe(Request $request): JsonResponse
    {
        $data = $request->validate([
            'payment_method' => ['sometimes', 'string', 'max:40'],
            'payment_reference' => ['sometimes', 'nullable', 'string', 'max:120'],
        ]);

        $user = PerksService::subscribe(
            $request->user(),
            $data['payment_method'] ?? 'gcash',
            $data['payment_reference'] ?? null,
        );

        return response()->json([
            'status' => 'success',
            'message' => 'Member perks activated for one year.',
            'data' => [
                'is_member' => true,
                'perks_expires_at' => $user->perks_expires_at?->toISOString(),
                'user' => new UserResource($user),
            ],
        ], 201);
    }

    /** GET /perks/catalog — public merchant offers (active only). */
    public function catalog(): JsonResponse
    {
        $perks = Perk::query()
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderByDesc('id')
            ->get();

        return response()->json(['status' => 'success', 'data' => $perks]);
    }

    /** GET /admin/perks — full catalog for moderation. */
    public function adminIndex(): JsonResponse
    {
        $perks = Perk::query()->orderBy('sort_order')->orderByDesc('id')->get();

        return response()->json(['status' => 'success', 'data' => $perks]);
    }

    /** POST /admin/perks — create a merchant offer. */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:160'],
            'category' => ['sometimes', 'string', 'max:40'],
            'partner' => ['sometimes', 'nullable', 'string', 'max:160'],
            'discount_label' => ['required', 'string', 'max:80'],
            'description' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'terms' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'is_active' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
        ]);

        $perk = Perk::create($data);

        return response()->json(['status' => 'success', 'data' => $perk], 201);
    }

    /** PATCH /admin/perks/{perk} — edit a merchant offer. */
    public function update(Request $request, Perk $perk): JsonResponse
    {
        $data = $request->validate([
            'title' => ['sometimes', 'string', 'max:160'],
            'category' => ['sometimes', 'string', 'max:40'],
            'partner' => ['sometimes', 'nullable', 'string', 'max:160'],
            'discount_label' => ['sometimes', 'string', 'max:80'],
            'description' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'terms' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'is_active' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
        ]);

        $perk->update($data);

        return response()->json(['status' => 'success', 'data' => $perk->refresh()]);
    }

    /** DELETE /admin/perks/{perk} — remove a merchant offer. */
    public function destroy(Perk $perk): JsonResponse
    {
        $perk->delete();

        return response()->json(['status' => 'success', 'message' => 'Perk removed.']);
    }
}
