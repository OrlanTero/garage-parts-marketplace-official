<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

/**
 * Generic platform variables (Configurations → Variables tab).
 * JSON values are stored as strings; use getJson() for structured keys
 * such as delivery_services.
 */
class PlatformSetting extends Model
{
    protected $fillable = ['key', 'value', 'group', 'description'];

    public static function get(string $key, mixed $default = null): mixed
    {
        $cached = Cache::remember('platform_settings', 300, fn () => static::pluck('value', 'key')->all());

        return array_key_exists($key, $cached) ? $cached[$key] : $default;
    }

    public static function getJson(string $key, mixed $default = []): mixed
    {
        $raw = static::get($key);
        if ($raw === null || $raw === '') {
            return $default;
        }
        $decoded = json_decode((string) $raw, true);

        return is_array($decoded) ? $decoded : $default;
    }

    public static function set(string $key, mixed $value, ?string $group = null, ?string $description = null): static
    {
        $stored = is_array($value) ? json_encode(array_values($value)) : (string) $value;

        $setting = static::updateOrCreate(
            ['key' => $key],
            array_filter([
                'value' => $stored,
                'group' => $group,
                'description' => $description,
            ], fn ($v) => $v !== null),
        );

        Cache::forget('platform_settings');

        return $setting;
    }
}
