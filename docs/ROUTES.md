# API Routes — Session + Cars + Parts Modules (Postman-ready)

Base URL (local): `http://localhost:8000`
Import: [`postman/garage-parts-session.postman_collection.json`](postman/garage-parts-session.postman_collection.json) → set `{{baseUrl}}` (default `http://localhost:8000`).
Auth: Bearer token from register/login/OAuth callback → Postman `Authorization: Bearer {{token}}`.

No login UI exists yet — these are pure backend ↔ frontend session endpoints.

## 1. System

| # | Method | URI | Auth | Purpose |
|---|--------|-----|------|---------|
| 1 | GET | `/up` | no | Laravel health probe |
| 2 | GET | `/api/v1/health` | no | `{ service, version, checks: { api, database, cache, queue } }` |
| 3 | GET | `/` | no | `{ service, message }` (web) |

## 2. Session — public (credential + OAuth entry)

| # | Method | URI | Auth | Body / Query | Success |
|---|--------|-----|------|--------------|---------|
| 4 | POST | `/api/v1/auth/register` | no | `{ name, email, password, password_confirmation, role?: buyer\|seller }` | `201 { token, token_type: Bearer, user }` |
| 5 | POST | `/api/v1/auth/login` | no | `{ email, password, device_name? }` | `200 { token, token_type, user }` |
| 6 | GET | `/api/v1/auth/oauth/{provider}/redirect` | no | provider ∈ `google, facebook, github`; query `role=buyer\|seller`, `frontend=1` for real 302 | `200 { url }` (or 302) |
| 7 | GET | `/api/v1/auth/oauth/{provider}/callback` | no | provider callback from IdP; `?frontend=1` (or HTML Accept) → 302 to `FRONTEND_URL/oauth/callback?token=…&provider=…` | `200 { token, token_type, provider, user }` (or 302) |

Validation notes: `role` self-selectable = `buyer|seller` only (`admin` → 422). Bad credentials → 422. Unconfigured provider → 503 with the missing env keys named.

## 3. Session — authenticated (Bearer required)

| # | Method | URI | Auth | Purpose |
|---|--------|-----|------|---------|
| 8 | GET | `/api/v1/auth/me` | Sanctum | Current session user (`UserResource`) |
| 9 | GET | `/api/v1/me` | Sanctum | Legacy alias of #8 (pre-session-module clients) |
| 10 | POST | `/api/v1/auth/logout` | Sanctum | Revoke current token |
| 11 | POST | `/api/v1/auth/logout-all` | Sanctum | Revoke all tokens (all devices) |
| 12 | GET | `/api/v1/_session/ping-buyer` | Sanctum + `role:buyer` | Role probe → 200 buyer / 403 others / 401 guest |
| 13 | GET | `/api/v1/_session/ping-seller` | Sanctum + `role:seller` | Role probe → 200 seller / 403 others / 401 guest |

## 4. Canonical shapes

`user` (UserResource): `{ id, name, email, role, provider, avatar_url, email_verified_at, last_login_at }`
Session envelope: `{ token, token_type: "Bearer", user }`

## 5. Postman test order (suggested)

1. `GET /api/v1/health` → 200.
2. `POST register` as buyer → copy `token` → `{{token}}`.
3. `GET /auth/me` → 200, `role=buyer`.
4. `GET /_session/ping-buyer` → 200; `GET /_session/ping-seller` → 403 (proves role guard).
5. Register second account as seller, repeat swapped (seller ping 200 / buyer ping 403).
6. `POST /auth/login` (seller) → new token works.
7. `POST /auth/logout` → old token 401 on `/auth/me`.
8. OAuth (needs provider console setup): `GET redirect` → open `url` in browser → provider login → callback returns `{ token, user }` (or follow `?frontend=1` 302).
9. `POST /auth/logout-all` → all tokens dead.

## 6. OAuth setup checklist (per provider)

1. Provider console → OAuth client (type Web) → redirect URI = `{APP_URL}/api/v1/auth/oauth/{provider}/callback` (must match exactly).
2. Backend `.env`: `{PROVIDER}_CLIENT_ID / _SECRET / _REDIRECT_URI`.
3. `GET .../redirect` returns usable URL only when configured — otherwise 503 names the missing keys.

Error map: unknown provider → 404 (route constraint); unsupported → 422; exchange failure → 401; guest on protected → 401; wrong role → 403.

---

## 7. Cars — public marketplace (no auth)

Only `status=active` cars appear here. Paginated: `{ data: CarResource[], links, meta }`.

| # | Method | URI | Purpose |
|---|--------|-----|---------|
| 14 | GET | `/api/v1/marketplace/cars` | List active cars + filters + sort + pagination |
| 15 | GET | `/api/v1/marketplace/cars/{car}` | Single active car (draft/sold → 403 for guests) |

Query params for #14: `search` (title/brand/model), `brand`, `model`, `body_style`, `fuel_type`, `transmission`, `condition`, `city`, `min_price`, `max_price`, `min_year`, `max_year`, `max_mileage`, `sort=newest|price_asc|price_desc|mileage_asc|year_desc`, `per_page` (1–50, default 15), `page`.

Enum values: `body_style` ∈ sedan/hatchback/suv/crossover/coupe/convertible/pickup/van/wagon/other · `fuel_type` ∈ petrol/diesel/hybrid/electric/other · `transmission` ∈ manual/automatic/semi_automatic · `condition` ∈ new/used.

## 8. Cars — seller inventory (Sanctum + `role:seller,admin`)

New cars are created as `draft` (invisible publicly). Status changes only via transition endpoints — `status` is never mass-assignable.

