#!/bin/bash
#
# fix-mongo-uri.sh — check .env and repair MONGO_URI using the running Mongo container.
#
# What it does (on the Pi, where the `mongo` podman container runs):
#   1. Reads the current MONGO_URI from .env (masked) and tests whether Mongo needs auth.
#   2. If auth is on, recovers the root user/password baked into the container
#      (podman inspect), falling back to creds already in MONGO_URI; verifies they work.
#   3. Detects which database actually holds the data (the one with an `apartments`
#      collection, else the largest non-system DB).
#   4. Writes a correct, URL-encoded MONGO_URI back into .env (after backing it up).
#
# This is an explicit, opt-in repair tool — the only writer of .env besides
# setup-env.sh. It always backs up first; deploy/start scripts never touch .env.
#
# Usage:
#   ./fix-mongo-uri.sh            # check + fix .env, then tell you to recreate the backend
#   ./fix-mongo-uri.sh --check    # read-only: report what it WOULD set, change nothing
#
# Env:
#   MONGO_CONTAINER  container name (default mongo)
set -euo pipefail
cd "$(dirname "$0")"

ENV_FILE=".env"
CONTAINER="${MONGO_CONTAINER:-mongo}"
CHECK_ONLY=false
[ "${1:-}" = "--check" ] && CHECK_ONLY=true

mask() { sed -E 's#://[^@]*@#://***:***@#'; }

# --- preconditions ---
[ -f "$ENV_FILE" ] || { echo "❌ $ENV_FILE not found. Run from the repo root (or use ./setup-env.sh)." >&2; exit 1; }
command -v podman >/dev/null 2>&1 || { echo "❌ podman not found." >&2; exit 1; }
podman ps --format '{{.Names}}' 2>/dev/null | grep -qx "$CONTAINER" \
    || { echo "❌ container '$CONTAINER' is not running. Start the stack first." >&2; exit 1; }

CUR_URI="$(grep -E '^MONGO_URI=' "$ENV_FILE" | tail -1 | cut -d= -f2- || true)"
echo "🔎 current MONGO_URI: $(printf '%s' "${CUR_URI:-<unset>}" | mask)"

# --- url encode/decode helpers (python3 preferred; bash fallback) ---
urlencode() {
    if command -v python3 >/dev/null 2>&1; then
        python3 -c 'import sys,urllib.parse;print(urllib.parse.quote(sys.argv[1],safe=""))' "$1"
    else
        local s="$1"
        s="${s//%/%25}"; s="${s//+/%2B}"; s="${s//\//%2F}"; s="${s//=/%3D}"
        s="${s//@/%40}"; s="${s//:/%3A}"; s="${s//\?/%3F}"; s="${s//&/%26}"; s="${s// /%20}"
        printf '%s' "$s"
    fi
}
urldecode() {
    if command -v python3 >/dev/null 2>&1; then
        python3 -c 'import sys,urllib.parse;print(urllib.parse.unquote(sys.argv[1]))' "$1"
    else
        printf '%b' "${1//%/\\x}"
    fi
}

# --- is auth enabled? (a no-cred admin command fails when auth is on) ---
NOAUTH_OK="$(podman exec "$CONTAINER" mongo --quiet --eval \
    'try{print(db.getSiblingDB("admin").runCommand({listDatabases:1}).ok)}catch(e){print(0)}' 2>/dev/null | tail -1 || echo 0)"
if [ "$NOAUTH_OK" = "1" ]; then AUTH_ON=false; else AUTH_ON=true; fi
echo "🔐 mongo auth enabled: $AUTH_ON"

