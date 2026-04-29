# Security patch notes

This ZIP was patched after a static security audit. Main changes:

- Removed committed browser admin certificates from `certs/` and updated `.gitignore` for private keys/cert bundles.
- Disabled `/auth/login` in production; production auth must use magic links or a real IdP.
- Added strict magic-link redirect validation and staff invite codes for host/concierge/contractor role creation in production.
- Protected per-user encryption keys with `MASTER_ENCRYPTION_KEY`; legacy plaintext keys still decrypt for migration.
- Stopped storing raw magic-link emails in `MagicToken`; rate limiting now uses blind indexes.
- Locked MCP SSE endpoints behind admin role.
- Locked uploads behind admin role, rejected SVG/client-mimetype trust, validated image magic bytes, limited JSON body size.
- Made Stripe webhooks require signatures in production and verify the PaymentIntent matches the booking.
- Added booking ownership checks to payment intent creation, dev simulation and crypto payment recording.
- Changed crypto payment recording in production to `pending_manual_verification` instead of marking bookings paid.
- Scoped booking reads to owner/admin/assigned host/assigned concierge and removed raw PII leaks.
- Removed PII from public calendar events.
- Fixed apartment `ethAddress` persistence and the frontend/backend double `depositAmount` conversion bug.
- Fixed admin customers route import, dashboard `recentBookingsCount`, concierge contractor query and decrypted staff display.
- Removed MongoDB public host port from compose and bound Mailpit to localhost only.
- Stopped copying full `.env` into the frontend build context; public frontend variables are passed as build args.
- Hardened Pi init scripts by removing `podman kill -a` and `chmod -R 777`.

Important migration notes:

- If production data already exists, changing `MASTER_ENCRYPTION_KEY` changes blind indexes. Keep the same key for existing data or plan a migration.
- Staff self-registration in production now requires `HOST_INVITE_CODE`, `CONCIERGE_INVITE_CODE`, or `CONTRACTOR_INVITE_CODE`.
- Crypto payments are not chain-verified by this project. In production the hash is saved for manual/admin verification only.
- Regenerate all secrets before deployment: `AUTH_JWT_SECRET`, `MASTER_ENCRYPTION_KEY`, `PLATFORM_ADMIN_KEY`, Stripe keys, and staff invite codes.
