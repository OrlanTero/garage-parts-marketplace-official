<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Queue;

class HealthController extends Controller
{
    /**
     * GET /api/v1/health
     * Dependency health probe with latency telemetry.
     */
    public function __invoke(): JsonResponse
    {
        $start = microtime(true);
        $errors = [];

        $dbStart = microtime(true);
        $dbStatus = $this->checkDatabase($errors);
        $dbMs = round((microtime(true) - $dbStart) * 1000, 2);

        $cacheStart = microtime(true);
        $cacheStatus = $this->checkCache($errors);
        $cacheMs = round((microtime(true) - $cacheStart) * 1000, 2);

        $queueStart = microtime(true);
        $queueStatus = $this->checkQueue($errors);
        $queueMs = round((microtime(true) - $queueStart) * 1000, 2);

        $checks = [
            'api' => 'ok',
            'database' => $dbStatus,
            'cache' => $cacheStatus,
            'queue' => $queueStatus,
        ];

        $isHealthy = !in_array('fail', $checks, true);
        $executionMs = round((microtime(true) - $start) * 1000, 2);

        $payload = [
            'status' => $isHealthy ? 'ok' : 'degraded',
            'service' => config('app.name'),
            'version' => '0.1.0',
            'timestamp' => now()->toIso8601String(),
            'execution_ms' => $executionMs,
            'checks' => $checks,
            'telemetry' => [
                'database_ms' => $dbMs,
                'cache_ms' => $cacheMs,
                'queue_ms' => $queueMs,
            ],
        ];

        if (!empty($errors)) {
            $payload['errors'] = $errors;
        }

        return response()->json($payload, $isHealthy ? 200 : 503);
    }

    private function checkDatabase(array &$errors): string
    {
        try {
            DB::connection()->getPdo();
            return 'ok';
        } catch (\Throwable $e) {
            $errors['database'] = $e->getMessage();
            return 'fail';
        }
    }

    private function checkCache(array &$errors): string
    {
        try {
            // Uses CACHE_STORE (redis when configured, otherwise file/database).
            Cache::put('health:ping', 'pong', 10);
            $success = Cache::get('health:ping') === 'pong';
            if (!$success) {
                $errors['cache'] = 'Cache ping test value did not match';
            }
            return $success ? 'ok' : 'fail';
        } catch (\Throwable $e) {
            $errors['cache'] = $e->getMessage();
            return 'fail';
        }
    }

    private function checkQueue(array &$errors): string
    {
        try {
            // Resolves default queue connection without pushing a job.
            Queue::connection();
            return 'ok';
        } catch (\Throwable $e) {
            $errors['queue'] = $e->getMessage();
            return 'fail';
        }
    }
}
