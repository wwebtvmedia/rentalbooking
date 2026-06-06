# bestflats.vip — User & Operations Manual

Complete guide to running, testing, and operating the bestflats.vip rental platform,
covering the local server, the CLI, the two admin keys, the API surface, and the
non-regression suite.

- **Frontend (prod):** https://www.bestflats.vip (Next.js)
- **API (prod):** https://api.bestflats.vip (Express)
- **API (local):** http://192.168.1.104:4000 (LAN) / http://localhost:4000
- **Stack:** Express 5 + MongoDB (Mongoose) + JWT magic-link auth + AES-256-GCM
  per-user encryption + MCP (SSE) + UCP (agentic commerce) + Stripe. Deployed on
  Raspberry Pi 4 via Podman behind a Cloudflare Tunnel.

---

## 1. The two "magic keys" (important)

There are **two distinct secrets**, used for different things. Don't confuse them.

| Key | Env var | What it unlocks | How it's used |
| :-- | :-- | :-- | :-- |
| **JWT secret** | `AUTH_JWT_SECRET` | The **admin API** (`/admin/*`), MCP, and *all* JWT auth | Signs JWTs. `gen_token.py <secret>` mints an admin token; send it as `Authorization: Bearer <token>` |
| **Platform admin key** | `PLATFORM_ADMIN_KEY` | The **seed** endpoint only (`/seed/unprotected`) | Sent as the `x-platform-admin-key` header |

```bash
# Mint an admin JWT from the JWT secret (this is the "magic key" for the admin API):
python3 gen_token.py "$AUTH_JWT_SECRET"
# -> eyJhbGciOiJIUzI1Ni... (roles: ["admin"], sub: "remote-verify-bot")
```

> ⚠️ **Known issue (environments):** the `AUTH_JWT_SECRET` in this repo's `.env`
> does **not** match the secret currently deployed on `api.bestflats.vip`
> (prod rejects a token minted from the `.env` value with `401 Unauthorized`).
> The stored `.rental_cli_token` is likewise stale. To call the **prod** admin API
> you need the **production** `AUTH_JWT_SECRET`, not the one in `.env`.

---

## 2. Running the server locally (on the LAN IP)

A launcher boots an **in-memory MongoDB replica set** (so transactions work) and
starts the backend in development mode, reading the real secrets from `.env`.

```bash
# Start (foreground)
bash rental-platform/backend/scripts/start-local.sh
# -> Backend running on 0.0.0.0:4000  (reachable at http://192.168.1.104:4000)

# Start (background, logs to file)
bash rental-platform/backend/scripts/start-local.sh > /tmp/bfs_server.log 2>&1 &

# Health check
curl http://192.168.1.104:4000/apartments
```

What the launcher sets:
- `NODE_ENV=development` — enables the `/auth/login` dev helper and dev-role magic links.
- `AUTH_LOG_EMAIL_TOKEN=true` — magic-link tokens are written to the log (no SMTP needed).
- `GOOGLE_CLIENT_ID` — enables the Google OIDC auth path.
- In-memory Mongo — **data is wiped on every restart** (safe sandbox).

Files:
- `rental-platform/backend/scripts/start-local.sh` — env loader + entrypoint.
- `rental-platform/backend/scripts/local-server.mjs` — boots Mongo + imports `src/index.js`.

---

## 3. The CLI (`rental-platform/cli.py`)

Python CLI (`requests` + `PyJWT`). Point it at any backend with `--url`.
Auth token is read from `RENTAL_TOKEN` env var, then `.rental_cli_token` in the CWD.

```bash
CLI="python3 rental-platform/cli.py --url http://192.168.1.104:4000"
```

### Authentication
```bash
$CLI auth login alice@example.com --role guest --name "Alice"   # request magic link
$CLI auth verify <token>                                        # verify -> saves session token
$CLI auth me                                                    # show current identity
```
- In `NODE_ENV=test` the magic request returns the token directly and `auth login`
  auto-logs-in. In **development/production** the link is emailed; grab the token from
  the server log (`AUTH_LOG_EMAIL_TOKEN=true`) or the email, then `auth verify`.
- To act as **admin**, export a minted token instead of logging in:
  ```bash
  export RENTAL_TOKEN=$(python3 gen_token.py "$AUTH_JWT_SECRET")
  ```

### Apartments
```bash
$CLI apt list
$CLI apt get <id|slug>
$CLI apt create --name "Flat" --address "1 Rue X, Paris" --price 99.5 --desc "..."   # admin
$CLI apt delete <id>                                                                 # admin
```

### Bookings
```bash
$CLI booking create --apt <aptId> --start 2026-07-10 --end 2026-07-15   # as a real guest
$CLI booking list [--apt <aptId>]
$CLI booking cancel <bookingId>
```
> Bookings must be created by a **real user** (guest). An admin/agent service token
> (whose subject is not a Mongo ObjectId) correctly receives **403
> "This account cannot create bookings"** — see §6.

### Admin (requires admin token)
```bash
$CLI admin stats        # aggregated revenue / counts / per-flat performance
$CLI admin customers    # decrypted guest list (PII — handle carefully)
```

### UCP (agentic commerce)
```bash
$CLI ucp discover --hash rental-listing-v1                 # public discovery
$CLI ucp register --id <aptId> --hash rental-listing-v1 --rate 160   # admin
$CLI ucp checkout --ucp-id <ucpRecordId> --mandate-id <mandate>      # admin
```
> `checkout` takes the **UCP record `_id`** (from `discover`/`register`), **not** the
> apartment id, and the session must be `OPEN`.

