ADMIN ACCESS & TOKENS

Purpose
- This file documents how to create and use admin tokens to perform admin-only actions (create availabilities, manage apartments, cancel bookings, etc.).

1) Create an admin token

Local (recommended during development):
- From the repo root run:
  cd backend
  node src/auth/create_token.js --id=admin1 --name=Admin --email=admin@example.com --roles=admin
- The script prints a JWT token string. Copy it.

From the running backend container:
- Run inside container to ensure it uses the same environment (secrets):
  docker-compose exec backend node src/auth/create_token.js --id=admin1 --name=Admin --email=admin@example.com --roles=admin

Notes:
- The script signs tokens with the secret found in `AUTH_JWT_SECRET` or `JWT_SECRET` (see `.env`). If the secret isn't set the script will throw an error.
- Default expiry when created with the script is 7 days (can be changed by editing the create_token helper).

2) Verify the token works

- Call the `/auth/me` endpoint to confirm the token is valid and contains the `admin` role:
  curl -H "Authorization: Bearer <ADMIN_TOKEN>" http://localhost:4000/auth/me

- Expected result: JSON user object with `roles` that include `admin`.

3) Use the admin token with curl (examples)

- Create an availability (admin-only):
  curl -X POST \
    -H "Authorization: Bearer <ADMIN_TOKEN>" \
    -H "Content-Type: application/json" \
    -d '{"start":"2026-01-06T10:00:00Z","end":"2026-01-06T18:00:00Z","type":"blocked","apartmentId":"apt1"}' \
    http://localhost:4000/availabilities

- Create an apartment:
  curl -X POST -H "Authorization: Bearer <ADMIN_TOKEN>" -H "Content-Type: application/json" -d '{"name":"Test Apt","pricePerNight":100}' http://localhost:4000/apartments

- Cancel a booking as admin:
  curl -X POST -H "Authorization: Bearer <ADMIN_TOKEN>" http://localhost:4000/bookings/<BOOKING_ID>/cancel


Front-end Admin page features (added)
- Add at least 3 photos (either upload or comma-separated URLs). The UI enforces a minimum of 3 photos when creating or updating an apartment.
- Small description (short text) in addition to the full description.
- Address field plus a "Use GPS" button that fills latitude/longitude using the browser's geolocation API (if available).
- Buttons in the form area:
  - "New" — clear the form to create a new apartment
  - "Create" / "Update" — create or update the apartment depending on edit state
  - "Delete" — delete the currently editing apartment (requires admin token)

Notes:
- Uploaded photos are stored via the existing /uploads endpoint and appended to the apartment's photo list.
- When editing an apartment the form is populated with existing photos, address/small description and location values.

Geocoding:
- The admin UI includes a **Geocode** button which will look up the current `Address` text and fill `Latitude` and `Longitude`.
- By default the backend proxies requests to OpenStreetMap/Nominatim (no API key required). To use a different provider or proxy, set `GEOCODER_PROVIDER_URL` in the backend environment (e.g., to a different geocoder endpoint). You can also set `GEOCODER_USER_AGENT` to identify your app per provider requirements.

4) Use the token in the frontend UI

- Some admin actions in the UI will prompt for an "Admin token" (for example: modify/delete an availability, cancel a booking as admin, or on the `/admin` page).
- Paste the token into the prompt when requested. The frontend will send it as `Authorization: Bearer <TOKEN>`.
- For convenience during development you can set a browser localStorage item to keep the token:
  localStorage.setItem('token', '<ADMIN_TOKEN>')
  (the frontend reads `localStorage.getItem('token')` for guest/admin actions)

5) Troubleshooting & tips

- 403 Forbidden / token not accepted
  - Verify the token contains a `roles` array with `admin` (use `curl /auth/me` to check).
  - Confirm `AUTH_JWT_SECRET` or `JWT_SECRET` in `.env` matches the value used when signing the token.

- "Invalid or expired token"
  - Admin tokens created with `create_token` have expiry (7d default); check expiry.
  - For magic sign-in tokens: they are single-use and short-lived (15 minutes) — reusing will return "Invalid or expired token".
  - Check server time / container clock: `docker-compose exec backend date`.

- Check backend logs for relevant messages:
  docker-compose logs -f backend
  or filter on PowerShell: docker-compose logs -f backend | Select-String 'Authorization' | Select-String 'token'

- Inspect token payload quickly (without verification):
  - Use jwt.io or decode the middle segment: the token has three parts; the middle part is base64url JSON with claims (replace -/_ and base64-decode it to inspect `exp`, `roles`, `email`).

6) Security notes

- Admin tokens provide powerful access; treat them like credentials. Keep them secret and rotate when needed.
- For production, do not store long-lived admin tokens in browser localStorage; use secure flows such as server-side sessions, short-lived tokens + refresh, or proper admin auth measures.

If you want, I can:
- Generate and paste a one-time admin token for immediate testing.
- Add a short example of copying a token to localStorage and using the UI, or add this text into the main `README.md` instead of a separate file.
