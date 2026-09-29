<?php

namespace App\Observers;

use App\Models\Part;
use App\Services\RestockNotifier;

class PartObserver
{
    public function __construct(private RestockNotifier $notifier) {}

    public function updated(Part $part): void
    {
        if (!$part->wasChanged(['quantity', 'status'])) {
            return;
        }

        $this->notifier->checkPart($part);
    }
}
