# Rental Platform

🔧 Small booking platform (backend + frontend) with per-apartment calendars, JWT auth, and admin role support.

---

## 🚀 Quick start

Prerequisites:
- Node.js 20+ and npm
- Docker & Docker Compose (optional, recommended to run full stack)

Run the stack with Docker Compose (recommended):

```bash
# from repository root
docker-compose up -d --build
```

This will start:
- Backend: http://localhost:4000
- Frontend: http://localhost:3000
- MongoDB: 27017 (internal to compose)

Or run services locally (backend):

```bash
cd backend
npm install
# use .env or set env variables (see below)
npm run dev
```

Frontend (local):

```bash
cd frontend
npm install
npm run dev
# then open http://localhost:3000
```

---

## 📁 Project layout

- backend/ - Express + Mongoose backend (ESM)
  - src/
    - routes/ - API routes: `bookings`, `availabilities`, `calendar`, `auth`, `customers`
    - models/ - Mongoose models: `Booking`, `Availability`, `Customer`
    - auth/ - JWT helpers and token CLI
- frontend/ - Next.js pages and FullCalendar calendar UI
- docker-compose.yml - starts `backend`, `frontend`, and `mongo`

---

## 🔐 Authentication

The project uses JWT tokens for authentication.
- Admin tokens: grant `roles: ['admin']` and can create/delete availabilities.
- Guest (customer) tokens: passwordless login via `POST /auth/login` (email + optional name to create account).

Generate a local admin token with the included helper:

```bash
# from backend root
# Make sure AUTH_JWT_SECRET (or JWT_SECRET) is set in env
node src/auth/create_token.js --id=admin1 --name=Admin --email=admin@example.com --roles=admin
# returns a JWT token string
```

Use `Authorization: Bearer <token>` header for admin-only requests.

---

## 🌐 API Overview

Base: `http://localhost:4000`

Main endpoints:

- POST /auth/login  — passwordless login (body: { email, name? }) → { token, user }
- GET /auth/me — introspect token (requires Authorization header)

- GET /calendar/events?from=&to=&apartmentId=... — returns bookings + availabilities as FullCalendar events

- GET /bookings?apartmentId=... — list bookings (optional apartment filter)
- POST /bookings — create booking (public or authenticated guest). Body: { fullName, email, apartmentId, start, end }
- POST /bookings/:id/cancel — cancel booking (owner or admin)

- GET /availabilities?from=&to=&apartmentId=... — list
- POST /availabilities — create (admin only). Body: { start, end, type, note, apartmentId }
- DELETE /availabilities/:id — delete (admin only)

- GET /customers?email=... — lookup
- POST /customers — create guest (public, idempotent by email)

Examples (curl):

```bash
# login as guest (creates if missing)
curl -X POST -H "Content-Type: application/json" -d '{"email":"alice@example.com"}' http://localhost:4000/auth/login

# create booking
curl -X POST -H "Content-Type: application/json" -d '{"fullName":"Alice","email":"alice@example.com","apartmentId":"apt1","start":"2026-01-04T10:00:00Z","end":"2026-01-04T12:00:00Z"}' http://localhost:4000/bookings

# admin create availability
curl -X POST -H "Authorization: Bearer <ADMIN_TOKEN>" -H "Content-Type: application/json" -d '{"start":"2026-01-06T10:00:00Z","end":"2026-01-06T18:00:00Z","type":"blocked","apartmentId":"apt1"}' http://localhost:4000/availabilities
```

---

## 🧪 Tests & Non‑Regression

A Jest E2E test suite is included and runs against an in‑memory MongoDB. This is intended as a non‑regression test collection.

Run tests:

```bash
# Backend unit/e2e tests (in-memory mongo)
cd backend
npm install
npm test
```

Frontend end-to-end tests use Playwright and will automatically start the Next.js dev server (no need to run `npm run dev` manually):

```bash
cd frontend
npm install
npm run test:e2e
```

The Playwright configuration uses a `webServer` entry so the dev server is started and stopped for the test run. This makes the e2e command suitable for local and CI runs.

CI recommendation: run backend tests and frontend e2e in CI. Example (GitHub Actions):

```yaml
# .github/workflows/ci.yml (snippet)
- name: Backend tests
  working-directory: ./backend
  run: |
    npm ci
    npm test

- name: Frontend e2e
  working-directory: ./frontend
  run: |
    npm ci
    npm run test:e2e
```

The tests cover guest creation/login, booking flows, conflict checks, permissions (owner/admin), availabilities, and calendar filtering.

CI recommendation: run the above steps on push/PR (see below for a full workflow option).

---

