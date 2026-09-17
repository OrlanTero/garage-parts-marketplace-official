<?php

namespace App\Policies;

use App\Enums\PartStatus;
use App\Models\Part;
use App\Models\User;

class PartPolicy
{
    /** Marketplace browsing is public — scoping happens in the query. */
    public function viewAny(?User $user): bool
    {
        return true;
    }

    public function view(?User $user, Part $part): bool
    {
        $status = $part->status instanceof PartStatus ? $part->status : PartStatus::from($part->status);

        if ($status->isListable()) {
            return true;
        }

        return $user !== null && ($this->owns($user, $part) || $user->hasRole('admin'));
    }

    public function create(User $user): bool
    {
        return $user->hasRole('seller', 'admin');
    }

    public function update(User $user, Part $part): bool
    {
        return $this->owns($user, $part) || $user->hasRole('admin');
    }

    public function delete(User $user, Part $part): bool
    {
        return $this->owns($user, $part) || $user->hasRole('admin');
    }

    private function owns(User $user, Part $part): bool
    {
        return (int) $part->seller_id === (int) $user->id;
    }
}
