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
     * Minimal dependency check — no business modules here.
     */
    public function __invoke(): JsonResponse
    {
        $checks = [
            'api' => 'ok',
            'database' => $this->checkDatabase(),
            'cache' => $this->checkCache(),
            'queue' => $this->checkQueue(),
        ];

        $status = in_array('fail', $checks, true) ? 503 : 200;

        return response()->json([
            'service' => config('app.name'),
            'version' => '0.1.0',
            'timestamp' => now()->toIso8601String(),
            'checks' => $checks,
        ], $status);
    }

    private function checkDatabase(): string
    {
        try {
            DB::connection()->getPdo();
            return 'ok';
        } catch (\Throwable) {
            return 'fail';
        }
    }

    private function checkCache(): string
    {
        try {
            // Uses CACHE_STORE (redis when configured, otherwise file/database).
            Cache::put('health:ping', 'pong', 10);
            return Cache::get('health:ping') === 'pong' ? 'ok' : 'fail';
        } catch (\Throwable) {
            return 'fail';
        }
    }

    private function checkQueue(): string
    {
        try {
            // Resolves default queue connection without pushing a job.
            Queue::connection();
            return 'ok';
        } catch (\Throwable) {
            return 'fail';
        }
    }
}