### Full system check
```bash
$CLI verify-system --email verify-bot@bestflats.vip
```
> ⚠️ This suite assumes `NODE_ENV=test` auto-login. In dev/prod it cannot
> auto-authenticate, and its booking step uses an admin identity (now 403 by design).
> Use the per-command flow above for dev/prod verification.

---

## 4. Creating a new user (magic-link flow)

```bash
# 1. Request the link (dev mode logs the token)
python3 rental-platform/cli.py --url http://192.168.1.104:4000 \
  auth login newguest@bestflats.vip --role guest --name "New Guest"

# 2. Pull the logged token
TOKEN=$(grep -o '"token":"[^"]*"' /tmp/bfs_server.log | tail -1 | cut -d'"' -f4)

# 3. Verify -> creates the user and returns a 14-day session token
python3 rental-platform/cli.py --url http://192.168.1.104:4000 auth verify "$TOKEN"
```

Roles: `guest` (open), `host` / `concierge` / `contractor` (need an invite code in
production: `HOST_INVITE_CODE` etc.), `admin` (mint via `gen_token.py`, or magic in test mode).

---

## 5. Admin API & seeding

```bash
ADMIN=$(python3 gen_token.py "$AUTH_JWT_SECRET")

# Admin API (JWT)
curl -H "Authorization: Bearer $ADMIN" http://192.168.1.104:4000/admin/platform/stats

# Seed inventory (Platform Admin Key, NOT the JWT)
curl -H "x-platform-admin-key: $PLATFORM_ADMIN_KEY" \
  "http://192.168.1.104:4000/seed/unprotected"          # add ?force=true to wipe+reseed
```

Access-control matrix (verified):

| Caller | `/admin/platform/stats` | `/seed/unprotected` |
| :-- | :-- | :-- |
| Admin JWT | ✅ 200 | n/a |
| Guest JWT | ⛔ 403 | n/a |
| No auth | ⛔ 401 | n/a |
| Correct `x-platform-admin-key` | n/a | ✅ 200 |
| Wrong / missing key | n/a | ⛔ 403 |

---

## 6. API surface (route → purpose)

| Mount | Auth | Purpose |
| :-- | :-- | :-- |
| `POST /auth/magic`, `/auth/magic/verify` | public | Magic-link login |
| `POST /auth/login` | dev only | Quick guest login helper |
| `GET /auth/me` | bearer | Current identity |
| `/apartments` | read public; write admin | Listings CRUD |
| `/bookings` | bearer | Create/list/cancel bookings (guest-owned) |
| `/availabilities`, `/calendar` | mixed | Blocked dates & calendar feed |
| `/uploads` | admin | Image upload (multer or `{filename,b64}` JSON) |
| `/seed`, `/seed/unprotected` | admin JWT / admin key | Seed demo inventory |
| `/ucp/*` | discover public; register/checkout admin | Agentic commerce (UCP/1.0) |
| `/payments/*` | bearer | Stripe intent + USDC recording |
| `/admin/platform/*` | admin | Stats, customers, user deletion |
| `/admin/host/*`, `/admin/concierge/*` | role | Host / concierge dashboards |
| `/mcp`, `/mcp/messages` | admin | MCP SSE transport |
| `/webhooks/stripe` | signature | Stripe webhook |

---

## 7. Non-regression test suite

```bash
cd rental-platform/backend
npm test          # jest + in-memory Mongo; NODE_ENV=test, rate-limit disabled
```
Current status: **23 tests / 4 suites, all green.** Coverage includes apartments,
bookings (create/overlap/cancel/ownership), availability, calendar filtering, UCP
discover→register→checkout→lock, payments intent stub, MCP SSE, mailer abuse limits,
input validation, and RBAC boundaries.

**Regression added this round:** *"booking with a non-ObjectId identity returns a clean
4xx, never a 500"* (`tests/e2e.test.cjs`).

To extend the suite, add a `test(...)` to `tests/e2e.test.cjs` (full-server e2e) or a
focused `*.test.mjs` for unit-level checks.

---

## 8. Findings log (this engagement)

| # | Status | Finding |
| :- | :-- | :-- |
| 1 | ✅ **Fixed** | `POST /bookings` crashed with **HTTP 500** (`Cast to ObjectId failed`) when the caller's JWT subject was not a Mongo ObjectId (e.g. the `gen_token.py` admin bot). Now guarded → clean **403**. Regression test added. Branch `fix/booking-non-objectid-500`. |
| 2 | ⚠️ **Open** | `.env` `AUTH_JWT_SECRET` ≠ deployed prod secret → admin token minted locally is rejected by `api.bestflats.vip` (`401`). Prod admin testing needs the real prod secret. `.rental_cli_token` is also stale. |
| 3 | ⚠️ **Open** | `cli.py verify-system` only works under `NODE_ENV=test`; it can't auto-authenticate in dev/prod and its booking step uses an admin identity. Recommend: accept a pre-minted admin token and create the booking as a freshly-created guest. |
| 4 | ℹ️ Note | UCP `checkout` requires the UCP record `_id` + an `OPEN` session; passing an apartment id yields `400 "Item unavailable for agentic checkout"` (expected). |

---

## 9. Deploying the fix remotely

The backend is deployed on the Raspberry Pi (Podman) behind Cloudflare and serves
`api.bestflats.vip`. To ship the booking fix:

1. Merge `fix/booking-non-objectid-500` → `main`
   (PR: https://github.com/wwebtvmedia/rentalbooking/pull/new/fix/booking-non-objectid-500).
2. On the Pi, pull `main` and rebuild/restart the backend container
   (`./start.sh`, or `podman compose up -d --build backend`).
3. Verify: a booking attempt with an admin/agent token should now return
   `403 "This account cannot create bookings"` instead of a 500.
