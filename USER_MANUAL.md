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

## 0. Admin access (web) — start here

| Page | URL | What it does | How to authenticate |
| :-- | :-- | :-- | :-- |
| **Flat management** | **https://www.bestflats.vip/admin** | Create / edit / delete flats, upload photos, see **all** listings including host-posted and pending ones | Prompts **"Admin token"** on each write — paste the admin JWT |
| **Intelligence dashboard** | **https://www.bestflats.vip/admin/dashboard** | Revenue, flat count, customers, recent bookings (`/admin/platform/stats`) | **Paste the admin token in the sign-in box** (Sign out clears it; after 3 failed attempts a captcha is required) |

**Mint the admin token** (the "magic key" — an admin JWT signed with the prod `AUTH_JWT_SECRET`):
```bash
# On the Raspberry Pi (where the real secret lives):
python3 gen_token.py "$(grep '^AUTH_JWT_SECRET=' .env | cut -d= -f2-)"
# -> eyJhbGciOiJIUzI1Ni...  (roles:["admin"])
```
- For **/admin**: open the page and paste the token in the **"Admin token"** prompt when you create/edit/delete/upload.
- For **/admin/dashboard**: paste the token into the **sign-in box** and click *Access Dashboard*
  (it's kept only in this browser's `localStorage`; *Sign out* clears it). A **brute-force
  deterrent** kicks in after **3 failed attempts** — a simple captcha must be solved before
  trying again. The backend also rate-limits all requests (100 / 15 min per IP).
- The same token works for the **API** directly: `Authorization: Bearer <token>` (see §5).

> The token is bearer credential — anyone holding it is admin. Don't commit it or paste it into shared docs. Mint a fresh one when needed; they're cheap.

👉 For the **full URL map** and a walkthrough of what **guests, hosts, and admins** each do, see **§14**.

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

> ⚠️ **Environments differ:** the `AUTH_JWT_SECRET` in this repo's `.env` does **not**
> match the one deployed on `api.bestflats.vip` (a token minted from the repo value is
> rejected `401`). **Always mint prod admin tokens from the Pi's own `.env`:**
> `python3 gen_token.py "$(grep '^AUTH_JWT_SECRET=' .env | cut -d= -f2-)"`.

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
| `GET /version` | public | Running build: name, version, **commit**, builtAt, node, env |
| `GET /health` | public | Liveness: DB connectivity (`200 ok` / `503 degraded`), uptime — for monitors |
| `POST /auth/magic`, `/auth/magic/verify` | public | Magic-link login |
| `POST /auth/login` | dev only | Quick guest login helper |
| `GET /auth/me` | bearer | Current identity |
| `GET /apartments` | public (admins see all) | Book Now list — **hides `pending` flats** from the public; admins see everything |
| `POST/PUT/DELETE /apartments` | admin | Listings CRUD (admin-created flats are `published`) |
| `/bookings` | bearer | Create/list/cancel bookings (guest-owned) |
| `/availabilities`, `/calendar` | mixed | Blocked dates & calendar feed |
| `/uploads` | **host or admin** | Image upload (`{filename,b64}` JSON or multipart). Emits **https** URLs behind a proxy |
| `POST /admin/host/flats` | host | **Host self-service:** submit a flat → created `pending`, emails admin a validation link |
| `GET /admin/host/flats` | host | List my own flats (incl. pending) |
| `GET /admin/host/flats/validate?token=…` | public (signed token) | **Admin approves** a pending flat via the emailed link → `published` |
| `/seed`, `/seed/unprotected` | admin JWT / admin key | Seed demo inventory |
| `/ucp/*` | discover public; register/checkout admin | Agentic commerce (UCP/1.0) |
| `/payments/*` | bearer | Stripe intent + USDC recording |
| `/admin/platform/*` | admin | Stats, customers, user deletion |
| `/admin/host/dashboard`, `/admin/concierge/*` | role | Host / concierge dashboards |
| `/mcp`, `/mcp/messages` | admin | MCP SSE transport |
| `/webhooks/stripe` | signature | Stripe webhook |

---

## 7. Non-regression test suite

```bash
cd rental-platform/backend
npm test          # jest + in-memory Mongo; NODE_ENV=test, rate-limit disabled
```
Current status: **28 tests / 4 suites, all green.** Coverage includes apartments,
bookings (create/overlap/cancel/ownership), availability, calendar filtering, UCP
discover→register→checkout→lock, payments intent stub, MCP SSE, mailer abuse limits,
input validation, and RBAC boundaries.

**Regressions added across this engagement** (`tests/e2e.test.cjs`):
- booking with a non-ObjectId identity returns a clean 4xx, never a 500;
- `GET /version` reports build metadata;
- uploads emit https URLs behind a proxy (no mixed content);
- host self-service + moderation: submit → pending → admin validates → published.

