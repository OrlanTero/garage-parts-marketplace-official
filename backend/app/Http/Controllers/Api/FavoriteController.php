<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Favorite\ToggleFavoriteRequest;
use App\Http\Resources\FavoriteResource;
use App\Models\Favorite;
use App\Services\FavoriteService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class FavoriteController extends Controller
{
    public function __construct(
        protected FavoriteService $favoriteService
    ) {}

    /**
     * List user's saved favorites with full item details and summary counts.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $type = $request->query('type');
        $perPage = min(max((int) $request->query('per_page', 15), 1), 100);

        $paginator = $this->favoriteService->listFavorites($request->user(), $type, $perPage);
        $counts = $this->favoriteService->getCounts($request->user());

        return FavoriteResource::collection($paginator)->additional([
            'meta' => [
                'counts' => $counts,
                'filter_type' => $type,
            ],
        ]);
    }

    /**
     * Return user's favorite IDs by type for fast cross-page UI indicators.
     */
    public function ids(Request $request): JsonResponse
    {
        $ids = $this->favoriteService->getFavoriteIds($request->user());

        return response()->json([
            'data' => $ids,
        ]);
    }

    /**
     * Toggle favorite status of a car build or automotive part.
     */
    public function toggle(ToggleFavoriteRequest $request): JsonResponse
    {
        $result = $this->favoriteService->toggle(
            $request->user(),
            $request->input('type'),
            (int) $request->input('id')
        );

        return response()->json([
            'data' => $result,
        ]);
    }

    /**
     * Add an item to favorites.
     */
    public function store(ToggleFavoriteRequest $request): JsonResponse
    {
        $result = $this->favoriteService->add(
            $request->user(),
            $request->input('type'),
            (int) $request->input('id')
        );

        return response()->json([
            'data' => $result,
        ], 201);
    }

    /**
     * Remove a specific item from favorites by favorite ID or type/item_id.
     */
    public function destroy(Request $request, ?int $id = null): JsonResponse
    {
        $user = $request->user();

        if ($id !== null) {
            $favorite = Favorite::where('id', $id)->where('user_id', $user->id)->first();
            if ($favorite) {
                $favorite->delete();
            }
        } elseif ($request->has('type') && $request->has('id')) {
            $this->favoriteService->remove($user, $request->input('type'), (int) $request->input('id'));
        } else {
            $this->favoriteService->clear($user, $request->query('type'));
        }

        $counts = $this->favoriteService->getCounts($user);

        return response()->json([
            'message' => 'Favorite updated successfully.',
            'data' => [
                'counts' => $counts,
            ],
        ]);
    }

    /**
     * Clear all user favorites.
     */
    public function clear(Request $request): JsonResponse
    {
        $deleted = $this->favoriteService->clear($request->user(), $request->query('type'));
        $counts = $this->favoriteService->getCounts($request->user());

        return response()->json([
            'message' => "Cleared {$deleted} favorite(s).",
            'data' => [
                'deleted_count' => $deleted,
                'counts' => $counts,
            ],
        ]);
    }
}
