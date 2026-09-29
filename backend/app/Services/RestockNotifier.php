<?php

namespace App\Services;

use App\Models\Car;
use App\Models\Part;
use App\Models\RestockSubscription;
use Illuminate\Support\Facades\Log;

/**
 * One-shot restock alerts: when a sold-out listing becomes buyable again,
 * every subscriber gets a notification and their subscription is consumed.
 */
class RestockNotifier
{
    public function __construct(private NotificationService $notifications) {}

    public function checkCar(Car $car): void
    {
        $wasOut = $this->wasOut($car->getOriginal('quantity'), $car->getOriginal('status'));
        $nowIn = $this->carSellable($car);

        if ($wasOut && $nowIn) {
            $this->fire('car', (int) $car->id, (string) ($car->title ?? 'Vehicle listing'),
                '/marketplace/' . ($car->uuid ?? $car->id));
        }
    }

    public function checkPart(Part $part): void
    {
        $wasOut = $this->wasOut($part->getOriginal('quantity'), $part->getOriginal('status'));
        $nowIn = $this->partSellable($part);

        if ($wasOut && $nowIn) {
            $this->fire('part', (int) $part->id, (string) ($part->title ?? 'Parts listing'),
                '/parts/' . ($part->uuid ?? $part->id));
        }
    }

    private function wasOut(mixed $originalQty, mixed $originalStatus): bool
    {
        $status = is_object($originalStatus) ? $originalStatus->value : (string) $originalStatus;

        return ($originalQty !== null && (int) $originalQty <= 0) || $status === 'sold';
    }

    private function carSellable(Car $car): bool
    {
        $status = is_object($car->status) ? $car->status->value : (string) $car->status;

        return $status === 'active'
            && (bool) $car->is_approved
            && $car->published_at !== null
            && ($car->quantity === null || (int) $car->quantity > 0);
    }

    private function partSellable(Part $part): bool
    {
        $status = is_object($part->status) ? $part->status->value : (string) $part->status;

        return $status === 'active'
            && ($part->quantity === null || (int) $part->quantity > 0);
    }

    private function fire(string $type, int $id, string $title, string $link): void
    {
        try {
            $subs = RestockSubscription::query()
                ->where('listing_type', $type)
                ->where('listing_id', $id)
                ->get();

            foreach ($subs as $sub) {
                try {
                    $this->notifications->send(
                        (int) $sub->user_id,
                        'listing',
                        "Back in stock: {$title}",
                        'A listing you asked about is available again — quantities are limited.',
                        ['listing_type' => $type, 'listing_id' => $id, 'restocked' => true],
                        $link,
                    );
                } catch (\Throwable $e) {
                    Log::warning('Restock notification failed: ' . $e->getMessage());
                }
                $sub->delete();
            }
        } catch (\Throwable $e) {
            Log::warning('Restock check failed: ' . $e->getMessage());
        }
    }
}
