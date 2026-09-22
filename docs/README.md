# Garage Parts Marketplace — starter skeleton (no modules)

Monorepo: `frontend/` (React 18 + Vite) + `backend/` (Laravel 12 API). Core dependencies only.

| Concern | Choice |
|---|---|
| Frontend | React.js (Vite), React Router, Axios, Laravel Echo + pusher-js |
| Backend | Laravel / PHP 8.2+, Sanctum auth, Reverb WebSocket |
| Database | MySQL 8 |
| Cache | file default, Redis optional (`CACHE_STORE=redis`) |
| Queue | `database` default, Redis-ready (`QUEUE_CONNECTION=redis`) |
| Storage | local/`public` default, AWS EFS (`FILESYSTEM_DISK=efs`), or S3-ready (`FILESYSTEM_DISK=s3`) |
| Web server / OS | Nginx on Ubuntu |
| VCS / CI/CD | GitHub + GitHub Actions (`.github/workflows/ci.yml`) |

## Run locally
```bash
# 1. Infra (MySQL 8 + Redis)
docker compose up -d mysql redis

# 2. Backend
cd backend && cp .env.example .env
composer install
php artisan key:generate
php artisan migrate
php artisan serve          # :8000
php artisan reverb:start   # :8080 WebSocket
php artisan queue:work     # queue worker

# 3. Frontend
cd frontend && cp .env.example .env
npm install && npm run dev  # :5173 → proxies /api to :8000
```

Verify: open `http://localhost:5173` — Home page fetches `GET /api/v1/health`.

## Deploy notes (Ubuntu + Nginx)
- Examples in `deploy/nginx/garage-parts.conf` (API + SPA + Reverb proxy snippet).
- PHP 8.2 + `php8.2-fpm`, point Nginx root at `backend/public`.
- Set `FILESYSTEM_DISK=s3` + `AWS_*` to use S3-compatible storage.
- Set `CACHE_STORE=redis` / `QUEUE_CONNECTION=redis` when Redis is required.

> ⚠️ Local dev machine here runs PHP 8.0 — `composer install` for this skeleton requires PHP ≥ 8.2 (CI uses 8.2, prod is Ubuntu 8.2+).
