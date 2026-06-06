#!/usr/bin/env python3
"""Simulate the real customer journey: sign up by email, switch to the host
("provide new flats") profile, and publish a flat with all its information.

Uses ONLY the customer's own email-based session token — no admin token. This
exercises the self-service host flow end to end.

Env:
  BASE  (default http://192.168.1.104:4000)
  LOG   server log path to capture the magic token (default /tmp/bfs_server.log)
  EMAIL / NAME  the customer
"""
import os, re, json, time, base64, pathlib, sys, requests

BASE = os.getenv("BASE", "http://192.168.1.104:4000").rstrip("/")
LOG = os.getenv("LOG", "/tmp/bfs_server.log")
EMAIL = os.getenv("EMAIL", "amine.gharbi@bardo.tn")
NAME = os.getenv("NAME", "Amine Gharbi")
REPO = pathlib.Path(__file__).resolve().parents[2]
LISTING_DIR = REPO / "tmp" / "bardo_maison"
listing = json.loads((LISTING_DIR / "listing.json").read_text())
s = requests.Session()


def log_tokens():
    return re.findall(r'"token":"([^"]+)"', pathlib.Path(LOG).read_text(errors="ignore"))


# 1. Create a login by email (magic link) and switch to the host profile -------
print(f"STEP 1  Email sign-up — requesting magic link for {EMAIL} as a host (provide-flats profile)")
before = len(log_tokens())
r = s.post(f"{BASE}/auth/magic", json={
    "email": EMAIL, "fullName": NAME, "role": "host",
    "redirectUrl": "http://localhost:3000",
}, timeout=15)
r.raise_for_status()
print(f"        -> {r.json().get('message', r.json())}")

# capture the emailed token (dev logs it; in prod it would arrive by email)
token = None
for _ in range(10):
    toks = log_tokens()
    if len(toks) > before:
        token = toks[-1]; break
    time.sleep(0.3)
if not token:
    sys.exit("Could not capture the magic-link token from the email log.")
preview = re.findall(r'"preview":"([^"]+)"', pathlib.Path(LOG).read_text(errors="ignore"))
print(f"        magic email delivered (preview: {preview[-1] if preview else 'n/a'})")

print("STEP 2  Clicking the magic link -> verifying and creating the session")
v = s.post(f"{BASE}/auth/magic/verify", json={"token": token}, timeout=15)
v.raise_for_status()
sess = v.json()
me = sess["user"]
s.headers.update({"Authorization": f"Bearer {sess['token']}"})
print(f"        logged in: {me['fullName']} <{me['email']}>  role={me.get('role') or me.get('roles')}")

# 3. Upload the property photos (as the host) ---------------------------------
photos = sorted((LISTING_DIR / "photos").glob("*.avif"))
print(f"STEP 3  Uploading {len(photos)} property photos from the host's session")
photo_urls = []
for p in photos:
    b64 = base64.b64encode(p.read_bytes()).decode()
    up = s.post(f"{BASE}/uploads", json={"b64": b64, "filename": p.name}, timeout=30)
    up.raise_for_status()
    photo_urls.append(up.json()["url"])
print(f"        uploaded {len(photo_urls)} photos")

# 4. Fill in ALL the information and publish the flat -------------------------
monthly = listing.get("price", {}).get("amount", 1800)
per_night = max(1, round(monthly / 30))
payload = {
    "name": listing["title"],
    "smallDescription": "Étage de villa S3 haut standing au Bardo, proche Route de la Mecque",
    "description": listing.get("description", "") + "\n\nÉquipements: " + ", ".join(listing.get("amenities", [])),
    "address": "Route de la Mecque, Le Bardo, Tunis, Tunisie",
    "pricePerNight": per_night,
    "depositAmount": 0,
    "lat": 36.8092, "lon": 10.1406,
    "rules": "Non-fumeur, pas de fêtes. Respect du voisinage.",
    "photos": photo_urls,
}
print(f"STEP 4  Filling all info and publishing the flat (pricePerNight={per_night})")
c = s.post(f"{BASE}/admin/host/flats", json=payload, timeout=30)
if c.status_code != 201:
    sys.exit(f"publish failed: {c.status_code} {c.text[:300]}")
apt = c.json()
print(f"        published: id={apt['_id']}  hostId={apt['hostId']}  photos={len(apt['photos'])}")

# 5. Confirm via the host's own views ----------------------------------------
mine = s.get(f"{BASE}/admin/host/flats", timeout=15).json()
dash = s.get(f"{BASE}/admin/host/dashboard", timeout=15).json()
pub = requests.get(f"{BASE}/apartments", timeout=15).json()
print("\n✅ Journey complete (email login -> host -> published flat)")
print(f"   my flats: {len(mine)}   dashboard flatCount: {dash['summary']['flatCount']}   in public listings: "
      f"{any(a['_id'] == apt['_id'] for a in pub)}")
print(json.dumps({"customer": me["email"], "hostId": apt["hostId"], "apartmentId": apt["_id"],
                  "address": apt["address"], "pricePerNight": apt["pricePerNight"]}, indent=2, ensure_ascii=False))