**Remote** non-regression against the live Pi: `python3 rental-platform/scripts/remote_nonreg.py`
(read-only by default; set `RENTAL_TOKEN` to include admin checks).

To extend the suite, add a `test(...)` to `tests/e2e.test.cjs` (full-server e2e) or a
focused `*.test.mjs` for unit-level checks.

---

## 8. Host self-service & moderation (validation email)

Hosts can publish their own flats, gated by admin approval. Flow:

1. **Host signs in** (magic link with `role=host`, or — for scripted/agent use — an
   admin-minted host JWT) and uploads photos to `/uploads` (hosts are now allowed).
2. **Host submits** `POST /admin/host/flats`. The flat is created with
   `status: 'pending'` and is **hidden from the public Book Now list**. The owning host
   (`GET /admin/host/flats`) and admins (`GET /apartments` with an admin token) can see it.
3. **Admin is emailed** a validation link (`sendFlatValidationEmail` → `ADMIN_EMAIL`) with
   an **"✓ Approve & publish"** button.
4. **Admin approves** by opening the link: `GET /admin/host/flats/validate?token=…`
   (the token is a signed JWT, so the link works straight from the inbox with no login).
   The flat flips to `status: 'published'` and appears on Book Now.

`Apartment.status` is `'pending' | 'published'` (default `'published'`, so admin-created
flats and legacy data stay public). The public `GET /apartments` filters out `pending`;
admins are exempt.

Scripted host submission (used to seed host flats):
```bash
# Local classic flow (email signup + admin approval), end to end:
SECRET=$(grep '^AUTH_JWT_SECRET=' .env | cut -d= -f2-) \
  python3 rental-platform/scripts/propose_and_validate.py tmp/<listing_dir> host@example.com "Host Name"
```

---

## 9. `ADMIN_EMAIL` & validation emails

The validation email recipient is resolved as:
`process.env.ADMIN_EMAIL` → else `MAIL_FROM` → else `admin@bestflats.vip`.

There is **no `ADMIN_EMAIL` set by default.** To receive host-submission approvals, set it
in the Pi's `.env`:
```bash
echo 'ADMIN_EMAIL=you@example.com' >> .env   # then rebuild/restart the backend
```
On prod, emails are delivered via SendGrid (`SMTP_*` in `.env`); locally they go to an
Ethereal test inbox (preview URL is logged).

---

## 10. Operator scripts (`rental-platform/scripts/`)

| Script | Purpose |
| :-- | :-- |
| `start-local.sh` + `local-server.mjs` | Run the backend locally on the LAN IP (in-memory Mongo) |
| `remote_nonreg.py` | Non-regression smoke against the live Pi (`BASE=…`, optional `RENTAL_TOKEN`) |
| `propose_and_validate.py` | Classic host flow: email signup → submit → admin validates → published |
| `backup_mongo.sh` | **Database backup** (mongodump → rotated gzip archives) for cron on the Pi |

---

## 11. Findings log (this engagement)

