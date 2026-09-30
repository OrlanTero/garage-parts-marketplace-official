<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PlatformSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Configurations → Variables (delivery services, freight rules, …).
 * Admin-only. Values are stored as strings; delivery_services is JSON.
 */
class AdminConfigController extends Controller
{
    /** GET /admin/config?group=variables */
    public function index(Request $request): JsonResponse
    {
        $data = $request->validate([
            'group' => ['sometimes', 'string', 'max:60'],
        ]);

        $query = PlatformSetting::query()->orderBy('key');
        if (!empty($data['group'])) {
            $query->where('group', $data['group']);
        }

        $settings = $query->get()->mapWithKeys(function (PlatformSetting $s) {
            $value = $s->value;
            if ($s->key === 'delivery_services') {
                $decoded = json_decode((string) $value, true);
                $value = is_array($decoded) ? array_values($decoded) : [];
            }

            return [$s->key => [
                'value' => $value,
                'group' => $s->group,
                'description' => $s->description,
            ]];
        });

        return response()->json(['status' => 'success', 'data' => $settings]);
    }

    /** PUT /admin/config — bulk upsert {settings: {key: value}}. */
    public function update(Request $request): JsonResponse
    {
        $request->validate([
            'settings' => ['required', 'array'],
            'settings.delivery_services' => ['sometimes', 'array'],
            'settings.delivery_services.*.code' => ['required_with:settings.delivery_services', 'string', 'max:30'],
            'settings.delivery_services.*.name' => ['required_with:settings.delivery_services', 'string', 'max:120'],
            'settings.delivery_services.*.tracking_url_template' => ['nullable', 'string', 'max:500'],
            'settings.delivery_services.*.active' => ['sometimes', 'boolean'],
            'settings.free_freight_threshold' => ['sometimes', 'numeric', 'min:0'],
            'settings.standard_flat_fee' => ['sometimes', 'numeric', 'min:0'],
            'settings.reservation_fee_percentage' => ['sometimes', 'numeric', 'min:0', 'max:100'],
            'settings.freight_per_km' => ['sometimes', 'numeric', 'min:0'],
            'settings.freight_min_fee' => ['sometimes', 'numeric', 'min:0'],
            'settings.freight_max_fee' => ['sometimes', 'numeric', 'min:0'],
            'settings.free_freight_min_quantity' => ['sometimes', 'integer', 'min:0'],
            'settings.agent_subscription_fee' => ['sometimes', 'numeric', 'min:0'],
            'settings.agent_referral_reward' => ['sometimes', 'numeric', 'min:0'],
            'settings.agent_subscription_duration_days' => ['sometimes', 'integer', 'min:1', 'max:3650'],
            'settings.agent_commission_car_pct' => ['sometimes', 'numeric', 'min:0', 'max:100'],
            'settings.agent_commission_part_pct' => ['sometimes', 'numeric', 'min:0', 'max:100'],
            'settings.perks_subscription_fee' => ['sometimes', 'numeric', 'min:0'],
            'settings.perks_subscription_duration_days' => ['sometimes', 'integer', 'min:1', 'max:3650'],
            'settings.perks_max_part_discount_pct' => ['sometimes', 'numeric', 'min:0', 'max:100'],
        ]);

        // NB: read raw input (not validated()) so unknown keys still reach
        // the allowlist below instead of being silently stripped.
        $settings = $request->input('settings', []);
        foreach ($settings as $key => $value) {
            if (!in_array($key, ['delivery_services', 'free_freight_threshold', 'standard_flat_fee', 'reservation_fee_percentage', 'freight_per_km', 'freight_min_fee', 'freight_max_fee', 'free_freight_min_quantity', 'agent_subscription_fee', 'agent_referral_reward', 'agent_subscription_duration_days', 'agent_commission_car_pct', 'agent_commission_part_pct', 'perks_subscription_fee', 'perks_subscription_duration_days', 'perks_max_part_discount_pct'], true)) {
                abort(422, "Unknown setting key: {$key}.");
            }
            PlatformSetting::set($key, $value, 'variables');
        }

        return $this->index($request);
    }
}
