#!/usr/bin/env python3
"""host_journey.py — end-to-end host journey against a running backend.

Drives the REAL API the way a host would, reading magic-link / validation emails out
of mailcatcher.py:

  1. request a host magic link            (POST /auth/magic, role=host)
  2. read the email from the mail-catcher  -> extract the magic token
  3. verify it                             (POST /auth/magic/verify) -> host session token
  4. create N flats                        (POST /admin/host/flats)  -> each emails the admin
  5. read the admin validation emails      -> extract the validation links
  6. open each validation link             (publishes the flat)
  7. verify the flats are now public       (GET /apartments)

Local/staging usage (run mailcatcher.py first, with the backend's SMTP pointed at it):
    python3 rental-platform/scripts/mailcatcher.py &
    BASE=http://localhost:4000 MAIL_API=http://localhost:1080 \
      HOST_EMAIL=host@example.test HOST_INVITE_CODE=... N=3 \
      python3 rental-platform/scripts/host_journey.py

Env:
  BASE             backend base URL            (default http://localhost:4000)
  MAIL_API         mailcatcher HTTP API        (default http://localhost:1080)
  HOST_EMAIL       host signup email           (default host+<ts>@example.test)
  ADMIN_EMAIL      where validation mails go   (default admin@example.test)
  HOST_INVITE_CODE invite code if prod enforces it (optional)
  N                number of flats to create   (default 3)
  REDIRECT_URL     magic callback              (default $BASE/magic-callback)
  HOST_TOKEN       skip steps 1-3, use this session token directly (optional)
"""
import json
import os
import re
import sys
import time
import urllib.request
import urllib.error

BASE = os.getenv("BASE", "http://localhost:4000").rstrip("/")
MAIL_API = os.getenv("MAIL_API", "http://localhost:1080").rstrip("/")
HOST_EMAIL = os.getenv("HOST_EMAIL", f"host+{int(time.time())}@example.test")
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@example.test")
INVITE = os.getenv("HOST_INVITE_CODE", "")
N = int(os.getenv("N", "3"))
REDIRECT_URL = os.getenv("REDIRECT_URL", f"{BASE}/magic-callback")
HOST_TOKEN = os.getenv("HOST_TOKEN", "")
TOKEN_RE = re.compile(r"[?&]token=([A-Za-z0-9._-]+)")


def req(method, url, body=None, token=None):
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(url, data=data, method=method)
    r.add_header("Content-Type", "application/json")
    if token:
        r.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(r, timeout=20) as resp:
            return resp.status, json.loads(resp.read() or "null")
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read() or "null")
        except Exception:
            return e.code, None


def poll_mail(to_substr, want=1, contains=None, timeout=30):
    """Wait until >= want messages to `to_substr` exist; return them (newest first)."""
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(f"{MAIL_API}/messages?to={to_substr}", timeout=10) as resp:
                msgs = json.loads(resp.read() or "[]")
        except Exception:
            msgs = []
        if contains:
            msgs = [m for m in msgs if contains in (m.get("text", "") + " " + json.dumps(m.get("links", [])))]
        if len(msgs) >= want:
            return msgs
        time.sleep(1)
    return msgs if "msgs" in dir() else []


def first_token_from(msgs):
    for m in msgs:
        for link in m.get("links", []):
            mt = TOKEN_RE.search(link)
            if mt:
                return mt.group(1)
        mt = TOKEN_RE.search(m.get("text", ""))
        if mt:
            return mt.group(1)
    return None


