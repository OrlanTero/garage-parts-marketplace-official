<?php

namespace App\Policies;

use App\Enums\CarStatus;
use App\Models\Car;
use App\Models\Conversation;
use App\Models\Order;
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

        if ($user !== null && ($this->owns($user, $car) || $user->hasRole('admin'))) {
            return true;
        }

        if ($user === null) {
            return false;
        }

        // A buyer negotiating (or who bought) this listing keeps read
        // access to it — e.g. a sold car they inquired on or checked out.
        // Direct "Buy Now" checkout creates an order but no chat thread,
        // so order ownership counts too (by account or checkout email).
        return $this->hasListingThread($user, $car->id) || $this->hasOrder($user, $car->id);
    }

    private function hasListingThread(User $user, int $carId): bool
    {
        return Conversation::query()
            ->where('listing_key', "car:{$carId}")
            ->where(function ($q) use ($user) {
                $q->where('user_one_id', $user->id)->orWhere('user_two_id', $user->id);
            })
            ->exists();
    }

    private function hasOrder(User $user, int $carId): bool
    {
        return Order::query()
            ->where('car_id', $carId)
            ->where(function ($q) use ($user) {
                $q->where('user_id', $user->id);
                if ($user->email) {
                    $q->orWhere('buyer_email', $user->email);
                }
            })
            ->exists();
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
