<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Symfony\Component\Console\Output\BufferedOutput;

class SystemMaintenanceController extends Controller
{
    /**
     * Verify maintenance authorization token or admin credentials.
     */
    private function isAuthorized(Request $request): bool
    {
        $configuredSecret = env('MAINTENANCE_TOKEN');
        $appKey = config('app.key');

        $providedToken = $request->header('X-Maintenance-Token')
            ?? $request->header('X-App-Key')
            ?? $request->input('token')
            ?? $request->input('secret');

        // Allow match against MAINTENANCE_TOKEN if set
        if (!empty($configuredSecret) && !empty($providedToken) && hash_equals($configuredSecret, $providedToken)) {
            return true;
        }

        // Allow match against APP_KEY
        if (!empty($appKey) && !empty($providedToken) && hash_equals($appKey, $providedToken)) {
            return true;
        }

        // Allow authenticated admin users via Sanctum guard or Bearer token
        $user = Auth::guard('sanctum')->user() ?? Auth::user() ?? $request->user();
        if ($user && method_exists($user, 'isAdmin') && $user->isAdmin()) {
            return true;
        }

        $bearer = $request->bearerToken();
        if (!empty($bearer)) {
            $accessToken = \Laravel\Sanctum\PersonalAccessToken::findToken($bearer);
            if ($accessToken && $accessToken->tokenable && method_exists($accessToken->tokenable, 'isAdmin') && $accessToken->tokenable->isAdmin()) {
                return true;
            }
        }

        return false;
    }

    /**
     * Get migration status of the connected database.
     */
    public function status(Request $request): JsonResponse
    {
        if (!$this->isAuthorized($request)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Unauthorized. Provide valid X-Maintenance-Token, X-App-Key, or Admin Bearer Token.',
            ], 401);
        }

        try {
            $output = new BufferedOutput();
            $exitCode = Artisan::call('migrate:status', [], $output);

            return response()->json([
                'status' => $exitCode === 0 ? 'success' : 'failed',
                'command' => 'migrate:status',
                'exit_code' => $exitCode,
                'output' => $output->fetch(),
                'database' => [
                    'driver' => DB::connection()->getDriverName(),
                    'database' => DB::connection()->getDatabaseName(),
                ],
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to check migration status: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Run database migrations (php artisan migrate --force).
     */
    public function migrate(Request $request): JsonResponse
    {
        if (!$this->isAuthorized($request)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Unauthorized. Provide valid X-Maintenance-Token, X-App-Key, or Admin Bearer Token.',
            ], 401);
        }

        try {
            $output = new BufferedOutput();
            $exitCode = Artisan::call('migrate', ['--force' => true], $output);

            return response()->json([
                'status' => $exitCode === 0 ? 'success' : 'failed',
                'command' => 'migrate --force',
                'exit_code' => $exitCode,
                'output' => $output->fetch(),
                'timestamp' => now()->toIso8601String(),
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Migration failed: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Run database seeders (php artisan db:seed --force).
     */
    public function seed(Request $request): JsonResponse
    {
        if (!$this->isAuthorized($request)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Unauthorized. Provide valid X-Maintenance-Token, X-App-Key, or Admin Bearer Token.',
            ], 401);
        }

        try {
            $output = new BufferedOutput();
            $exitCode = Artisan::call('db:seed', ['--force' => true], $output);

            return response()->json([
                'status' => $exitCode === 0 ? 'success' : 'failed',
                'command' => 'db:seed --force',
                'exit_code' => $exitCode,
                'output' => $output->fetch(),
                'timestamp' => now()->toIso8601String(),
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Seeding failed: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Run both migrations and seeders in sequence.
     */
    public function migrateAndSeed(Request $request): JsonResponse
    {
        if (!$this->isAuthorized($request)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Unauthorized. Provide valid X-Maintenance-Token, X-App-Key, or Admin Bearer Token.',
            ], 401);
        }

        try {
            $migrateOutput = new BufferedOutput();
            $migrateExit = Artisan::call('migrate', ['--force' => true], $migrateOutput);

            $seedOutput = new BufferedOutput();
            $seedExit = Artisan::call('db:seed', ['--force' => true], $seedOutput);

            return response()->json([
                'status' => ($migrateExit === 0 && $seedExit === 0) ? 'success' : 'partial_or_failed',
                'command' => 'migrate + db:seed',
                'migrate_exit_code' => $migrateExit,
                'migrate_output' => $migrateOutput->fetch(),
                'seed_exit_code' => $seedExit,
                'seed_output' => $seedOutput->fetch(),
                'timestamp' => now()->toIso8601String(),
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Migration & seeding failed: ' . $e->getMessage(),
            ], 500);
        }
    }
}
