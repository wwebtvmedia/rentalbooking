#!/usr/bin/env python3
"""Remote non-regression smoke suite for the live Raspberry Pi deployment.

Runs read-only checks against the production API by default. If RENTAL_TOKEN
(a prod-signed admin JWT) is provided, also runs admin-authenticated checks.

Usage:
    python3 remote_nonreg.py                       # api.bestflats.vip
    BASE=https://api.bestflats.vip python3 remote_nonreg.py
    RENTAL_TOKEN=<prod-admin-jwt> python3 remote_nonreg.py   # include admin checks
"""
import os
import sys
import requests

BASE = os.getenv("BASE", "https://api.bestflats.vip").rstrip("/")
FRONTEND = os.getenv("FRONTEND", "https://www.bestflats.vip").rstrip("/")
TOKEN = os.getenv("RENTAL_TOKEN")
TIMEOUT = 15

passed, failed, skipped = 0, 0, 0


def check(name, fn):
    global passed, failed
    try:
        fn()
        print(f"  ✓ {name}")
        passed += 1
    except AssertionError as e:
        print(f"  ✗ {name}  -> {e}")
        failed += 1
    except Exception as e:  # network etc.
        print(f"  ✗ {name}  -> ERROR {type(e).__name__}: {e}")
        failed += 1


def skip(name, why):
    global skipped
    print(f"  ⊘ {name}  (skipped: {why})")
    skipped += 1


print(f"=== Remote non-regression: {BASE} ===")

# --- Public / read-only ---
def frontend_up():
    r = requests.get(FRONTEND, timeout=TIMEOUT)
    assert r.status_code == 200, f"expected 200, got {r.status_code}"
check("frontend www.bestflats.vip returns 200", frontend_up)

def version_endpoint():
    r = requests.get(f"{BASE}/version", timeout=TIMEOUT)
    assert r.status_code == 200, f"expected 200, got {r.status_code} (deploy /version to the Pi)"
    body = r.json()
    assert body.get("name") == "bestflats-backend", f"unexpected name: {body.get('name')}"
    print(f"      live build: version={body.get('version')} commit={body.get('commit')} builtAt={body.get('builtAt')}")
check("GET /version reports build metadata", version_endpoint)

def apartments_public():
    r = requests.get(f"{BASE}/apartments", timeout=TIMEOUT)
    assert r.status_code == 200, f"expected 200, got {r.status_code}"
    assert isinstance(r.json(), list), "expected a JSON array"
check("GET /apartments returns a list", apartments_public)

def ucp_discover():
    r = requests.get(f"{BASE}/ucp/discover", params={"capabilityHash": "rental-listing-v1"}, timeout=TIMEOUT)
    assert r.status_code == 200, f"expected 200, got {r.status_code}"
    assert r.json().get("protocol") == "UCP/1.0", "expected protocol UCP/1.0"
check("GET /ucp/discover speaks UCP/1.0", ucp_discover)

# --- Auth guards (negative) ---
def booking_requires_auth():
    r = requests.post(f"{BASE}/bookings", json={"start": "2027-05-01", "end": "2027-05-03"}, timeout=TIMEOUT)
    assert r.status_code == 401, f"expected 401, got {r.status_code}"
check("POST /bookings without token -> 401", booking_requires_auth)

def admin_requires_auth():
    r = requests.get(f"{BASE}/admin/platform/stats", timeout=TIMEOUT)
    assert r.status_code == 401, f"expected 401, got {r.status_code}"
check("GET /admin/platform/stats without token -> 401", admin_requires_auth)

# --- Admin-authenticated (only if a prod admin token is supplied) ---
if TOKEN:
    h = {"Authorization": f"Bearer {TOKEN}"}

    def admin_stats_ok():
        r = requests.get(f"{BASE}/admin/platform/stats", headers=h, timeout=TIMEOUT)
        assert r.status_code == 200, f"expected 200, got {r.status_code} (token rejected? prod secret mismatch)"
        assert "summary" in r.json(), "expected summary in stats"
    check("GET /admin/platform/stats with admin token -> 200", admin_stats_ok)

    def agent_booking_guarded():
        # The non-ObjectId-subject fix: an admin/agent token must NOT 500 on booking.
        r = requests.post(f"{BASE}/bookings", headers=h, json={"start": "2027-05-01", "end": "2027-05-03"}, timeout=TIMEOUT)
        assert 400 <= r.status_code < 500, f"expected handled 4xx, got {r.status_code} ({r.text[:120]})"
    check("POST /bookings with admin/agent token -> handled 4xx (not 500)", agent_booking_guarded)
else:
    skip("admin stats (authenticated)", "set RENTAL_TOKEN to a prod admin JWT")
    skip("agent booking guard (authenticated)", "set RENTAL_TOKEN to a prod admin JWT")

print(f"\n=== {passed} passed, {failed} failed, {skipped} skipped ===")
sys.exit(1 if failed else 0)