U=""; P=""
if [ "$AUTH_ON" = true ]; then
    # 1) creds baked into the container at creation
    ENVDUMP="$(podman inspect "$CONTAINER" --format '{{range .Config.Env}}{{println .}}{{end}}' 2>/dev/null || true)"
    U="$(printf '%s\n' "$ENVDUMP" | sed -n 's/^MONGO_INITDB_ROOT_USERNAME=//p' | head -1)"
    P="$(printf '%s\n' "$ENVDUMP" | sed -n 's/^MONGO_INITDB_ROOT_PASSWORD=//p' | head -1)"
    # 2) fallback: creds already embedded in the current MONGO_URI
    if { [ -z "$U" ] || [ -z "$P" ]; } && printf '%s' "$CUR_URI" | grep -q '://[^@/]*@'; then
        ui="$(printf '%s' "$CUR_URI" | sed -E 's#^mongodb(\+srv)?://([^@]*)@.*#\2#')"
        U="$(urldecode "${ui%%:*}")"; P="$(urldecode "${ui#*:}")"
        echo "ℹ️  using credentials already present in MONGO_URI"
    fi
    [ -n "$U" ] && [ -n "$P" ] || {
        echo "❌ could not recover Mongo credentials (not in the container, not in MONGO_URI)." >&2
        echo "   Set them by hand or recreate the DB fresh (./clean.sh -> ./setup-env.sh)." >&2
        exit 1
    }
    OK="$(podman exec "$CONTAINER" mongo -u "$U" -p "$P" --authenticationDatabase admin --quiet \
        --eval 'try{print(db.runCommand({ping:1}).ok)}catch(e){print(0)}' 2>/dev/null | tail -1 || echo 0)"
    [ "$OK" = "1" ] || { echo "❌ recovered credentials do NOT authenticate against '$CONTAINER'." >&2; exit 1; }
    echo "✅ credentials authenticate (user '$U')"
fi

# --- run an eval with or without auth, depending on AUTH_ON ---
mrun() {
    if [ "$AUTH_ON" = true ]; then
        podman exec "$CONTAINER" mongo -u "$U" -p "$P" --authenticationDatabase admin --quiet --eval "$1" 2>/dev/null
    else
        podman exec "$CONTAINER" mongo --quiet --eval "$1" 2>/dev/null
    fi
}

# --- pick the database that holds the data ---
URI_DB="$(printf '%s' "$CUR_URI" | sed -E 's#.*/([^/?]+)(\?.*)?$#\1#')"
[ "$URI_DB" = "$CUR_URI" ] && URI_DB=""   # no path component
LIST="$(mrun 'db.adminCommand("listDatabases").databases.forEach(function(d){if(["admin","local","config"].indexOf(d.name)<0){var n=0;try{n=db.getSiblingDB(d.name).apartments.countDocuments({})}catch(e){}print(d.name+" "+n+" "+Math.round(d.sizeOnDisk))}})' || true)"

DBNAME=""; best_n=-1; best_size=-1
while read -r name n size; do
    [ -z "${name:-}" ] && continue
    n="${n%%.*}"; size="${size%%.*}"; n="${n:-0}"; size="${size:-0}"
    if [ "$n" -gt "$best_n" ] || { [ "$n" -eq "$best_n" ] && [ "$size" -gt "$best_size" ]; }; then
        best_n="$n"; best_size="$size"; DBNAME="$name"
    fi
done <<< "$LIST"
[ -n "$DBNAME" ] || DBNAME="${URI_DB:-bestflats}"
echo "🗄️  target database: $DBNAME (apartments docs: $([ "$best_n" -ge 0 ] && echo "$best_n" || echo n/a))"

# --- build the corrected URI ---
if [ "$AUTH_ON" = true ]; then
    NEW_URI="mongodb://$(urlencode "$U"):$(urlencode "$P")@${CONTAINER}:27017/${DBNAME}?authSource=admin"
else
    NEW_URI="mongodb://${CONTAINER}:27017/${DBNAME}"
fi
echo "🧩 new MONGO_URI:     $(printf '%s' "$NEW_URI" | mask)"

if [ "$NEW_URI" = "$CUR_URI" ]; then
    echo "✅ MONGO_URI is already correct — no change needed."
    exit 0
fi
if [ "$CHECK_ONLY" = true ]; then
    echo "👀 --check: would update MONGO_URI in $ENV_FILE (no change made)."
    exit 0
fi

# --- write it back (backup first; .env stays mode 600) ---
BAK="$ENV_FILE.bak-$(date -u +%Y%m%d-%H%M%S)"
cp "$ENV_FILE" "$BAK"
awk -v v="$NEW_URI" '
    /^MONGO_URI=/ { print "MONGO_URI=" v; found=1; next }
    { print }
    END { if (!found) print "MONGO_URI=" v }
' "$ENV_FILE" > "$ENV_FILE.tmp" && mv "$ENV_FILE.tmp" "$ENV_FILE"
chmod 600 "$ENV_FILE"
echo "🛟 backed up old .env -> $BAK"
echo "✅ updated MONGO_URI in $ENV_FILE"
echo
echo "Recreate the backend so it reads the new .env (plain start/up keeps the old env):"
echo "    cd rental-platform && podman rm -f backend && podman-compose up -d backend"
echo "    sleep 5 && curl -s http://localhost:4000/apartments | head -c 200"
