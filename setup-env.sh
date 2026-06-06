#!/bin/bash
#
# setup-env.sh — generate the root .env (the ONE script allowed to write it).
#
# Every other script treats .env as a read-only, operator-managed source of truth.
# This generator exists to create it correctly the FIRST time (or to regenerate it on
# request), so nobody has to hand-assemble a MONGO_URI and trip over URL-encoding.
#
# Safety:
#   • If .env already exists it REFUSES to overwrite unless you pass --force.
#   • With --force it first backs up the current file to .env.bak-<timestamp>.
#   • Secrets (AUTH_JWT_SECRET, MASTER_ENCRYPTION_KEY, PLATFORM_ADMIN_KEY) are random
#     unless you supply them via env vars.
#   • The MongoDB password is URL-encoded into MONGO_URI (base64 passwords contain
#     + / = which are invalid raw in a URI).
#
# Usage:
#   ./setup-env.sh                              # no-auth Mongo (mongodb://mongo:27017/bestflats)
#   MONGO_ROOT_USERNAME=bfs MONGO_ROOT_PASSWORD='s3cr3t' ./setup-env.sh   # auth-enabled URI
#   MONGO_ROOT_USERNAME=bfs ./setup-env.sh      # prompts for the password (hidden)
#   FRONTEND_ORIGIN=https://www.bestflats.vip NEXT_PUBLIC_BACKEND_URL=https://api.bestflats.vip \
#     ADMIN_EMAIL=you@example.com ./setup-env.sh
#   ./setup-env.sh --force                      # regenerate (backs up the old .env first)
#
# Overridable via env (anything unset keeps the .env.example default):
#   MONGO_DB (default bestflats), MONGO_ROOT_USERNAME, MONGO_ROOT_PASSWORD,
#   AUTH_JWT_SECRET, MASTER_ENCRYPTION_KEY, PLATFORM_ADMIN_KEY,
#   NEXT_PUBLIC_BRAND_NAME, FRONTEND_ORIGIN, NEXT_PUBLIC_BACKEND_URL, ADMIN_EMAIL,
#   SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, MAIL_FROM,
#   STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_CURRENCY,
#   DEPOSIT_DEFAULT_AMOUNT, TAX_RATE (default 0.20)
set -euo pipefail

cd "$(dirname "$0")"

ENV_FILE=".env"
EXAMPLE="rental-platform/.env.example"
CONTAINER="${MONGO_CONTAINER:-mongo}"
FORCE=false
NO_AUTH=false
for arg in "$@"; do
    case "$arg" in
        --force)   FORCE=true ;;
        --no-auth) NO_AUTH=true ;;
        -h|--help) echo "Usage: $0 [--force] [--no-auth]"; exit 0 ;;
        *) echo "Unknown option: $arg" >&2; echo "Usage: $0 [--force] [--no-auth]" >&2; exit 1 ;;
    esac
done

[ -f "$EXAMPLE" ] || { echo "❌ $EXAMPLE not found — run from the repo root." >&2; exit 1; }

# Guard: never silently clobber an existing .env.
if [ -f "$ENV_FILE" ] && [ "$FORCE" != true ]; then
    echo "❌ $ENV_FILE already exists. Refusing to overwrite." >&2
    echo "   Re-run with --force to regenerate (the current file is backed up first)." >&2
    exit 1
fi
if [ -f "$ENV_FILE" ] && [ "$FORCE" = true ]; then
    BAK="$ENV_FILE.bak-$(date -u +%Y%m%d-%H%M%S)"
    cp "$ENV_FILE" "$BAK"
    echo "🛟 Backed up existing .env -> $BAK"
    echo "   (copy any real SMTP / Stripe values from there if you had them.)"
fi

