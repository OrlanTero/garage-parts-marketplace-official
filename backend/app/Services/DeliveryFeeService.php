<?php

namespace App\Services;

use App\Models\PlatformSetting;
use App\Models\Warehouse;

/**
 * Parts-only delivery fee from the dispatch warehouse (house default —
 * GAP Valenzuela Main Depot unless re-pinned). Cars always ship free
 * and never reach the priced path.
 *
 * Fee = straight-line distance (haversine, buyer address ← warehouse)
 * × the configured per-km rate, clamped to [min, max]. When no GPS pin
 * or recognized city exists we fall back to the standard flat fee.
 *
 * Free freight, in order: listing flagged free_shipping → subtotal
 * at/above the threshold → quantity at/above the configured minimum
 * (0 = disabled).
 */
class DeliveryFeeService
{
    public const MAIN_BRANCH_NAME = 'GAP Valenzuela Main Depot';
    public const MAIN_BRANCH_LATITUDE = 14.7008;
    public const MAIN_BRANCH_LONGITUDE = 120.9830;

    public const FREE_FREIGHT_THRESHOLD = 10000.00;
    public const FALLBACK_FLAT_FEE = 350.00;
    public const PER_KM_RATE = 15.00;
    public const MIN_FEE = 150.00;
    public const MAX_FEE = 1200.00;

    private const CITY_CENTROIDS = [
        'valenzuela' => [14.7008, 120.9830],
        'quezon city' => [14.6760, 121.0437],
        'manila' => [14.5995, 120.9842],
        'makati' => [14.5547, 121.0244],
        'pasig' => [14.5764, 121.0851],
        'taguig' => [14.5176, 121.0509],
        'caloocan' => [14.6507, 120.9678],
        'paranaque' => [14.4793, 121.0198],
        'las pinas' => [14.4445, 120.9939],
        'mandaluyong' => [14.5794, 121.0359],
        'malabon' => [14.6625, 120.9578],
        'navotas' => [14.6667, 120.9417],
        'marikina' => [14.6507, 121.1029],
        'pasay' => [14.5378, 121.0014],
        'san juan' => [14.6019, 121.0355],
        'muntinlupa' => [14.4081, 121.0415],
        'cavite' => [14.4791, 120.8969],
        'laguna' => [14.2691, 121.4113],
        'bulacan' => [14.7944, 120.8799],
        'rizal' => [14.6037, 121.3084],
        'pampanga' => [15.0794, 120.6198],
        'batangas' => [13.7565, 121.0583],
        'baguio' => [16.4023, 120.5960],
        'cebu' => [10.3157, 123.8854],
        'cebu city' => [10.3157, 123.8854],
        'iloilo' => [10.7202, 122.5621],
        'bacolod' => [10.6765, 122.9500],
        'davao' => [7.1907, 125.4553],
        'metro manila' => [14.5995, 120.9842],
    ];

    /**
     * @return array{fee:float,distance_km:?float,zone:string,free:bool,reason:string,origin:string}
     */
    public function quote(
        ?float $latitude,
        ?float $longitude,
        ?string $city,
        float $subtotal,
        bool $freeShippingFlag,
        string $itemType,
        ?float $originLatitude = null,
        ?float $originLongitude = null,
        ?string $originName = null,
        int $quantity = 1,
    ): array {
        $origin = $originName ?? self::MAIN_BRANCH_NAME;
        $originLat = $originLatitude ?? self::MAIN_BRANCH_LATITUDE;
        $originLng = $originLongitude ?? self::MAIN_BRANCH_LONGITUDE;
        $threshold = (float) PlatformSetting::get('free_freight_threshold', self::FREE_FREIGHT_THRESHOLD);
        $flatFee = (float) PlatformSetting::get('standard_flat_fee', self::FALLBACK_FLAT_FEE);
        $perKm = (float) PlatformSetting::get('freight_per_km', self::PER_KM_RATE);
        $minFee = (float) PlatformSetting::get('freight_min_fee', self::MIN_FEE);
        $maxFee = (float) PlatformSetting::get('freight_max_fee', self::MAX_FEE);
        $minQty = (int) PlatformSetting::get('free_freight_min_quantity', 0);

        if ($itemType === 'car') {
            return $this->free('Whole-vehicle orders ship free from the depot.', $origin);
        }

        if ($freeShippingFlag) {
            return $this->free('Listing flagged free shipping.', $origin);
        }

        if ($subtotal >= $threshold) {
            return $this->free("Free freight for orders at/above ₱{$threshold}.", $origin);
        }

        if ($minQty > 0 && $quantity >= $minQty) {
            return $this->free("Free freight for {$quantity} items (minimum {$minQty}).", $origin);
        }

        [$destLat, $destLng, $pinned] = $this->resolveDestination($latitude, $longitude, $city);

        if ($destLat === null || $destLng === null) {
            return [
                'fee' => $flatFee,
                'distance_km' => null,
                'zone' => 'Standard',
                'free' => false,
                'reason' => 'No delivery pin or recognized city — standard flat freight applied.',
                'origin' => $origin,
            ];
        }

        $distanceKm = round($this->haversineKm($originLat, $originLng, $destLat, $destLng), 1);
        $fee = (float) min($maxFee, max($minFee, round($distanceKm * $perKm, 2)));
        $zone = $this->zoneFor($distanceKm);

        return [
            'fee' => $fee,
            'distance_km' => $distanceKm,
            'zone' => $zone,
            'free' => false,
            'reason' => ($pinned ? 'Pinned drop-off' : 'City centroid estimate')
                . " — {$distanceKm} km × ₱{$perKm}/km from {$origin} ({$zone}).",
            'origin' => $origin,
        ];
    }

    private function zoneFor(float $distanceKm): string
    {
        return match (true) {
            $distanceKm <= 15 => 'Metro Core',
            $distanceKm <= 40 => 'NCR Fringe',
            $distanceKm <= 150 => 'Luzon Nearby',
            $distanceKm <= 500 => 'Luzon Far',
            default => 'Inter-island Freight',
        };
    }

    /**
     * Origin coordinates for a dispatch warehouse (pinned address wins,
     * otherwise the historic main-branch point). Returns nulls when the
     * warehouse has no pin so callers fall back to defaults.
     *
     * @return array{?float,?float,string}
     */
    public function originFor(?Warehouse $warehouse): array
    {
        if ($warehouse && $warehouse->latitude !== null && $warehouse->longitude !== null) {
            return [(float) $warehouse->latitude, (float) $warehouse->longitude, $warehouse->name];
        }

        return [null, null, $warehouse?->name ?? self::MAIN_BRANCH_NAME];
    }

    private function free(string $reason, string $origin): array
    {
        return [
            'fee' => 0.00,
            'distance_km' => null,
            'zone' => 'Free Freight',
            'free' => true,
            'reason' => $reason,
            'origin' => $origin,
        ];
    }

    /** @return array{?float,?float,bool} */
    private function resolveDestination(?float $lat, ?float $lng, ?string $city): array
    {
        if ($lat !== null && $lng !== null) {
            return [$lat, $lng, true];
        }

        $key = strtolower(trim((string) $city));
        if ($key !== '') {
            foreach (self::CITY_CENTROIDS as $name => [$cLat, $cLng]) {
                if (str_contains($key, $name) || str_contains($name, $key)) {
                    return [$cLat, $cLng, false];
                }
            }
        }

        return [null, null, false];
    }

    private function haversineKm(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $earthKm = 6371.0;
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);

        $a = sin($dLat / 2) ** 2
            + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) ** 2;

        return 2 * $earthKm * asin(min(1, sqrt($a)));
    }
}
