# Rental Platform

🔧 Small booking platform (backend + frontend) with per-apartment calendars, JWT auth, and admin role support.

---

## 🚀 Quick start (One-Click)

The easiest way to launch the full stack is using the provided `start.sh` script in the root directory. It handles environment setup, Docker builds, and initial database seeding automatically.

```bash
# from repository root
./start.sh
```

This will start:
- **Frontend:** http://localhost:3000
- **Backend:** http://localhost:4000
- **MCP SSE:** http://localhost:4000/mcp
- **MongoDB:** Internal to Docker

---

## 📁 Project layout

- `backend/` - Express + Mongoose backend (ESM)
  - `src/mcp/` - Model Context Protocol (MCP) server integration
  - `src/routes/ucp.js` - Universal Commerce Protocol (UCP) endpoints
- `frontend/` - Next.js pages and FullCalendar UI
- `mcp-client/` - Python-based AI agent client for MCP testing
- `docker-compose.yml` - Orchestrates all services

---

## 🤖 AI Agent Integration (MCP & UCP)

This platform is built for the agentic future, supporting two key protocols:

### 1. Model Context Protocol (MCP)
The backend exposes an **SSE-based MCP server** at `http://localhost:4000/mcp`.
- **Tools:** Agents can call `create_customer` and `create_apartment`.
- **Client:** A Python client is included in `mcp-client/` that demonstrates how to connect and use these tools asynchronously.

### 2. Universal Commerce Protocol (UCP)
Standardized endpoints for AI discovery and checkout:
- `GET /ucp/discover` - Allows agents to find inventory via Capability Hashes.
- `POST /ucp/checkout` - Standardized agentic checkout initiation.

---

## 🔐 Authentication

The project uses JWT tokens for authentication.
- **Admin tokens:** grant `roles: ['admin']`. Generate one using:
  ```bash
  cd rental-platform/backend
  node src/auth/create_token.js --id=admin1 --name=Admin --email=admin@example.com --roles=admin
  ```
- **Magic Link:** Passwordless login via `POST /auth/magic`. In dev mode, links are logged to the backend console.

---

## 🧪 Tests & Non‑Regression

A Jest E2E test suite covers the full lifecycle (Auth -> Booking -> Payment -> UCP).

```bash
cd rental-platform/backend
npm test
```
*Note: The test suite is optimized for OpenSSL 3 environments using MongoDB 8.0 binaries.*

---

## 💳 Stripe Payments

Supports secure booking deposits using Stripe.
- Set `STRIPE_SECRET_KEY` and `STRIPE_PUBLISHABLE_KEY` in `.env`.
- Admins can set per-apartment deposit amounts in the `/admin` dashboard.

---

## 🧭 Frontend

- **Main page:** http://localhost:3000 — browse apartments and login.
- **Admin page:** http://localhost:3000/admin — manage listings and availability.
- **Payments:** Integrated Stripe checkout flow at `/payments/[bookingId]`.

---

## 🔧 Environment variables

See `rental-platform/backend/.env.example` for a full list of supported variables.

---

© 2026 Rental Platform
