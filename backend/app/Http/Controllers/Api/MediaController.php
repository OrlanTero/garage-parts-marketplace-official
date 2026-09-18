<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\MediaResource;
use App\Models\Car;
use App\Models\Media;
use App\Models\Part;
use App\Services\MediaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class MediaController extends Controller
{
    public function __construct(
        protected MediaService $mediaService
    ) {}

    /**
     * Upload one or multiple media files.
     * Supports high-resolution images, videos, and documents.
     */
    public function upload(Request $request): JsonResponse|MediaResource|AnonymousResourceCollection
    {
        $validated = $request->validate([
            'file' => ['required_without:files', 'file', 'max:20480', 'mimes:jpeg,jpg,png,webp,gif,heic,avif,mp4,webm,mov,pdf'],
            'files' => ['required_without:file', 'array', 'max:15'],
            'files.*' => ['file', 'max:20480', 'mimes:jpeg,jpg,png,webp,gif,heic,avif,mp4,webm,mov,pdf'],
            'mediable_type' => ['sometimes', 'nullable', 'string', 'max:255'],
            'mediable_id' => ['sometimes', 'nullable', 'integer'],
            'car_id' => ['sometimes', 'nullable', 'integer', 'exists:cars,id'],
            'part_id' => ['sometimes', 'nullable', 'integer', 'exists:parts,id'],
            'type' => ['sometimes', 'nullable', 'string', Rule::in(['image', 'video', 'document'])],
            'caption' => ['sometimes', 'nullable', 'string', 'max:255'],
            'is_primary' => ['sometimes', 'boolean'],
            'order' => ['sometimes', 'integer', 'min:0'],
            'folder' => ['sometimes', 'nullable', 'string', 'max:50'],
        ]);

        // Resolve mediable morph type if shortcut ID was passed
        if (!empty($validated['car_id'])) {
            $validated['mediable_type'] = Car::class;
            $validated['mediable_id'] = (int) $validated['car_id'];
        } elseif (!empty($validated['part_id'])) {
            $validated['mediable_type'] = Part::class;
            $validated['mediable_id'] = (int) $validated['part_id'];
        }

        // Multi-file upload
        if ($request->hasFile('files')) {
            $uploadedFiles = $request->file('files');
            $mediaCollection = $this->mediaService->uploadMultiple($uploadedFiles, $validated);

            return response()->json([
                'message' => 'Files uploaded successfully',
                'data' => MediaResource::collection($mediaCollection),
            ], 201);
        }

        // Single file upload
        if ($request->hasFile('file')) {
            $uploadedFile = $request->file('file');
            $media = $this->mediaService->upload($uploadedFile, $validated);

            return (new MediaResource($media))
                ->additional(['message' => 'File uploaded successfully'])
                ->response()
                ->setStatusCode(201);
        }

        return response()->json(['message' => 'No files provided for upload'], 422);
    }

    /**
     * Get details of a single media item.
     */
    public function show(Media $media): MediaResource
    {
        return new MediaResource($media);
    }

    /**
     * Delete a media item and remove file from disk.
     */
    public function destroy(Request $request, Media $media): JsonResponse
    {
        $user = $request->user();

        // If media is associated to a car or part, ensure user owns the parent entity or is admin
        if ($media->mediable) {
            $sellerId = $media->mediable->seller_id ?? null;
            if ($sellerId && $user && $user->id !== $sellerId && !$user->isAdmin()) {
                return response()->json(['message' => 'Forbidden. You do not own this media.'], 403);
            }
        }

        $id = $media->id;
        $this->mediaService->delete($media);

        return response()->json([
            'message' => 'Media deleted successfully',
            'id' => $id,
        ], 200);
    }
}