## 🔧 Environment variables

Use a `.env` file or set these in environment:

- MONGO_URI (default for compose uses internal mongo)
- PORT (defaults: backend 4000, frontend 3000)
- FRONTEND_ORIGIN (for CORS)
- AUTH_JWT_SECRET or JWT_SECRET (required for signing and validating JWTs)

There is a `.env.example` with suggested variables in the repository.

## Stripe payments (booking deposit)

- New env variables in `backend/.env.example`:
  - `STRIPE_SECRET_KEY` - your Stripe secret key (test or live)
  - `STRIPE_PUBLISHABLE_KEY` - your Stripe publishable key (for frontend)
  - `STRIPE_WEBHOOK_SECRET` - the webhook signing secret for secure webhook handling
  - `DEPOSIT_DEFAULT_AMOUNT` - optional default deposit amount in cents (if not set per-apartment)

- Admins can set a fixed deposit amount per apartment in the admin page (`/admin`), entered in USD and stored in cents.
- The system creates a booking first, then if a deposit is required the user is redirected to `/payments/:bookingId` to complete an embedded Stripe Payment Element flow (or use the dev "Simulate success" button in environments without Stripe client libraries).
- Deposits are created with `capture_method=manual` so they can be captured later by an admin or released on cancellation (auto-release on cancellation is supported).

### Webhooks

- To verify payment status updates (captures/refunds) the backend exposes `/webhooks/stripe` which accepts Stripe webhook events. Configure your Stripe webhook endpoint to POST to `https://<your-host>/webhooks/stripe` and set the `STRIPE_WEBHOOK_SECRET` env var to the signing secret.
- In development, you can expose the local server using `ngrok` and point Stripe webhooks to the generated URL.



---

## 🧭 Frontend

- Main page: http://localhost:3000 — guest create / login + apartment selection (static sample list)
- Calendar page: http://localhost:3000/calendar?apartmentId=<id>

The frontend stores guest tokens in localStorage (basic, for demo). On booking creation and booking cancellation it sends the Authorization header if the guest is logged in.

---

## ✅ Security notes & next steps

- Current login is passwordless magic (email-only) for demo convenience. For production, add email verification or passwordless magic links or password-based auth.
- Tokens currently stored client-side (localStorage). For higher security, use httpOnly session cookies or short-lived JWT + refresh tokens.
- Add GitHub Actions workflow to run tests on PRs and pushes.

---

## �️ Raspberry Pi Deployment (simple scripts)

The `scripts/` folder contains two helper scripts to provision Raspberry Pis for a small single‑node deployment:

- `scripts/deploy_backend_pi.sh` — prepares a backend Pi: installs Node.js, Docker, starts a MongoDB container, installs dependencies, and runs the backend using `pm2`.
- `scripts/deploy_frontend_pi.sh` — prepares a frontend Pi (web server): installs Node.js, builds the Next.js app, creates `.env.local` with `NEXT_PUBLIC_BACKEND_URL`, runs the frontend with `pm2`, and optionally configures `nginx` as a reverse proxy.

Quick example usage:

```bash
# Make scripts executable:
chmod +x scripts/*.sh

# On the backend Pi (clone repo or pass REPO_URL):
./scripts/deploy_backend_pi.sh https://github.com/your/repo.git /home/pi/rental-platform

# On the frontend Pi (pass REPO_URL and backend url):
./scripts/deploy_frontend_pi.sh https://github.com/your/repo.git /home/pi/rental-platform http://192.168.1.10:4000
```

Notes:
- The frontend expects the backend URL via `NEXT_PUBLIC_BACKEND_URL` (this is read by the browser at build/run time). If you change the backend IP, update the `.env.local` file on the frontend Pi and restart the frontend process.
- Scripts attempt to be idempotent but require sudo privileges for package installation and system services.

---

## �🛠️ Development tips

- To generate an admin token quickly: `node src/auth/create_token.js --id=admin --name=Admin --email=admin@example.com --roles=admin`
- Use the admin token in the Authorization header to manage availabilities.
- The calendar endpoint merges Booking + Availability objects into FullCalendar-friendly events.

---

If you want, I can:
- Add a GitHub Actions workflow to run tests on push/PR (recommended) ✅
- Replace the demo guest UI token storage with a secure login flow (magic link / password) 🔐
- Add an `Apartment` model and admin UI to manage apartments (now implemented). Apartments include: `name`, `description`, `photos` (array of URLs), `pricePerNight`, `rules`, `lat`, `lon`. Use the admin page at `/admin` to create apartments. 🏢

---

Thanks — let me know which next step you'd like me to implement.
