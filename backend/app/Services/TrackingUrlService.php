<?php

namespace App\Services;

use App\Models\PlatformSetting;

/**
 * Resolves a buyer-facing courier tracking link.
 * Precedence: explicitly stored URL → configured courier template
 * (Variables → Delivery Services, {tracking} placeholder) → none.
 */
class TrackingUrlService
{
    public function resolve(?string $stored, ?string $carrier, ?string $tracking): ?string
    {
        $stored = trim((string) $stored);
        if ($stored !== '') {
            return $stored;
        }

        $tracking = trim((string) $tracking);
        if ($tracking === '') {
            return null;
        }

        $service = $this->matchService((string) $carrier);
        $template = trim((string) ($service['tracking_url_template'] ?? ''));
        if ($template === '' || !str_contains($template, '{tracking}')) {
            return null;
        }

        $url = str_replace('{tracking}', urlencode($tracking), $template);

        return filter_var($url, FILTER_VALIDATE_URL) ? $url : null;
    }

    /** @return array{code:string,name:string,tracking_url_template:string,active:bool}|null */
    public function matchService(string $carrier): ?array
    {
        $haystack = strtolower(trim($carrier));
        if ($haystack === '') {
            return null;
        }

        foreach (PlatformSetting::getJson('delivery_services', []) as $service) {
            if (!is_array($service) || empty($service['active'])) {
                continue;
            }
            $code = strtolower(trim((string) ($service['code'] ?? '')));
            $name = strtolower(trim((string) ($service['name'] ?? '')));
            if (($code !== '' && str_contains($haystack, $code))
                || ($name !== '' && (str_contains($haystack, $name) || str_contains($name, $haystack)))) {
                return $service;
            }
        }

        return null;
    }
}
