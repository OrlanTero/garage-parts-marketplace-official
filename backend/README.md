# Backend — Laravel 12 API skeleton

PHP 8.2+, MySQL 8, Sanctum, Reverb (WebSocket), Redis-ready, Queue-ready, S3-ready. No business modules.

## Quick start (Ubuntu)
```bash
cd backend
cp .env.example .env
composer install
php artisan key:generate
php artisan migrate
php artisan serve --host=0.0.0.0 --port=8000
# WebSocket:
php artisan reverb:start --host=0.0.0.0 --port=8080
# Queue:
php artisan queue:work
```

## Running on Windows (this machine)
- **PHP 8.3** (NOT the XAMPP 8.0): `C:\Users\RV Calamaya\AppData\Local\Microsoft\WinGet\Packages\PHP.PHP.8.3_Microsoft.Winget.Source_8wekyb3d8bbwe\php.exe`
  (or configure the same binary as PHPStorm's CLI interpreter).
- **Database**: XAMPP MariaDB on `127.0.0.1:3306`, DB `garage_parts_gpm` (root, no password). The pre-existing `garage_parts` DB contains an older, unrelated schema — left untouched.
- One-time: `php artisan key:generate && php artisan migrate` (already done).
- Serve: `php8 artisan serve --port=8000` (alias the path above to `php8`) and test in Postman.

Health: `GET /api/v1/health` → `{ service, version, checks: { api, database, cache, queue } }`
Auth proof: `GET /api/v1/me` (Bearer token via Sanctum).
