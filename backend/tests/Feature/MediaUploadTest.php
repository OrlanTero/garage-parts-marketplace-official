<?php

namespace Tests\Feature;

use App\Models\Car;
use App\Models\Media;
use App\Models\Part;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MediaUploadTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
    }

    private function authToken(User $user): array
    {
        return ['Authorization' => 'Bearer '.$user->createToken('test')->plainTextToken];
    }

    public function test_guest_cannot_upload_media(): void
    {
        $file = UploadedFile::fake()->image('turbo.jpg', 1200, 800);

        $response = $this->postJson('/api/v1/media/upload', [
            'file' => $file,
        ]);

        $response->assertStatus(401);
    }

    public function test_authenticated_user_can_upload_single_high_resolution_image(): void
    {
        $seller = User::factory()->seller()->create();
        $file = UploadedFile::fake()->image('silvia-front-4k.jpg', 3840, 2160)->size(4500); // 4.5MB

        $response = $this->postJson('/api/v1/media/upload', [
            'file' => $file,
            'caption' => 'Front 3/4 walkaround view',
            'is_primary' => true,
        ], $this->authToken($seller));

        $response->assertStatus(201)
            ->assertJsonStructure([
                'data' => [
                    'id',
                    'url',
                    'type',
                    'is_primary',
                    'order',
                    'caption',
                    'file_name',
                    'file_path',
                    'mime_type',
                    'size_bytes',
                    'human_size',
                ],
            ]);

        $mediaId = $response->json('data.id');
        $filePath = $response->json('data.file_path');

        $this->assertDatabaseHas('media', [
            'id' => $mediaId,
            'file_name' => 'silvia-front-4k.jpg',
            'is_primary' => true,
            'caption' => 'Front 3/4 walkaround view',
        ]);

        Storage::disk('public')->assertExists($filePath);
    }

    public function test_authenticated_user_can_upload_batch_multiple_images(): void
    {
        $seller = User::factory()->seller()->create();
        $files = [
            UploadedFile::fake()->image('interior.jpg', 1920, 1080),
            UploadedFile::fake()->image('engine.jpg', 1920, 1080),
            UploadedFile::fake()->image('rear.jpg', 1920, 1080),
        ];

        $response = $this->postJson('/api/v1/media/upload', [
            'files' => $files,
        ], $this->authToken($seller));

        $response->assertStatus(201)
            ->assertJsonCount(3, 'data');

        $uploaded = $response->json('data');
        foreach ($uploaded as $item) {
            Storage::disk('public')->assertExists($item['file_path']);
            $this->assertDatabaseHas('media', ['id' => $item['id']]);
        }
    }

    public function test_upload_validates_file_types_and_size_limit(): void
    {
        $seller = User::factory()->seller()->create();

        // Invalid file format (.exe)
        $invalidFile = UploadedFile::fake()->create('malicious.exe', 500, 'application/x-msdownload');
        $response = $this->postJson('/api/v1/media/upload', [
            'file' => $invalidFile,
        ], $this->authToken($seller));
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['file']);

        // File too large (> 20MB)
        $tooLargeFile = UploadedFile::fake()->create('huge-video.mp4', 25000, 'video/mp4');
        $response = $this->postJson('/api/v1/media/upload', [
            'file' => $tooLargeFile,
        ], $this->authToken($seller));
        $response->assertStatus(422)
            ->assertJsonValidationErrors(['file']);
    }

    public function test_upload_can_be_attached_directly_to_car(): void
    {
        $seller = User::factory()->seller()->create();
        $car = Car::factory()->create(['seller_id' => $seller->id]);
        $file = UploadedFile::fake()->image('car-engine.jpg', 2000, 1500);

        $response = $this->postJson('/api/v1/media/upload', [
            'file' => $file,
            'car_id' => $car->id,
            'is_primary' => true,
        ], $this->authToken($seller));

        $response->assertStatus(201);
        $mediaId = $response->json('data.id');

        $this->assertDatabaseHas('media', [
            'id' => $mediaId,
            'mediable_type' => Car::class,
            'mediable_id' => $car->id,
            'is_primary' => true,
        ]);

        $this->assertEquals(1, $car->fresh()->media()->count());
    }

    public function test_upload_can_be_attached_directly_to_part(): void
    {
        $partsSeller = User::factory()->partsSeller()->create();
        $part = Part::factory()->create(['seller_id' => $partsSeller->id]);
        $file = UploadedFile::fake()->image('brake-caliper.png', 1200, 1200);

        $response = $this->postJson('/api/v1/media/upload', [
            'file' => $file,
            'part_id' => $part->id,
            'is_primary' => true,
        ], $this->authToken($partsSeller));

        $response->assertStatus(201);
        $mediaId = $response->json('data.id');

        $this->assertDatabaseHas('media', [
            'id' => $mediaId,
            'mediable_type' => Part::class,
            'mediable_id' => $part->id,
        ]);

        $this->assertEquals(1, $part->fresh()->media()->count());
    }

    public function test_user_can_delete_uploaded_media_and_file_is_removed_from_storage(): void
    {
        $seller = User::factory()->seller()->create();
        $file = UploadedFile::fake()->image('rims.jpg', 1600, 1200);

        $uploadResponse = $this->postJson('/api/v1/media/upload', [
            'file' => $file,
        ], $this->authToken($seller));

        $mediaId = $uploadResponse->json('data.id');
        $filePath = $uploadResponse->json('data.file_path');

        Storage::disk('public')->assertExists($filePath);

        $deleteResponse = $this->deleteJson("/api/v1/media/{$mediaId}", [], $this->authToken($seller));
        $deleteResponse->assertStatus(200)
            ->assertJson(['message' => 'Media deleted successfully']);

        $this->assertDatabaseMissing('media', ['id' => $mediaId]);
        Storage::disk('public')->assertMissing($filePath);
    }

    public function test_uploaded_media_file_can_be_accessed_via_storage_url(): void
    {
        $seller = User::factory()->seller()->create();
        $file = UploadedFile::fake()->image('engine-bay.jpg', 800, 600);

        $uploadResponse = $this->postJson('/api/v1/media/upload', [
            'file' => $file,
        ], $this->authToken($seller));

        $uploadResponse->assertStatus(201);
        $filePath = $uploadResponse->json('data.file_path');

        $response = $this->get('/storage/'.$filePath);
        $response->assertStatus(200);
    }

    public function test_non_existent_storage_file_returns_404(): void
    {
        $response = $this->get('/storage/media/non-existent-file.jpg');
        $response->assertStatus(404);
    }
}
