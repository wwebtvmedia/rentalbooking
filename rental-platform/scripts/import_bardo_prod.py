#!/usr/bin/env python3
"""Self-contained importer: publish the Bardo flat so it appears on Book Now.

Photos + listing data are committed next to this script, so it runs anywhere
(including the Raspberry Pi after `git pull`) with only an admin token.

Usage (from repo root):
    # mint an admin token from the LOCAL .env secret (on the Pi this is the prod secret):
    export RENTAL_TOKEN=$(python3 gen_token.py "$(grep '^AUTH_JWT_SECRET=' .env | cut -d= -f2-)")
    BASE=https://api.bestflats.vip python3 rental-platform/scripts/import_bardo_prod.py

Env:
    BASE          target API (default https://api.bestflats.vip)
    RENTAL_TOKEN  admin JWT (required)
    HOST_ID       optional: attribute the flat to this host user id
    FORCE         set to 1 to create even if a same-named flat already exists
"""
import os, sys, json, base64, pathlib, requests

BASE = os.getenv("BASE", "https://api.bestflats.vip").rstrip("/")
TOKEN = os.getenv("RENTAL_TOKEN")
HOST_ID = os.getenv("HOST_ID")
FORCE = os.getenv("FORCE") == "1"
HERE = pathlib.Path(__file__).resolve().parent
listing = json.loads((HERE / "bardo_listing.json").read_text())

if not TOKEN:
    sys.exit("RENTAL_TOKEN (admin JWT) is required. On the Pi:\n"
             "  export RENTAL_TOKEN=$(python3 gen_token.py \"$(grep '^AUTH_JWT_SECRET=' .env | cut -d= -f2-)\")")

h = {"Authorization": f"Bearer {TOKEN}"}

# Auth sanity check up front so we fail clearly instead of mid-way.
me = requests.get(f"{BASE}/auth/me", headers=h, timeout=15)
if me.status_code != 200:
    sys.exit(f"Admin token rejected by {BASE} (HTTP {me.status_code}). "
             f"Use the secret from the SAME environment as {BASE} (prod .env on the Pi).")
print(f"Authenticated on {BASE} as {me.json().get('email')} roles={me.json().get('roles')}")

name = listing["title"]
existing = requests.get(f"{BASE}/apartments", timeout=15).json()
dup = next((a for a in existing if a.get("name") == name), None)
if dup and not FORCE:
    print(f"A flat named {name!r} already exists on {BASE} (id={dup['_id']}). "
          f"Re-run with FORCE=1 to create another. Nothing to do.")
    sys.exit(0)

# Upload photos
photos = sorted((HERE / "bardo_photos").glob("*.avif"))
print(f"Uploading {len(photos)} photos to {BASE} ...")
urls = []
for p in photos:
    b64 = base64.b64encode(p.read_bytes()).decode()
    up = requests.post(f"{BASE}/uploads", headers={**h, "Content-Type": "application/json"},
                       json={"b64": b64, "filename": p.name}, timeout=60)
    up.raise_for_status()
    urls.append(up.json()["url"])
print(f"  uploaded {len(urls)} photos")

monthly = listing.get("price", {}).get("amount", 1800)
per_night = max(1, round(monthly / 30))
payload = {
    "name": name,
    "smallDescription": "Étage de villa S3 haut standing au Bardo, proche Route de la Mecque",
    "description": listing.get("description", "") + "\n\nÉquipements: " + ", ".join(listing.get("amenities", [])),
    "address": "Route de la Mecque, Le Bardo, Tunis, Tunisie",
    "pricePerNight": per_night,
    "depositAmount": 0,
    "lat": 36.8092, "lon": 10.1406,
    "rules": "Non-fumeur, pas de fêtes. Respect du voisinage.",
    "photos": urls,
}
if HOST_ID:
    payload["hostId"] = HOST_ID

c = requests.post(f"{BASE}/apartments", headers={**h, "Content-Type": "application/json"}, json=payload, timeout=30)
if c.status_code != 201:
    sys.exit(f"Create failed: {c.status_code} {c.text[:300]}")
apt = c.json()
print(f"\n✅ Published on {BASE} — visible on Book Now")
print(json.dumps({"apartmentId": apt["_id"], "name": apt["name"], "address": apt["address"],
                  "pricePerNight": apt["pricePerNight"], "photos": len(apt.get("photos", []))},
                 indent=2, ensure_ascii=False))
