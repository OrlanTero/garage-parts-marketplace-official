# API Routes — Full Marketplace (Postman-ready)

Base URL (local): `http://localhost:8000`  
Postman Collection: [`postman/garage-parts-session.postman_collection.json`](postman/garage-parts-session.postman_collection.json) → set `{{baseUrl}}` (default `http://localhost:8000`).  
Auth: Bearer token from register/login/OAuth callback → Postman `Authorization: Bearer {{token}}`.

Seeded Demo Accounts:
- **Admin**: `admin@garage.test` / `password`
- **Seller**: `seller@garage.test` / `password`
- **Buyer**: `buyer@garage.test` / `password`

---

## 1. System & Health Probes

| # | Method | URI | Auth | Purpose | Response |
|---|--------|-----|------|---------|----------|
| 1 | GET | `/api/v1/health` | no | API health check + DB/Cache/Queue status | `200 { service, version, checks: { api, database, cache, queue } }` |
| 2 | GET | `/up` | no | Laravel framework uptime check | `200` text |
| 3 | GET | `/` | no | Root welcome endpoint | `200 { service, message }` |
| 4 | GET | `/sanctum/csrf-cookie` | no | CSRF cookie initialization (if using SPA stateful cookies) | `204 No Content` |

---

## 2. Session & Authentication — Public

| # | Method | URI | Auth | Body / Query | Success |
|---|--------|-----|------|--------------|---------|
| 5 | POST | `/api/v1/auth/register` | no | `{ name, email, password, password_confirmation, role: "buyer"\|"seller" }` | `201 { token, token_type: "Bearer", user }` |
| 6 | POST | `/api/v1/auth/login` | no | `{ email, password, device_name? }` | `200 { token, token_type: "Bearer", user }` |
| 7 | GET | `/api/v1/auth/oauth/{provider}/redirect` | no | provider ∈ `google, facebook, github`; query `role=buyer\|seller`, `frontend=1` for real 302 | `200 { url }` (or 302) |
| 8 | GET | `/api/v1/auth/oauth/{provider}/callback` | no | provider callback from IdP; `?frontend=1` → 302 to `FRONTEND_URL/oauth/callback?token=…&provider=…` | `200 { token, token_type, provider, user }` (or 302) |

---

## 3. Session & Authentication — Authenticated (Bearer Token)

| # | Method | URI | Auth | Purpose |
|---|--------|-----|------|---------|
| 9 | GET | `/api/v1/auth/me` | Sanctum | Current authenticated user profile (`UserResource`) |
| 10 | GET | `/api/v1/me` | Sanctum | Legacy alias of `/api/v1/auth/me` |
| 11 | GET | `/api/v1/_session/ping-buyer` | Sanctum + `role:buyer` | Role probe → `200 { ok: true, as: "buyer" }` |
| 12 | GET | `/api/v1/_session/ping-seller` | Sanctum + `role:seller` | Role probe → `200 { ok: true, as: "seller" }` |
| 13 | POST | `/api/v1/auth/logout` | Sanctum | Revoke current device token |
| 14 | POST | `/api/v1/auth/logout-all` | Sanctum | Revoke all tokens across all devices |

---

## 4. Cars — Public Marketplace (no auth)

Only `status=active` cars are listed. Paginated: `{ data: CarResource[], links, meta }`.

| # | Method | URI | Purpose |
|---|--------|-----|---------|
| 15 | GET | `/api/v1/marketplace/cars` | List active cars + filters + sort + pagination |
| 16 | GET | `/api/v1/marketplace/cars/{car}` | Single active car details + media gallery (draft/sold → 403 for guests) |

### Query parameters for `/api/v1/marketplace/cars`:
- `search` (keyword across title, brand, model)
- `brand`, `model`, `body_style`, `fuel_type`, `transmission`, `condition`, `city`
- `min_price`, `max_price`, `min_year`, `max_year`, `max_mileage`
- `sort`: `newest`, `price_asc`, `price_desc`, `mileage_asc`, `year_desc`
- `per_page`: `1`–`50` (default: 15)
- `page`: page number

---

## 5. Cars — Seller Inventory (Sanctum + `role:seller,admin`)

| # | Method | URI | Body | Success |
|---|--------|-----|------|---------|
| 17 | GET | `/api/v1/seller/cars` | query `status?`, `per_page?`, `page?` | `200` paginated seller cars |
| 18 | POST | `/api/v1/seller/cars` | `{ title, brand, model, year, price, original_price?, mileage_km?, body_style?, fuel_type?, transmission?, condition?, tag?, color?, vin?, city?, location?, rating?, inspection_score?, description?, images?: [...] }` | `201 { data: CarResource(draft) }` |
| 19 | GET | `/api/v1/seller/cars/{car}` | — | `200` Car details (owner or admin) |
| 20 | PUT | `/api/v1/seller/cars/{car}` | Full car payload + `images` | `200` Updated car resource |
| 21 | PATCH | `/api/v1/seller/cars/{car}` | Partial fields (e.g. `price`, `city`, `tag`) | `200` Updated car resource |
| 22 | POST | `/api/v1/seller/cars/{car}/publish` | — | `200` draft/archived → `active` (+`published_at`) |
| 23 | POST | `/api/v1/seller/cars/{car}/unpublish` | — | `200` active → `draft` |
| 24 | POST | `/api/v1/seller/cars/{car}/sold` | — | `200` active → `sold` (+`sold_at`) |
| 25 | DELETE | `/api/v1/seller/cars/{car}` | — | `200 { message }` (soft delete) |