# Defaults (env overrides win).
MONGO_DB="${MONGO_DB:-bestflats}"
TAX_RATE="${TAX_RATE:-0.20}"
AUTH_JWT_SECRET="${AUTH_JWT_SECRET:-$(openssl rand -base64 32)}"
MASTER_ENCRYPTION_KEY="${MASTER_ENCRYPTION_KEY:-$(openssl rand -base64 32)}"
PLATFORM_ADMIN_KEY="${PLATFORM_ADMIN_KEY:-$(openssl rand -base64 32)}"

# URL-encode a string for safe use in a URI (prefers python3; bash fallback otherwise).
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

# Reuse the root creds baked into an EXISTING mongo container, so .env matches the live
# DB. Returns 1 if there's no usable container/creds (incl. the broken literal placeholder).
recover_existing_mongo_creds() {
    command -v podman >/dev/null 2>&1 || return 1
    podman ps -a --format '{{.Names}}' 2>/dev/null | grep -qx "$CONTAINER" || return 1
    local dump u p
    dump="$(podman inspect "$CONTAINER" --format '{{range .Config.Env}}{{println .}}{{end}}' 2>/dev/null || true)"
    u="$(printf '%s\n' "$dump" | sed -n 's/^MONGO_INITDB_ROOT_USERNAME=//p' | head -1)"
    p="$(printf '%s\n' "$dump" | sed -n 's/^MONGO_INITDB_ROOT_PASSWORD=//p' | head -1)"
    case "$u" in ''|'${MONGO_ROOT_USERNAME:-}') return 1 ;; esac   # empty or the broken literal
    [ -n "$p" ] || return 1
    MONGO_ROOT_USERNAME="$u"; MONGO_ROOT_PASSWORD="$p"; return 0
}

# Decide Mongo credentials:
#   • explicit MONGO_ROOT_USERNAME (env)          -> use it
#   • --no-auth                                   -> no auth
#   • an existing mongo container with real creds -> REUSE them (match the live DB)
#   • otherwise (the mongo container does NOT exist) -> AUTO-GENERATE a secure user+password
GENERATED=false
if [ -n "${MONGO_ROOT_USERNAME:-}" ]; then
    :
elif [ "$NO_AUTH" = true ]; then
    :
elif recover_existing_mongo_creds; then
    echo "🔁 Reusing existing Mongo root creds from container '$CONTAINER' (user '$MONGO_ROOT_USERNAME')."
else
    USR_RANDOM="$(printf '%04d' "$(( RANDOM % 10000 ))")"
    MONGO_ROOT_USERNAME="bfs${USR_RANDOM}"
    MONGO_ROOT_PASSWORD="$(head -c 256 /dev/urandom | LC_ALL=C tr -dc 'A-Za-z0-9' | cut -c1-12)"
    GENERATED=true
    echo "🔑 No mongo container found — generated fresh root creds (user '$MONGO_ROOT_USERNAME')."
fi

# Build MONGO_URI — with auth if a root username is set, otherwise no-auth.
if [ -n "${MONGO_ROOT_USERNAME:-}" ]; then
    if [ -z "${MONGO_ROOT_PASSWORD:-}" ]; then
        read -rsp "MongoDB root password for '$MONGO_ROOT_USERNAME': " MONGO_ROOT_PASSWORD; echo
    fi
    [ -n "$MONGO_ROOT_PASSWORD" ] || { echo "❌ MONGO_ROOT_PASSWORD is empty." >&2; exit 1; }
    EU="$(urlencode "$MONGO_ROOT_USERNAME")"
    EP="$(urlencode "$MONGO_ROOT_PASSWORD")"
    MONGO_URI="mongodb://$EU:$EP@mongo:27017/$MONGO_DB?authSource=admin"
    AUTH_MODE="auth (authSource=admin)"
else
    MONGO_URI="mongodb://mongo:27017/$MONGO_DB"
    AUTH_MODE="no-auth"
fi

