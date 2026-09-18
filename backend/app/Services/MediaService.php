<?php

namespace App\Services;

use App\Models\Media;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Media service: handles file uploads, metadata extraction,
 * storage disk operations (local/public or AWS S3), and media records.
 */
class MediaService
{
    /**
     * Storage disk to use (defaults to 'public', easily swappable to 's3' in .env)
     */
    protected string $disk;

    public function __construct()
    {
        $this->disk = config('filesystems.default', 'public');
    }

    /**
     * Get the active filesystem disk name.
     */
    public function getDisk(): string
    {
        return $this->disk;
    }

    /**
     * Upload a single file and create a Media record.
     */
    public function upload(UploadedFile $file, array $attributes = []): Media
    {
        $directory = $attributes['folder'] ?? ('media/' . date('Y/m'));
        $originalName = $file->getClientOriginalName();
        $mimeType = $file->getClientMimeType() ?: $file->getMimeType();
        $sizeBytes = $file->getSize();

        // Determine media type
        $type = $attributes['type'] ?? $this->detectMediaType($mimeType);

        // Generate safe unique filename preserving original extension
        $extension = $file->getClientOriginalExtension() ?: 'jpg';
        $safeBase = Str::slug(pathinfo($originalName, PATHINFO_FILENAME));
        $uniqueName = ($safeBase ? $safeBase . '-' : '') . Str::random(12) . '.' . $extension;

        // Store file onto the configured disk (public or S3)
        $path = $file->storeAs($directory, $uniqueName, $this->disk);

        // Resolve public URL (works with local public storage and S3 buckets)
        $url = Storage::disk($this->disk)->url($path);

        $mediaData = [
            'mediable_type' => $attributes['mediable_type'] ?? null,
            'mediable_id' => $attributes['mediable_id'] ?? null,
            'url' => $url,
            'type' => $type,
            'is_primary' => (bool) ($attributes['is_primary'] ?? false),
            'order' => (int) ($attributes['order'] ?? 0),
            'caption' => $attributes['caption'] ?? null,
            'file_path' => $path,
            'file_name' => $originalName,
            'mime_type' => $mimeType,
            'size_bytes' => $sizeBytes,
        ];

        return Media::create($mediaData);
    }

    /**
     * Upload multiple files in batch and return a collection of Media models.
     *
     * @param array<UploadedFile> $files
     * @return Collection<int, Media>
     */
    public function uploadMultiple(array $files, array $attributes = []): Collection
    {
        $results = collect();
        $startOrder = (int) ($attributes['order'] ?? 0);

        foreach (array_values($files) as $index => $file) {
            if ($file instanceof UploadedFile) {
                $fileAttributes = $attributes;
                $fileAttributes['order'] = $startOrder + $index;
                $fileAttributes['is_primary'] = ($index === 0 && ($attributes['is_primary'] ?? false));

                $results->push($this->upload($file, $fileAttributes));
            }
        }

        return $results;
    }

    /**
     * Attach an existing media item or new media item to a mediable model (Car, Part, etc.)
     */
    public function attachToModel(Model $model, Media $media, array $overrides = []): Media
    {
        $media->update([
            'mediable_type' => $model->getMorphClass(),
            'mediable_id' => $model->getKey(),
            ...$overrides,
        ]);

        return $media->refresh();
    }

    /**
     * Delete a media record and remove its underlying file from storage.
     */
    public function delete(Media $media): bool
    {
        if (!empty($media->file_path) && Storage::disk($this->disk)->exists($media->file_path)) {
            Storage::disk($this->disk)->delete($media->file_path);
        }

        return (bool) $media->delete();
    }

    /**
     * Detect category type ('image', 'video', 'document') from MIME type.
     */
    protected function detectMediaType(?string $mimeType): string
    {
        if (!$mimeType) {
            return 'image';
        }

        if (str_starts_with($mimeType, 'image/')) {
            return 'image';
        }

        if (str_starts_with($mimeType, 'video/')) {
            return 'video';
        }

        return 'document';
    }
}
