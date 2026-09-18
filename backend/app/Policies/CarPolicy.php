<?php

namespace App\Policies;

use App\Enums\CarStatus;
use App\Models\Car;
use App\Models\User;

class CarPolicy
{
    /** Marketplace browsing is public — scoping happens in the query. */
    public function viewAny(?User $user): bool
    {
        return true;
    }

    public function view(?User $user, Car $car): bool
    {
        $status = $car->status instanceof CarStatus ? $car->status : CarStatus::from($car->status);

        if ($status->isListable()) {
            return true;
        }

        return $user !== null && ($this->owns($user, $car) || $user->hasRole('admin'));
    }

    public function create(User $user): bool
    {
        return $user->hasRole('seller', 'dealer', 'admin');
    }

    public function update(User $user, Car $car): bool
    {
        return $this->owns($user, $car) || $user->hasRole('admin');
    }

    public function delete(User $user, Car $car): bool
    {
        return $this->owns($user, $car) || $user->hasRole('admin');
    }

    private function owns(User $user, Car $car): bool
    {
        return (int) $car->seller_id === (int) $user->id;
    }
}
