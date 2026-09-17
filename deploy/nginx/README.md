# Nginx Caching & Real-Time WebSocket Architecture

High-performance, scalable Nginx caching and WebSocket proxy configuration designed for the **Garage Parts Marketplace**.

---

## 1. System Architecture & Flow

```
                                    +-----------------------------------------+
                                    |               Clients                   |
                                    |   (Web Browser / SPA / Mobile Client)   |
                                    +--------------------+--------------------+
                                                         |
                                 HTTPS (443) / WSS / HTTP (80)
                                                         |
                                                         v
                                    +--------------------+--------------------+
                                    |              Nginx                      |
                                    |  - Rate Limiting Zones (API / WS)       |
                                    |  - SSL / TLS Termination                |
                                    |  - Open File Descriptor Cache           |
                                    |  - Gzip / Brotli Compression            |
                                    +----+---------------+---------------+----+
                                         |               |               |
                         Static / Assets |               | FastCGI       | WebSocket Upgrade
                                         |               | Microcache    | (HTTP/1.1)
                                         v               v               v
                +------------------------+--+  +---------+-------+  +----+------------------+
                |     Frontend (Vite)       |  |  PHP-FPM (API)  |  |  Reverb WebSocket     |
                | /assets/* (1yr immutable) |  | Laravel 12 API  |  | Cluster (Port 8080)   |
                | index.html (Zero Cache)   |  | FastCGI Cache   |  | Node 1 ... Node N     |
                +---------------------------+  +---------+-------+  +----+------------------+
                                                         |               ^
                                                         | Broadcast     | Redis Pub/Sub
                                                         | Events        | (Horizontal Scaling)
                                                         v               |
                                               +---------+---------------+----+
                                               |         Redis 7+             |
                                               |  - Broadcast Channel Queue   |
                                               |  - Reverb Scaled Cluster     |
                                               +------------------------------+
```

---

## 2. Directory Structure & Modular Breakdown

The Nginx setup is organized into modular files:

```
deploy/nginx/
├── nginx.conf                       # Main Nginx master configuration (optimized events & buffers)
├── conf.d/
│   ├── cache.conf                   # FastCGI cache path, zone allocation, and bypass maps
│   ├── rate_limiting.conf           # Rate limiting zones (API, Auth, WebSocket handshakes)
│   └── upstreams.conf               # Upstream connection pooling for PHP-FPM and Reverb
├── snippets/
│   ├── fastcgi_cache.conf           # FastCGI microcaching rules, locks, and stale cache
│   ├── security_headers.conf        # Production security headers (HSTS, CSP, X-Frame)
│   └── websocket_proxy.conf         # WebSocket reverse proxy headers and long timeouts
├── sites-available/
│   └── garage-parts.conf            # Multi-domain & single-domain site virtual hosts
├── garage-parts.conf                # Standalone all-in-one site config
└── README.md                        # Documentation & setup guide
```

---

## 3. Nginx Caching Flow

### A. Static Asset Caching (Frontend / Vite SPA)
- **Hashed Assets (`/assets/*`)**: Cached for **1 year** with `immutable` header (`max-age=31536000, immutable`). Since Vite hashes filenames on build (`index-DrTuiMCT.js`), browsers cache files indefinitely without checking the server.
- **Media & Images (`*.png`, `*.svg`, `*.webp`)**: Cached for **30 days** (`max-age=2592000`).
- **SPA Entrypoint (`index.html`)**: **Zero-cache** (`no-cache, no-store, must-revalidate`). Ensures newly deployed frontend versions load instantly without clients holding stale HTML bundles.

### B. FastCGI Microcaching (Backend API)
- **Memory Zone (`API_CACHE`)**: 100MB shared memory zone holding up to ~800,000 keys.
- **Microcache Duration**: Successful public `GET` requests (e.g. `/api/v1/marketplace/parts`, `/api/v1/marketplace/cars`) are cached for **10 seconds**.
- **Automated Bypass Rules**:
  - Any mutating HTTP method (`POST`, `PUT`, `PATCH`, `DELETE`).
  - Any request containing an `Authorization` header (Sanctum Bearer tokens).
  - Any request containing session cookies (`laravel_session`, `remember_token`).
  - Explicit bypass queries (`?nocache=1`).
- **Thundering Herd Protection**:
  - `fastcgi_cache_use_stale updating error timeout invalid_header http_500 http_503;` serves stale cached responses while a single background worker refreshes the cache.
  - `fastcgi_cache_lock on;` prevents multiple concurrent queries from overwhelming PHP-FPM for the same cache key.
