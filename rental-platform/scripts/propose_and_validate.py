#!/usr/bin/env python3
"""Classic procedure: a host signs up by email, submits a flat (-> pending, admin
emailed a validation link), then the admin opens that link to publish it.

Uses the host's email session for submission and reconstructs the admin's
validation URL (the same signed token the email contains) to approve it.

Usage:
    SECRET=$(grep '^AUTH_JWT_SECRET=' .env | cut -d= -f2-) \
    python3 rental-platform/scripts/propose_and_validate.py tmp/bardo2 host@bardo.tn "Owner Name"

Env: BASE (default http://192.168.1.104:4000), LOG (default /tmp/bfs_server.log), SECRET (AUTH_JWT_SECRET)
"""
import os, re, sys, json, time, base64, pathlib, requests, jwt as pyjwt

BASE = os.getenv("BASE", "http://192.168.1.104:4000").rstrip("/")
LOG = os.getenv("LOG", "/tmp/bfs_server.log")
SECRET = os.getenv("SECRET")
d = pathlib.Path(sys.argv[1]); EMAIL = sys.argv[2]; NAME = sys.argv[3] if len(sys.argv) > 3 else "Host Owner"
listing = json.loads((d / "listing.json").read_text())
s = requests.Session()


def log_tokens():
    return re.findall(r'"token":"([^"]+)"', pathlib.Path(LOG).read_text(errors="ignore"))


print(f"\n=== Classic procedure for {listing['title']!r} (host {EMAIL}) ===")
# 1. email signup as host
before = len(log_tokens())
r = s.post(f"{BASE}/auth/magic", json={"email": EMAIL, "fullName": NAME, "role": "host", "redirectUrl": "http://localhost:3000"}, timeout=15)
r.raise_for_status()
tok = None
for _ in range(12):
    t = log_tokens()
    if len(t) > before:
        tok = t[-1]; break
    time.sleep(0.3)
assert tok, "no magic token captured"
v = s.post(f"{BASE}/auth/magic/verify", json={"token": tok}, timeout=15); v.raise_for_status()
s.headers.update({"Authorization": f"Bearer {v.json()['token']}"})
print(f"1. host signed up by email -> role={v.json()['user'].get('role')}")

# 2. upload photos (host session)
urls = []
for p in sorted((d / "photos").glob("*.avif")):
    up = s.post(f"{BASE}/uploads", json={"b64": base64.b64encode(p.read_bytes()).decode(), "filename": p.name}, timeout=60)
    up.raise_for_status(); urls.append(up.json()["url"])
print(f"2. uploaded {len(urls)} photos")

# 3. submit the flat -> pending, admin emailed a validation link
price = listing["price"]["amount"]
per_night = price if listing["price"].get("period") == "night" else max(1, round(price / 30))
payload = {
    "name": listing["title"],
    "smallDescription": listing.get("description", "")[:90],
    "description": listing.get("description", "") + "\n\nÉquipements: " + ", ".join(listing.get("amenities", [])),
    "address": listing["address"], "pricePerNight": per_night, "depositAmount": 0,
    "lat": listing.get("lat"), "lon": listing.get("lon"),
    "rules": "Non-fumeur, pas de fêtes. Respect du voisinage.", "photos": urls,
}
c = s.post(f"{BASE}/admin/host/flats", json=payload, timeout=30)
assert c.status_code == 201, f"{c.status_code} {c.text[:200]}"
flat = c.json()["flat"]
print(f"3. submitted -> status={c.json()['status']} id={flat['_id']}  (admin emailed a validation link)")

# verify it is hidden from the public list while pending
pub = requests.get(f"{BASE}/apartments", timeout=15).json()
print(f"   hidden from public Book Now while pending: {not any(a['_id']==flat['_id'] for a in pub)}")

# 4. admin opens the emailed validation link (reconstruct the signed URL the email contains)
assert SECRET, "SECRET (AUTH_JWT_SECRET) required to reproduce the admin validation link"
vtoken = pyjwt.encode({"flatId": flat["_id"], "purpose": "flat-validation"}, SECRET, algorithm="HS256")
vr = requests.get(f"{BASE}/admin/host/flats/validate", params={"token": vtoken}, timeout=15)
print(f"4. admin clicked validation link -> HTTP {vr.status_code}")

# 5. now visible on public Book Now
pub2 = requests.get(f"{BASE}/apartments", timeout=15).json()
live = any(a["_id"] == flat["_id"] for a in pub2)
print(f"5. published & visible on Book Now: {live}")
print(json.dumps({"apartmentId": flat["_id"], "name": flat["name"], "pricePerNight": per_night, "published": live}, ensure_ascii=False))