# Set or append KEY=VALUE in a file (value is written literally — no shell/sed surprises).
set_kv() {
    local key="$1" val="$2" file="$3"
    awk -v k="$key" -v v="$val" '
        $0 ~ "^"k"=" { print k"="v; found=1; next }
        { print }
        END { if (!found) print k"="v }
    ' "$file" > "$file.tmp" && mv "$file.tmp" "$file"
}

# Assemble into a temp file from the example, then move into place atomically.
TMP="$(mktemp)"
cp "$EXAMPLE" "$TMP"

set_kv MONGO_URI                "$MONGO_URI"                "$TMP"
set_kv AUTH_JWT_SECRET          "$AUTH_JWT_SECRET"          "$TMP"
set_kv MASTER_ENCRYPTION_KEY    "$MASTER_ENCRYPTION_KEY"    "$TMP"
set_kv PLATFORM_ADMIN_KEY       "$PLATFORM_ADMIN_KEY"       "$TMP"
set_kv TAX_RATE                 "$TAX_RATE"                 "$TMP"

# Persist Mongo auth identity. MONGO_ROOT_* are read by the helper scripts
# (backup/restore/enable); MONGO_INITDB_ROOT_* are read by the mongo container itself
# via env_file (raw password, NOT url-encoded — only MONGO_URI is encoded).
if [ -n "${MONGO_ROOT_USERNAME:-}" ]; then
    set_kv MONGO_ROOT_USERNAME        "$MONGO_ROOT_USERNAME"  "$TMP"
    set_kv MONGO_ROOT_PASSWORD        "$MONGO_ROOT_PASSWORD"  "$TMP"
    set_kv MONGO_DB                   "$MONGO_DB"             "$TMP"
    set_kv MONGO_INITDB_ROOT_USERNAME "$MONGO_ROOT_USERNAME"  "$TMP"
    set_kv MONGO_INITDB_ROOT_PASSWORD "$MONGO_ROOT_PASSWORD"  "$TMP"
fi

# Optional overrides — only applied when provided in the environment.
for kv in \
    NEXT_PUBLIC_BRAND_NAME NEXT_PUBLIC_BACKEND_URL FRONTEND_ORIGIN ADMIN_EMAIL \
    SMTP_HOST SMTP_PORT SMTP_SECURE SMTP_USER SMTP_PASS MAIL_FROM \
    STRIPE_SECRET_KEY STRIPE_PUBLISHABLE_KEY STRIPE_WEBHOOK_SECRET STRIPE_CURRENCY \
    DEPOSIT_DEFAULT_AMOUNT ; do
    if [ -n "${!kv:-}" ]; then set_kv "$kv" "${!kv}" "$TMP"; fi
done

chmod 600 "$TMP"
mv "$TMP" "$ENV_FILE"

# Masked summary.
MASKED_URI="$(printf '%s' "$MONGO_URI" | sed -E 's#://[^@]*@#://***:***@#')"
echo "✅ Wrote $ENV_FILE (mode 600)."
echo "   MongoDB     : $AUTH_MODE — db '$MONGO_DB'"
echo "   MONGO_URI   : $MASKED_URI"
if [ "${GENERATED:-false}" = true ]; then
    echo "   ⚠️  RECORD THESE generated Mongo credentials (also saved in .env):"
    echo "        user: $MONGO_ROOT_USERNAME"
    echo "        pass: $MONGO_ROOT_PASSWORD"
fi
echo "   Secrets     : AUTH_JWT_SECRET, MASTER_ENCRYPTION_KEY, PLATFORM_ADMIN_KEY ${AUTH_JWT_SECRET:+set}"
echo "   TAX_RATE    : $TAX_RATE"
echo
echo "Next:"
echo "  • Review SMTP / Stripe values in .env (defaults are placeholders)."
echo "  • Recreate the backend so it reads the new .env:"
echo "      cd rental-platform && podman rm -f backend && podman-compose up -d backend"
echo "  • Verify: curl -s http://localhost:4000/apartments | head -c 200"