- **Status Header**: Every API response includes `X-Cache-Status` (`HIT`, `MISS`, `BYPASS`, `EXPIRED`, `UPDATING`).

---

## 4. Scalable WebSocket Architecture (Laravel Reverb)

### A. Reverse Proxy Configuration
- **HTTP/1.1 Upgrade**: Proper `Upgrade` and `Connection` headers dynamically converted via `map $http_upgrade $connection_upgrade`.
- **Persistent Timeouts**: `proxy_read_timeout 86400s;` (24 hours) keeps persistent WebSocket connections open without premature drops.
- **Zero Buffering**: `proxy_buffering off;` delivers WebSocket frames to clients with zero buffer delay.

### B. Horizontal Scaling across Multiple Nodes
Reverb supports horizontal scaling across multiple servers and CPU cores using Redis:
1. In `.env`:
   ```env
   BROADCAST_CONNECTION=reverb
   REVERB_SCALING_ENABLED=true
   REVERB_SCALING_CHANNEL=reverb
   REDIS_HOST=127.0.0.1
   REDIS_PORT=6379
   ```
2. Start multiple Reverb workers:
   ```bash
   php artisan reverb:start --host=0.0.0.0 --port=8080
   php artisan reverb:start --host=0.0.0.0 --port=8081
   ```
3. In `deploy/nginx/conf.d/upstreams.conf`:
   ```nginx
   upstream reverb_backend {
       ip_hash;
       server 127.0.0.1:8080 max_fails=3 fail_timeout=10s;
       server 127.0.0.1:8081 max_fails=3 fail_timeout=10s;
       keepalive 64;
   }
   ```

---

## 5. Client WebSocket Module & Flow

The frontend real-time module (`frontend/src/realtime/`) provides a clean reactive flow:

1. **`echo.js`**:
   - Singleton Echo instance factory configured with dynamic Sanctum Bearer token authorizer.
   - Connection status monitoring (`connected`, `connecting`, `disconnected`, `unavailable`, `error`).
2. **`RealtimeContext.jsx`**:
   - React context provider `<RealtimeProvider>` exposing connection state and auto-reconnecting on login/logout.
3. **`useChannel.js` & `usePrivateChannel.js`**:
   - Lifecycle-managed hooks that automatically subscribe to channels and cleanup on unmount.
4. **`useMarketplaceEvents.js`**:
   - High-level hook listening to `marketplace.parts` and `marketplace.cars` for real-time inventory updates (`part.created`, `part.updated`, `part.sold`, `car.created`, `car.updated`, `car.sold`).

---

## 6. Linux Kernel & System Tuning (Production)

Add the following to `/etc/sysctl.conf` on high-concurrency production servers:

```ini
# Increase socket backlog for high connection bursts
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 65535

# Fast socket reuse
net.ipv4.tcp_tw_reuse = 1
net.ipv4.tcp_fin_timeout = 15

# Ephemeral port range
net.ipv4.ip_local_port_range = 1024 65535

# File descriptor limits
fs.file-max = 2097152
```

Apply with `sudo sysctl -p`.

---

## 7. Deployment & Verification Steps

1. Copy Nginx configuration files to your server:
   ```bash
   sudo cp deploy/nginx/nginx.conf /etc/nginx/nginx.conf
   sudo cp -r deploy/nginx/conf.d/* /etc/nginx/conf.d/
   sudo cp -r deploy/nginx/snippets/* /etc/nginx/snippets/
   sudo cp deploy/nginx/sites-available/garage-parts.conf /etc/nginx/sites-available/garage-parts.conf
   sudo ln -sf /etc/nginx/sites-available/garage-parts.conf /etc/nginx/sites-enabled/
   ```
2. Create cache directory with correct permissions:
   ```bash
   sudo mkdir -p /var/cache/nginx/fastcgi_api
   sudo chown -R www-data:www-data /var/cache/nginx
   ```
3. Test Nginx configuration:
   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```
4. Verify FastCGI Caching:
   ```bash
   # First request (Cache MISS)
   curl -I http://api.example.com/api/v1/marketplace/parts
   # X-Cache-Status: MISS

   # Second request within 10s (Cache HIT)
   curl -I http://api.example.com/api/v1/marketplace/parts
   # X-Cache-Status: HIT

   # Authenticated request (Cache BYPASS)
   curl -I -H "Authorization: Bearer <token>" http://api.example.com/api/v1/marketplace/parts
   # X-Cache-Status: BYPASS
   ```