def main():
    print(f"== host journey ==  BASE={BASE}  MAIL_API={MAIL_API}  host={HOST_EMAIL}  N={N}")
    token = HOST_TOKEN

    if not token:
        # clear the mailbox so we only see this run's emails
        try:
            urllib.request.urlopen(urllib.request.Request(f"{MAIL_API}/messages", method="DELETE"), timeout=5).read()
        except Exception as e:
            print(f"  ! could not reach mail API at {MAIL_API}: {e}")

        body = {"email": HOST_EMAIL, "role": "host", "redirectUrl": REDIRECT_URL}
        if INVITE:
            body["inviteCode"] = INVITE
        st, resp = req("POST", f"{BASE}/auth/magic", body)
        print(f"  1. POST /auth/magic -> {st}")
        if st != 200:
            print("     FAILED:", resp); sys.exit(1)

        # dev/test mode returns the token directly; prod sends an email we read from the catcher
        token_value = (resp or {}).get("token")
        if token_value:
            print("     (token returned directly — dev/test mode)")
            magic = token_value
        else:
            print(f"  2. reading magic email for {HOST_EMAIL} from mail-catcher ...")
            msgs = poll_mail(HOST_EMAIL, want=1)
            magic = first_token_from(msgs)
            if not magic:
                print("     FAILED: no magic token found in captured email"); sys.exit(1)
            print("     got magic token from email ✓")

        st, resp = req("POST", f"{BASE}/auth/magic/verify", {"token": magic})
        print(f"  3. POST /auth/magic/verify -> {st}")
        if st != 200 or not (resp or {}).get("token"):
            print("     FAILED:", resp); sys.exit(1)
        token = resp["token"]
        print(f"     host session established (user {resp.get('user', {}).get('id', '?')}) ✓")

    # clear mailbox again to isolate the admin validation emails
    try:
        urllib.request.urlopen(urllib.request.Request(f"{MAIL_API}/messages", method="DELETE"), timeout=5).read()
    except Exception:
        pass

    created = []
    for i in range(1, N + 1):
        flat = {
            "name": f"E2E Test Flat {i} ({int(time.time())})",
            "pricePerNight": 100 + i * 10,
            "smallDescription": f"Automated host-journey test flat #{i}",
            "description": "Created by host_journey.py end-to-end test.",
            "address": f"{i} Test Avenue, Testville",
            "depositAmount": 10000 * i,
        }
        st, resp = req("POST", f"{BASE}/admin/host/flats", flat, token=token)
        ok = st == 201
        fid = (resp or {}).get("flat", {}).get("_id")
        created.append(fid)
        print(f"  4.{i} POST /admin/host/flats -> {st} {'✓' if ok else '✗ ' + json.dumps(resp)} id={fid}")

    # the host's own flats should list them as pending; the public list must NOT
    st, mine = req("GET", f"{BASE}/admin/host/flats", token=token)
    mine_ids = [f.get("_id") for f in (mine or [])] if isinstance(mine, list) else []
    print(f"  5. GET /admin/host/flats -> {st}  (mine: {len(mine_ids)}, pending shown to owner)")
    st, pub = req("GET", f"{BASE}/apartments")
    pub_ids = [f.get("_id") for f in (pub or [])] if isinstance(pub, list) else []
    leaked = [c for c in created if c in pub_ids]
    print(f"  6. GET /apartments (public) -> {st}  pending hidden from public: {'✓' if not leaked else '✗ LEAKED ' + str(leaked)}")

    # read the admin validation emails and open the links to publish
    print(f"  7. reading {N} admin validation email(s) for {ADMIN_EMAIL} ...")
    amsgs = poll_mail(ADMIN_EMAIL, want=N, contains="/flats/validate")
    validate_links = []
    for m in amsgs:
        validate_links += [l for l in m.get("links", []) if "/flats/validate" in l]
    validate_links = list(dict.fromkeys(validate_links))  # dedup (link appears in text + raw)
    print(f"     captured {len(amsgs)} admin email(s), {len(validate_links)} validation link(s)")
    published = 0
    for link in validate_links:
        st, _ = req("GET", link)
        if st == 200:
            published += 1
    print(f"  8. opened validation links -> published {published}/{len(validate_links)}")

    st, pub = req("GET", f"{BASE}/apartments")
    pub_ids = [f.get("_id") for f in (pub or [])] if isinstance(pub, list) else []
    now_public = [c for c in created if c in pub_ids]
    print(f"  9. GET /apartments -> {st}  newly-published test flats visible: {len(now_public)}/{len([c for c in created if c])}")

    ok = all(created) and not leaked
    print("\nRESULT:", "✅ PASS" if ok else "⚠️  see ✗ above")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