---

## 6. Parts — Public Marketplace (no auth)

Only `status=active` parts are listed. Paginated: `{ data: PartResource[], links, meta }`.

| # | Method | URI | Purpose |
|---|--------|-----|---------|
| 26 | GET | `/api/v1/marketplace/parts` | List active parts + filters + sort + pagination |
| 27 | GET | `/api/v1/marketplace/parts/{part}` | Single active part details + media gallery (draft/sold → 403 for guests) |

### Query parameters for `/api/v1/marketplace/parts`:
- `search` (keyword across title, brand, part_number)
- `category` (`engine`, `transmission`, `suspension`, `brakes`, `exhaust`, `electrical`, `tires_wheels`, `wheels`, `body_exterior`, `interior`, `fluids_lubricants`, `accessories`, `other`)
- `brand`, `condition` (`new`, `used`, `refurbished`), `city`, `in_stock=1`
- `min_price`, `max_price`
- `sort`: `newest`, `price_asc`, `price_desc`
- `per_page`: `1`–`50` (default: 15)
- `page`: page number

---

## 7. Parts — Seller Inventory (Sanctum + `role:seller,admin`)

| # | Method | URI | Body | Success |
|---|--------|-----|------|---------|
| 28 | GET | `/api/v1/seller/parts` | query `status?`, `per_page?`, `page?` | `200` paginated seller parts |
| 29 | POST | `/api/v1/seller/parts` | `{ title, category, brand?, part_number?, compatibility?, condition?, tag?, quantity?, price, original_price?, free_shipping?, description?, city?, location?, rating?, reviews_count?, images?: [...] }` | `201 { data: PartResource(draft) }` |
| 30 | GET | `/api/v1/seller/parts/{part}` | — | `200` Part details (owner or admin) |
| 31 | PUT | `/api/v1/seller/parts/{part}` | Full part payload + `images` | `200` Updated part resource |
| 32 | PATCH | `/api/v1/seller/parts/{part}` | Partial fields (e.g. `price`, `quantity`, `free_shipping`) | `200` Updated part resource |
| 33 | POST | `/api/v1/seller/parts/{part}/publish` | — | `200` draft/archived → `active` (+`published_at`) |
| 34 | POST | `/api/v1/seller/parts/{part}/unpublish` | — | `200` active → `draft` |
| 35 | POST | `/api/v1/seller/parts/{part}/sold` | — | `200` active → `sold` (+`sold_at`) |
| 36 | DELETE | `/api/v1/seller/parts/{part}` | — | `200 { message }` (soft delete) |

---

## 8. Multi-Media Payload Format

Both Cars and Parts support array payloads for `images` or `media`:
```json
"images": [
  {
    "url": "https://example.com/photo-1.jpg",
    "type": "image",
    "is_primary": true,
    "order": 0,
    "caption": "Front view"
  },
  "https://example.com/photo-2.jpg"
]
```
Serialized output in `CarResource` and `PartResource` provides:
- `primary_image_url` / `img`
- `image_urls`: string array of all image URLs
- `media` / `images`: array of `MediaResource` `{ id, url, type, is_primary, order, caption }`

---

## 9. Realtime WebSocket & Broadcasting (Laravel Reverb)

Broadcasting driver: Laravel Reverb (`ws://localhost:8080`, Pusher protocol v7).

| # | Method | URI | Auth | Body / Channels | Purpose |
|---|--------|-----|------|-----------------|---------|
| 37 | POST | `/api/v1/broadcasting/auth` | Sanctum | `{ socket_id, channel_name }` | Authorize private and presence WebSocket subscriptions |

### Channel Authorization Matrix:
- `marketplace.parts` *(Public)*: Live part listings, updates, and sold events (`part.created`, `part.updated`, `part.status_changed`, `part.sold`).
- `marketplace.cars` *(Public)*: Live car listings, updates, and sold events (`car.created`, `car.updated`, `car.status_changed`, `car.sold`).
- `parts.{id}`, `cars.{id}` *(Public)*: Single inventory item live price, status, and media updates.
- `private-user.{id}` *(Private Sanctum)*: Direct user notifications and personal transaction events (`notification.sent`, `part.created`, `car.created`).
- `private-seller.{id}` *(Private Sanctum + Role: seller, admin)*: Seller inventory activity and real-time order alerts.
- `presence-marketplace` *(Presence Sanctum)*: Live browsing counter and active user presence state.

---

## 10. Nginx Caching & Edge Performance Layer

FastCGI microcaching rules configured under `deploy/nginx/`:

| Endpoint / Request Type | Cache Behavior | Cache Status Header | TTL |
|-------------------------|----------------|---------------------|-----|
| `GET /api/v1/marketplace/cars` (Guest) | FastCGI Microcache | `X-Cache-Status: HIT` / `MISS` | 10 seconds |
| `GET /api/v1/marketplace/parts` (Guest) | FastCGI Microcache | `X-Cache-Status: HIT` / `MISS` | 10 seconds |
| Authenticated requests (`Authorization: Bearer …`) | Cache Bypass | `X-Cache-Status: BYPASS` | 0s (no-cache) |
| Mutating requests (`POST`, `PUT`, `PATCH`, `DELETE`) | Cache Bypass | `X-Cache-Status: BYPASS` | 0s (no-cache) |
| Static assets (`/assets/*`, images, css, js) | Browser / Edge Cache | `Cache-Control: public, max-age=31536000, immutable` | 1 year |