| # | Method | URI | Body | Success |
|---|--------|-----|------|---------|
| 16 | GET | `/api/v1/seller/cars` | query `status?`, `per_page?` | `200` paginated own cars |
| 17 | POST | `/api/v1/seller/cars` | `{ title, brand, model, year, price, mileage_km?, body_style?, fuel_type?, transmission?, condition?, color?, vin?(17 chars, unique), description?, city? }` | `201 { data: CarResource(draft) }` |
| 18 | GET | `/api/v1/seller/cars/{car}` | — | `200` (owner or admin) |
| 19 | PUT/PATCH | `/api/v1/seller/cars/{car}` | any of #17 except status | `200` updated car |
| 20 | DELETE | `/api/v1/seller/cars/{car}` | — | `200 { message }` (soft delete) |
| 21 | POST | `/api/v1/seller/cars/{car}/publish` | — | `200` draft/archived → active (+`published_at`) |
| 22 | POST | `/api/v1/seller/cars/{car}/unpublish` | — | `200` active → draft |
| 23 | POST | `/api/v1/seller/cars/{car}/sold` | — | `200` active → sold (+`sold_at`) |

Guards: guest → 401 · buyer → 403 · non-owner → 403 · illegal transition → 422.

## 9. CarResource shape

`{ id, title, brand, model, year, price ("528000.00"), mileage_km, body_style, fuel_type, transmission, condition, color, vin, description, city, status, published_at, sold_at, created_at, updated_at, seller: { id, name } }`

Media is deferred — no image fields yet (dedicated media module later).

## 10. Postman test order — cars (after session steps 1–9)

10. Login as seller → `{{token}}`.
11. `POST /seller/cars` → 201 draft, copy `id` → `{{carId}}`.
12. `GET /marketplace/cars` → draft absent (`data: []`).
13. `POST /seller/cars/{{carId}}/publish` → 200 active.
14. `GET /marketplace/cars` → 1 item; `GET /marketplace/cars/{{carId}}` → 200.
15. `GET /marketplace/cars?brand=Toyota&sort=price_asc` → filtered.
16. Login as buyer → `POST /seller/cars` → 403; `PATCH /seller/cars/{{carId}}` → 403.
17. Seller: `POST /seller/cars/{{carId}}/sold` → 200; marketplace `GET` one → 403 (no longer listed).

---

## 11. Parts — public marketplace (no auth)

Only `status=active` parts appear here. Paginated: `{ data: PartResource[], links, meta }`.

| # | Method | URI | Purpose |
|---|--------|-----|---------|
| 24 | GET | `/api/v1/marketplace/parts` | List active parts + filters + sort + pagination |
| 25 | GET | `/api/v1/marketplace/parts/{part}` | Single active part (draft/sold → 403 for guests) |

Query params for #24: `search` (title/brand/part_number), `category`, `brand`, `condition`, `city`, `min_price`, `max_price`, `in_stock=1`, `sort=newest|price_asc|price_desc`, `per_page` (1–50, default 15), `page`.

Enum values: `category` ∈ engine/transmission/suspension/brakes/electrical/tires_wheels/body_exterior/interior/fluids_lubricants/accessories/other · `condition` ∈ new/used/refurbished.

## 12. Parts — seller inventory (Sanctum + `role:seller,admin`)

New parts are created as `draft` (invisible publicly). Status changes only via transition endpoints — `status` is never mass-assignable. Quantity decrements / ordering belong to Phase 3 (out of scope here).

| # | Method | URI | Body | Success |
|---|--------|-----|------|---------|
| 26 | GET | `/api/v1/seller/parts` | query `status?`, `per_page?` | `200` paginated own parts |
| 27 | POST | `/api/v1/seller/parts` | `{ title, category, brand?, part_number?, compatibility?, condition?, quantity?, price, description?, city? }` | `201 { data: PartResource(draft) }` |
| 28 | GET | `/api/v1/seller/parts/{part}` | — | `200` (owner or admin) |
| 29 | PUT/PATCH | `/api/v1/seller/parts/{part}` | any of #27 except status | `200` updated part |
| 30 | DELETE | `/api/v1/seller/parts/{part}` | — | `200 { message }` (soft delete) |
| 31 | POST | `/api/v1/seller/parts/{part}/publish` | — | `200` draft/archived → active (+`published_at`) |
| 32 | POST | `/api/v1/seller/parts/{part}/unpublish` | — | `200` active → draft |
| 33 | POST | `/api/v1/seller/parts/{part}/sold` | — | `200` active → sold (+`sold_at`) |

Guards: guest → 401 · buyer → 403 · non-owner → 403 · illegal transition → 422.

## 13. PartResource shape

`{ id, title, category, brand, part_number, compatibility, condition, quantity, price ("3850.00"), description, city, status, published_at, sold_at, created_at, updated_at, seller: { id, name } }`

Media is deferred — no image fields yet (dedicated media module later).

## 14. Postman test order — parts (same flow as cars)

18. Login as seller → `{{token}}`.
19. `POST /seller/parts` → 201 draft, copy `id` → `{{partId}}`.
20. `GET /marketplace/parts` → draft absent (`data: []`).
21. `POST /seller/parts/{{partId}}/publish` → 200 active.
22. `GET /marketplace/parts` → 1 item; `GET /marketplace/parts/{{partId}}` → 200.
23. `GET /marketplace/parts?category=brakes&sort=price_asc` → filtered.
24. Login as buyer → `POST /seller/parts` → 403; `PATCH /seller/parts/{{partId}}` → 403.
25. Seller: `POST /seller/parts/{{partId}}/sold` → 200; marketplace `GET` one → 403 (no longer listed).