| # | Status | Finding |
| :- | :-- | :-- |
| 1 | ✅ **Fixed & deployed** | `POST /bookings` 500 (`Cast to ObjectId failed`) for non-ObjectId JWT subjects → now a clean **403**. |
| 2 | ✅ **Resolved** | Repo `.env` `AUTH_JWT_SECRET` ≠ prod secret. Use the **Pi's** `.env` value (`grep '^AUTH_JWT_SECRET=' .env`) to mint admin tokens. |
| 3 | ✅ **Fixed & deployed** | `/uploads` emitted `http://` behind Cloudflare → mixed-content blocked. Now honors `X-Forwarded-Proto` → https. |
| 4 | ✅ **Added** | Host self-service listing + admin email validation (was missing — only admins could create flats). |
| 5 | ⚠️ **Open** | `cli.py verify-system` only works under `NODE_ENV=test` (can't auto-auth in dev/prod; its booking step uses an admin identity → 403 by design). |
| 6 | ℹ️ Note | UCP `checkout` needs the UCP record `_id` + an `OPEN` session (apartment id → `400`). |

---

## 12. Deploying to the Raspberry Pi

The backend runs from a **built image** (Containerfile), so `git pull` alone is not enough —
the container must be rebuilt. On the Pi:

```bash
cd ~/sby/rentalbooking && git pull origin main
# (first time) set the admin email for validation links:
echo 'ADMIN_EMAIL=you@example.com' >> .env
cd rental-platform && podman-compose build backend && podman-compose up -d backend
curl -s https://api.bestflats.vip/version    # confirm the running commit
```
`GET /version` reports the live commit so you can confirm the deploy landed.

---

## 13. Database protection & resilience

**Database backups (`scripts/backup_mongo.sh`).** Dumps MongoDB to a rotated, gzip-compressed
archive. Run on the Pi (where the `mongo` container lives), ideally from cron:
```bash
# manual
bash rental-platform/scripts/backup_mongo.sh
# cron — daily 03:30, keep 30 days, store on the USB disk:
30 3 * * * KEEP=30 BACKUP_DIR=/mnt/usb/bfs-backups /bin/bash \
  ~/sby/rentalbooking/rental-platform/scripts/backup_mongo.sh >> /mnt/usb/bfs-backups/backup.log 2>&1
```
Restore: `podman exec -i mongo mongorestore --archive --gzip --drop < <archive.gz>`.

**Liveness / health (`GET /health`).** Returns `200 {status:"ok"}` when MongoDB is connected,
`503 {status:"degraded"}` otherwise. Point an uptime monitor (or a Cloudflare health check) at
`https://api.bestflats.vip/health` to get alerted on DB/backend trouble.

**Process resilience.** The backend logs `unhandledRejection`s and, on a fatal
`uncaughtException`, logs and exits so Podman's `restart: always` brings a clean instance
back up. MongoDB connection uses retry-with-backoff (`connectWithRetry`).

**Existing safeguards.** Mongo is not published on the host (internal compose network only);
all requests are rate-limited (100 / 15 min per IP); per-user fields are AES-256-GCM encrypted;
admin routes require a signed JWT; the admin dashboard adds a captcha after 3 failed sign-ins.

**Off-site backups (rclone).** `backup_mongo.sh` copies each archive to a remote when
`RCLONE_REMOTE` is set (and prunes the remote by age). One-time setup on the Pi:
```bash
sudo apt install rclone          # or: curl https://rclone.org/install.sh | sudo bash
rclone config                    # create a remote, e.g. name it "gdrive"
# then run backups with: RCLONE_REMOTE=gdrive:bfs-backups bash rental-platform/scripts/backup_mongo.sh
```

**MongoDB username/password.** The compose `mongo` service reads `MONGO_ROOT_USERNAME` /
`MONGO_ROOT_PASSWORD` from `.env`. Empty (default) = no auth (legacy). Set them to enable a
root user + access control.

- *Fresh install:* set the two vars **and** `MONGO_URI` in `.env` before first start — the
  image creates the user and enables auth automatically.
  ```
  MONGO_ROOT_USERNAME=bfs
  MONGO_ROOT_PASSWORD=<strong-random>
  MONGO_URI=mongodb://bfs:<strong-random>@mongo:27017/bestflats?authSource=admin
  ```
- *Existing database (migration):* the image only auto-creates the user on an empty data dir,
  so run the guarded helper on the Pi (it backs up, re-initialises with auth, and restores):
  ```bash
  # add the three lines above to .env first, then:
  CONFIRM=yes bash rental-platform/scripts/enable_mongo_auth.sh
  (cd rental-platform && podman-compose up -d backend)
  curl -s https://api.bestflats.vip/health    # {"status":"ok","db":"connected"}
  ```
  `backup_mongo.sh` and `mongorestore` also accept the credentials (auto-detected from
  `MONGO_ROOT_USERNAME`/`PASSWORD`).

---

## 14. URL map & role-based interactions

### 14.1 All URLs

**Frontend pages** (prod base `https://www.bestflats.vip`):

| URL | Audience | Purpose |
| :-- | :-- | :-- |
| `/` | everyone | Landing + email sign-in (magic link); detects role from subdomain |
| `/collections` | guest | Browse all published residences |
| `/apartment?id=<id|slug>` | guest | Residence detail + photos |
| `/calendar?apartmentId=<id>` | guest | Availability calendar / pick dates |
| `/magic-request`, `/magic-callback` | everyone | Request a sign-in link / land after clicking it |
| `/payments/[bookingId]` | guest | Checkout — card (Stripe) or USDC (MetaMask) |
| `/owners` | host | "List your property" entry point |
| `/host/dashboard` | host | Revenue, tax estimate, managed flats, recent guests |
| `/concierge`, `/concierge/dashboard` | concierge | Work calendar, contractor directory |
| `/admin` | admin | Manage **all** flats (create/edit/delete, upload photos) |
| `/admin/dashboard` | admin | Platform intelligence (revenue, flats, customers, bookings) |
| `/help` `/journal` `/story` `/team` `/vision` `/safety` `/privacy` `/terms` `/cancellation` | everyone | Content & legal |

**Sign-in subdomains** (the subdomain sets the requested role at magic-link time):

| Subdomain | Role requested |
| :-- | :-- |
| `www.bestflats.vip` | guest |
| `host.bestflats.vip` | host |
| `conci.bestflats.vip` | concierge |
| `subcont.bestflats.vip` | contractor |

**API** (prod base `https://api.bestflats.vip`): see §6 for the full table. Public health/version:
`GET /health`, `GET /version`.

### 14.2 Guest (traveller)

1. **Browse** `/` → `/collections` → `/apartment?id=…` (public `GET /apartments`).
2. **Sign in** — enter email on the landing page → receives a magic-link email →
   clicking it hits `/magic-callback` which calls `POST /auth/magic/verify` → a 14-day
   guest session (`role: guest`).
3. **Book** — pick dates on the apartment/calendar → `POST /bookings`
   (`{ apartmentId, start, end }`). If the flat has a deposit, continue to
   `/payments/<bookingId>` → `POST /payments/create-intent` (card) or record a USDC payment.
4. **Manage** — view own bookings (`GET /bookings`), cancel (`POST /bookings/:id/cancel`).
   Guests only ever see/cancel **their own** bookings.
- API used: `/auth/magic`, `/auth/magic/verify`, `/apartments`, `/bookings`, `/payments/*`.

### 14.3 Host (property owner)

1. **Sign in as host** — go to `host.bestflats.vip` (or `/owners`) and request a link;
   the magic link grants a `host` session. (In production, staff roles can require an
   invite code — `HOST_INVITE_CODE`.)
2. **Dashboard** `/host/dashboard` → `GET /admin/host/dashboard`: revenue, monthly/yearly
   breakdown, tax estimate, managed flats, recent guests (only for flats they own).
3. **Propose a flat** (self-service, moderated):
   - Upload photos → `POST /uploads` (hosts are allowed; URLs come back https).
   - Submit → `POST /admin/host/flats` (`{ name, address, pricePerNight, photos, … }`).
     The flat is created **`pending`** (hidden from Book Now) and the **admin is emailed a
     validation link**. Ownership is forced to the signed-in host.
   - Track own flats (incl. pending) → `GET /admin/host/flats`.
4. **Goes live** once an admin approves (see 14.4). A host cannot publish their own flat.
- API used: `/auth/magic` (role host), `/uploads`, `/admin/host/flats`, `/admin/host/dashboard`.

### 14.4 Admin (platform operator)

**Authenticate** by minting an admin JWT (`gen_token.py "$AUTH_JWT_SECRET"`) — see §0.

1. **Flat management** `/admin` — create/edit/delete **any** flat, upload photos. Admin-created
   flats are published immediately. Admins see **all** flats including `pending`/host-posted
   ones (`GET /apartments` with an admin token returns everything).
2. **Approve host submissions** — open the **"✓ Approve & publish"** link from the validation
   email → `GET /admin/host/flats/validate?token=…` flips the flat to `published`.
3. **Intelligence dashboard** `/admin/dashboard` — revenue, flat count, customers, recent
   bookings (`GET /admin/platform/stats`); view/remove members
   (`GET /admin/platform/customers`, `DELETE /admin/platform/users/:id`). Sign-in box requires
   the admin token; a captcha appears after 3 failed attempts.
4. **Other admin powers** — seed inventory (`/seed`, or `/seed/unprotected` with the
   `x-platform-admin-key`), register/checkout UCP items, open MCP sessions (`/mcp`).
- API used: everything under `/admin/platform/*`, `/admin/host/flats/validate`, `/apartments`
  (write), `/uploads`, `/seed`, `/ucp/*`, `/mcp`.

### 14.5 Concierge / Contractor (brief)

Sign in via `conci.` / `subcont.` subdomains. Concierges use `/concierge/dashboard`
(`GET /admin/concierge/*`) for service scheduling and the contractor directory. These roles
see only the flats/bookings assigned to them (RBAC scoping in the backend).

### 14.6 Who-can-do-what (summary)

| Action | Guest | Host | Admin |
| :-- | :--: | :--: | :--: |
| Browse published flats / book / pay | ✅ | ✅ | ✅ |
| See own bookings only | ✅ | (own flats' bookings) | all |
| Upload photos | ⛔ | ✅ | ✅ |
| Submit a flat (→ pending) | ⛔ | ✅ | ✅ (publishes directly) |
| Publish / approve a flat | ⛔ | ⛔ | ✅ |
| Edit / delete any flat | ⛔ | ⛔ | ✅ |
| Platform stats / customers / remove members | ⛔ | ⛔ | ✅ |
| Seed, UCP register/checkout, MCP | ⛔ | ⛔ | ✅ |
