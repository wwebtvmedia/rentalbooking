#!/usr/bin/env python3
"""Add a host customer who proposes their Bardo house, using the data in tmp/bardo_maison.

Steps:
  1. Create a HOST user (the customer proposing the house) via the magic-link flow.
  2. Upload the downloaded photos (.avif) as admin -> Media collection.
  3. Create the apartment listing owned by that host, from tmp/bardo_maison/listing.json.

Requires an admin JWT in RENTAL_TOKEN. Magic-link host creation reads the dev server
log (AUTH_LOG_EMAIL_TOKEN=true) to capture the token, so LOG must point at it.

Env:
  BASE   (default http://192.168.1.104:4000)
  RENTAL_TOKEN  admin JWT (required)
  LOG    server log path (default /tmp/bfs_server.log)
  HOST_EMAIL / HOST_NAME  the proposing customer
"""
import os, sys, re, json, base64, time, pathlib, requests

BASE = os.getenv("BASE", "http://192.168.1.104:4000").rstrip("/")
ADMIN = os.getenv("RENTAL_TOKEN")
LOG = os.getenv("LOG", "/tmp/bfs_server.log")
HOST_EMAIL = os.getenv("HOST_EMAIL", "slim.benyedder@bardo.tn")
HOST_NAME = os.getenv("HOST_NAME", "Slim Ben Yedder")
REPO = pathlib.Path(__file__).resolve().parents[2]
LISTING_DIR = REPO / "tmp" / "bardo_maison"

if not ADMIN:
    sys.exit("RENTAL_TOKEN (admin JWT) is required")

admin_h = {"Authorization": f"Bearer {ADMIN}"}
listing = json.loads((LISTING_DIR / "listing.json").read_text())

# 1. Create the HOST customer via magic-link (dev logs the token) -------------
print(f"1. Creating host customer {HOST_EMAIL} ...")
r = requests.post(f"{BASE}/auth/magic", json={
    "email": HOST_EMAIL, "role": "host", "fullName": HOST_NAME,
    "redirectUrl": "http://localhost:3000",
}, timeout=15)
r.raise_for_status()
data = r.json()
token = data.get("token")
if not token:  # dev mode: pull it from the server log
    time.sleep(0.5)
    logtext = pathlib.Path(LOG).read_text(errors="ignore")
    matches = re.findall(r'"token":"([^"]+)"', logtext)
    if not matches:
        sys.exit("Could not capture magic token from log; set AUTH_LOG_EMAIL_TOKEN=true")
    token = matches[-1]
v = requests.post(f"{BASE}/auth/magic/verify", json={"token": token}, timeout=15)
v.raise_for_status()
host = v.json()["user"]
host_id = host["id"]
print(f"   host created: id={host_id} role={host.get('role') or host.get('roles')}")

# 2. Upload photos as admin ---------------------------------------------------
photo_urls = []
photos = sorted((LISTING_DIR / "photos").glob("*.avif"))
print(f"2. Uploading {len(photos)} photos ...")
for p in photos:
    b64 = base64.b64encode(p.read_bytes()).decode()
    up = requests.post(f"{BASE}/uploads", headers={**admin_h, "Content-Type": "application/json"},
                       json={"b64": b64, "filename": p.name}, timeout=30)
    up.raise_for_status()
    photo_urls.append(up.json()["url"])
print(f"   uploaded {len(photo_urls)} photos")

# 3. Create the apartment listing owned by the host ---------------------------
price = listing.get("price", {})
monthly = price.get("amount", 1800)
per_night = max(1, round(monthly / 30))  # ~nightly from a monthly rate
payload = {
    "name": f"{listing['title']} — proposed by {HOST_NAME}",
    "smallDescription": "Étage de villa S3 haut standing au Bardo, proche Route de la Mecque",
    "description": listing.get("description", "") + "\n\nÉquipements: " + ", ".join(listing.get("amenities", [])),
    "address": "Route de la Mecque, Le Bardo, Tunis, Tunisie",
    "pricePerNight": per_night,
    "lat": 36.8092, "lon": 10.1406,
    "rules": "No smoking, no parties. Respect the neighbours.",
    "photos": photo_urls,
    "hostId": host_id,
    "depositAmount": 0,
}
print(f"3. Creating apartment listing (pricePerNight={per_night}) ...")
c = requests.post(f"{BASE}/apartments", headers={**admin_h, "Content-Type": "application/json"},
                  json=payload, timeout=30)
if c.status_code != 201:
    sys.exit(f"apartment create failed: {c.status_code} {c.text[:300]}")
apt = c.json()
print(f"   listing created: id={apt['_id']} name={apt['name']!r}")
print(f"   photos: {len(apt.get('photos', []))}  hostId={apt.get('hostId')}  price/night={apt.get('pricePerNight')}")
print("\n✅ Done. Bardo host + house listing added.")
print(json.dumps({"hostId": host_id, "apartmentId": apt["_id"]}, indent=2))
