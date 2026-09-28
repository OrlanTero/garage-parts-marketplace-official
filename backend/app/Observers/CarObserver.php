<?php

namespace App\Observers;

use App\Models\Car;
use App\Services\RestockNotifier;

class CarObserver
{
    public function __construct(private RestockNotifier $notifier) {}

    public function updated(Car $car): void
    {
        if (!$car->wasChanged(['quantity', 'status', 'is_approved', 'published_at'])) {
            return;
        }

        $this->notifier->checkCar($car);
    }
}
