<?php

namespace App\Services;

use App\Models\Car;
use App\Models\Favorite;
use App\Models\Part;
use App\Models\User;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Collection;

class FavoriteService
{
    /**
     * Map friendly type string to Eloquent model class.
     */
    public function resolveModelClass(string $type): string
    {
        $normalized = strtolower(trim($type));

        return match ($normalized) {
            'car', 'cars', 'vehicle', 'vehicles' => Car::class,
            'part', 'parts', 'accessory', 'accessories' => Part::class,
            default => throw new \InvalidArgumentException("Invalid favorite type: {$type}. Expected 'car' or 'part'."),
        };
    }

    /**
     * Map Eloquent model class to friendly type string.
     */
    public function resolveTypeSlug(string $modelClass): string
    {
        return match ($modelClass) {
            Car::class => 'car',
            Part::class => 'part',
            default => 'item',
        };
    }

    /**
     * Toggle favorite state for a specific car or part.
     */
    public function toggle(User $user, string $type, int $id): array
    {
        $modelClass = $this->resolveModelClass($type);
        $slug = $this->resolveTypeSlug($modelClass);

        // Verify entity exists
        $entity = $modelClass::find($id);
        if (!$entity) {
            throw new ModelNotFoundException("The requested {$slug} (ID: {$id}) was not found.");
        }

        $existing = Favorite::where('user_id', $user->id)
            ->where('favoritable_type', $modelClass)
            ->where('favoritable_id', $id)
            ->first();

        if ($existing) {
            $existing->delete();
            $favorited = false;
            $message = "Removed from saved favorites.";
        } else {
            Favorite::create([
                'user_id' => $user->id,
                'favoritable_type' => $modelClass,
                'favoritable_id' => $id,
            ]);
            $favorited = true;
            $message = "Saved to favorites.";
        }

        $counts = $this->getCounts($user);

        return [
            'favorited' => $favorited,
            'type' => $slug,
            'id' => $id,
            'message' => $message,
            'counts' => $counts,
        ];
    }

    /**
     * Add a specific item to user favorites.
     */
    public function add(User $user, string $type, int $id): array
    {
        $modelClass = $this->resolveModelClass($type);
        $slug = $this->resolveTypeSlug($modelClass);

        $entity = $modelClass::findOrFail($id);

        Favorite::firstOrCreate([
            'user_id' => $user->id,
            'favoritable_type' => $modelClass,
            'favoritable_id' => $id,
        ]);

        return [
            'favorited' => true,
            'type' => $slug,
            'id' => $id,
            'message' => "Saved to favorites.",
            'counts' => $this->getCounts($user),
        ];
    }

    /**
     * Remove a specific item from user favorites.
     */
    public function remove(User $user, string $type, int $id): array
    {
        $modelClass = $this->resolveModelClass($type);
        $slug = $this->resolveTypeSlug($modelClass);

        Favorite::where('user_id', $user->id)
            ->where('favoritable_type', $modelClass)
            ->where('favoritable_id', $id)
            ->delete();

        return [
            'favorited' => false,
            'type' => $slug,
            'id' => $id,
            'message' => "Removed from favorites.",
            'counts' => $this->getCounts($user),
        ];
    }

    /**
     * Get all favorited IDs grouped by type for fast UI synchronization.
     */
    public function getFavoriteIds(User $user): array
    {
        $favorites = Favorite::where('user_id', $user->id)->get(['favoritable_type', 'favoritable_id']);

        $cars = [];
        $parts = [];

        foreach ($favorites as $fav) {
            if ($fav->favoritable_type === Car::class) {
                $cars[] = (int) $fav->favoritable_id;
            } elseif ($fav->favoritable_type === Part::class) {
                $parts[] = (int) $fav->favoritable_id;
            }
        }

        return [
            'cars' => array_values(array_unique($cars)),
            'parts' => array_values(array_unique($parts)),
            'total' => count($cars) + count($parts),
            'cars_count' => count($cars),
            'parts_count' => count($parts),
        ];
    }

    /**
     * Get summary counts for a user.
     */
    public function getCounts(User $user): array
    {
        $carsCount = Favorite::where('user_id', $user->id)->where('favoritable_type', Car::class)->count();
        $partsCount = Favorite::where('user_id', $user->id)->where('favoritable_type', Part::class)->count();

        return [
            'total' => $carsCount + $partsCount,
            'cars' => $carsCount,
            'parts' => $partsCount,
        ];
    }

    /**
     * List user's favorites with eager-loaded relations and pagination.
     */
    public function listFavorites(User $user, ?string $type = null, int $perPage = 15): LengthAwarePaginator
    {
        $query = Favorite::with(['favoritable' => function ($morphTo) {
            $morphTo->morphWith([
                Car::class => ['media', 'seller:id,name,email,role,avatar_url'],
                Part::class => ['media', 'seller:id,name,email,role,avatar_url'],
            ]);
        }])
        ->where('user_id', $user->id)
        ->latest('id');

        if ($type) {
            try {
                $modelClass = $this->resolveModelClass($type);
                $query->where('favoritable_type', $modelClass);
            } catch (\InvalidArgumentException) {
                // If invalid type provided, ignore filter or treat as empty
            }
        }

        return $query->paginate($perPage);
    }

    /**
     * Clear all user favorites or filtered by type.
     */
    public function clear(User $user, ?string $type = null): int
    {
        $query = Favorite::where('user_id', $user->id);

        if ($type) {
            $modelClass = $this->resolveModelClass($type);
            $query->where('favoritable_type', $modelClass);
        }

        return $query->delete();
    }
}
