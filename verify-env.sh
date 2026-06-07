#!/bin/bash
#
# verify-env.sh — verify the root .env has the required keys, and self-heal what's
# missing: random values for secrets, recovered Mongo credentials for MONGO_URI.
#
# What it does:
#   1. Checks .env for the required keys.
#   2. If any auto-generatable secret/credential key is MISSING or EMPTY, it copies
#      the current .env to .env_restore (a recoverable backup), then fills each
#      missing key with a freshly generated RANDOM value.
#   3. If MONGO_URI is missing, it connects to the running mongo container, EXTRACTS
#      the root login + password from it, and rebuilds a correct (URL-encoded)
#      MONGO_URI — instead of randomizing it (a random DB URI would just break).
#   4. Other structural keys (NODE_ENV, …) are only WARNED about.
#
# Safety:
#   • Existing values are NEVER overwritten — only absent/empty keys are filled.
#   • The pre-edit .env is always saved to .env_restore first (prior copy kept as
#     .env_restore.prev), so you can roll back with: ./save-env.sh --restore
#   • ⚠️  MASTER_ENCRYPTION_KEY: if it was previously set and you already stored
#     encrypted data, a NEW random key cannot decrypt that data. This script only
#     fills it when absent; if that is unexpected, restore the old key from
#     .env_restore instead of accepting the generated one.
#
# Usage:
#   ./verify-env.sh            # verify and heal (random secrets + recovered Mongo creds)
#   ./verify-env.sh --check    # report only; exit 1 if anything is missing (no edits)
#
# Env:
#   MONGO_CONTAINER (default "mongo")  — container to recover Mongo creds from
#   MONGO_DB        (default "bestflats")
set -euo pipefail
cd "$(dirname "$0")"

ENV_FILE=".env"
SAFE=".env_restore"
CONTAINER="${MONGO_CONTAINER:-mongo}"
CHECK_ONLY=false

case "${1:-}" in
    --check|check) CHECK_ONLY=true ;;
    "" ) ;;
    -h|--help) echo "Usage: $0 [--check]"; exit 0 ;;
    *) echo "Unknown option: $1" >&2; echo "Usage: $0 [--check]" >&2; exit 1 ;;
esac

[ -f "$ENV_FILE" ] || { echo "❌ $ENV_FILE not found. Generate it first: ./setup-env.sh" >&2; exit 1; }

# Secret/credential keys that are safe to auto-generate with a random value.
RANDOM_SECRETS=(
    AUTH_JWT_SECRET
    MASTER_ENCRYPTION_KEY
    PLATFORM_ADMIN_KEY
    ADMIN_INVITE_CODE
    HOST_INVITE_CODE
    CONCIERGE_INVITE_CODE
    CONTRACTOR_INVITE_CODE
)

# Structural keys the app needs but that must NOT be randomized (warn only).
# MONGO_URI is handled separately (recovered from the DB container).
REQUIRED_PRESENT=(
    NODE_ENV
)

# Current value of KEY in .env (empty if absent or blank).
get_val() { sed -n -E "s/^$1=(.*)$/\1/p" "$ENV_FILE" | head -1; }
has_val() { [ -n "$(get_val "$1")" ]; }

# Set or append KEY=VALUE literally (no sed metacharacter surprises).
set_kv() {
    local key="$1" val="$2"
    awk -v k="$key" -v v="$val" '
        $0 ~ "^"k"=" { print k"="v; found=1; next }
        { print }
        END { if (!found) print k"="v }
    ' "$ENV_FILE" > "$ENV_FILE.tmp" && mv "$ENV_FILE.tmp" "$ENV_FILE"
}

rand_secret() { openssl rand -base64 32 | tr -d '\n'; }
rand_code()   { head -c 64 /dev/urandom | LC_ALL=C tr -dc 'A-Za-z0-9' | cut -c1-24; }

# URL-encode a string for safe use in a URI (prefers python3; bash fallback).
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

# Extract the root login + password from a running/existing mongo container by
# reading the env baked into it. Sets MONGO_ROOT_USERNAME / MONGO_ROOT_PASSWORD.
# Returns 1 if there's no usable container/creds (incl. the broken literal placeholder).
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

# Back up .env -> .env_restore exactly once, before the first edit.
backed_up=false
backup_once() {
    $backed_up && return 0
    [ -f "$SAFE" ] && cp -p "$SAFE" "$SAFE.prev"
    cp -p "$ENV_FILE" "$SAFE"
    chmod 600 "$SAFE"
    echo "🛟 backed up $ENV_FILE -> $SAFE before editing"
    [ -f "$SAFE.prev" ] && echo "   (previous safe copy kept at $SAFE.prev)"
    backed_up=true
}

# Discover what's missing.
missing=()
for k in "${RANDOM_SECRETS[@]}"; do has_val "$k" || missing+=("$k"); done
mongo_missing=false; has_val MONGO_URI || mongo_missing=true
warns=()
for k in "${REQUIRED_PRESENT[@]}"; do has_val "$k" || warns+=("$k"); done

if [ "${#missing[@]}" -eq 0 ] && [ "$mongo_missing" = false ] && [ "${#warns[@]}" -eq 0 ]; then
    echo "✅ .env complete — all required keys present."
    exit 0
fi

# --check: report only, never edit.
if [ "$CHECK_ONLY" = true ]; then
    [ "${#missing[@]}" -gt 0 ] && echo "❌ missing secret keys: ${missing[*]}"
    [ "$mongo_missing" = true ] && echo "❌ missing MONGO_URI (recoverable from container '$CONTAINER')"
    for k in "${warns[@]}"; do echo "⚠️  missing structural key (set by hand): $k"; done
    exit 1
fi

# 1) Fill missing secret keys with random values.
if [ "${#missing[@]}" -gt 0 ]; then
    backup_once
    for k in "${missing[@]}"; do
        case "$k" in
            *INVITE_CODE) v="$(rand_code)" ;;
            *)            v="$(rand_secret)" ;;
        esac
        set_kv "$k" "$v"
        echo "🔑 filled missing $k with a random value"
    done
    chmod 600 "$ENV_FILE"

    if printf '%s\n' "${missing[@]}" | grep -qx "MASTER_ENCRYPTION_KEY"; then
        echo "⚠️  MASTER_ENCRYPTION_KEY was generated fresh. If you already had encrypted"
        echo "    data, that old data needs the ORIGINAL key — restore it from $SAFE"
        echo "    (./save-env.sh --restore) instead of keeping this generated one."
    fi
fi

# 2) Recover Mongo login + password from the DB container and rebuild MONGO_URI.
if [ "$mongo_missing" = true ]; then
    MONGO_DB_VAL="$(get_val MONGO_DB)"; MONGO_DB_VAL="${MONGO_DB:-${MONGO_DB_VAL:-bestflats}}"
    if recover_existing_mongo_creds; then
        backup_once
        EU="$(urlencode "$MONGO_ROOT_USERNAME")"
        EP="$(urlencode "$MONGO_ROOT_PASSWORD")"
        set_kv MONGO_URI "mongodb://$EU:$EP@${CONTAINER}:27017/$MONGO_DB_VAL?authSource=admin"
        # Persist the recovered identity for the helper scripts / the container itself,
        # without clobbering anything already set.
        has_val MONGO_ROOT_USERNAME        || set_kv MONGO_ROOT_USERNAME        "$MONGO_ROOT_USERNAME"
        has_val MONGO_ROOT_PASSWORD        || set_kv MONGO_ROOT_PASSWORD        "$MONGO_ROOT_PASSWORD"
        has_val MONGO_INITDB_ROOT_USERNAME || set_kv MONGO_INITDB_ROOT_USERNAME "$MONGO_ROOT_USERNAME"
        has_val MONGO_INITDB_ROOT_PASSWORD || set_kv MONGO_INITDB_ROOT_PASSWORD "$MONGO_ROOT_PASSWORD"
        has_val MONGO_DB                   || set_kv MONGO_DB                   "$MONGO_DB_VAL"
        chmod 600 "$ENV_FILE"
        echo "🔁 recovered Mongo login + password from container '$CONTAINER' and rebuilt MONGO_URI (user '$MONGO_ROOT_USERNAME')"
    else
        echo "⚠️  MONGO_URI is missing and no usable mongo container '$CONTAINER' was found to recover creds from."
        echo "    Start the mongo container first, set MONGO_CONTAINER=<name>, or regenerate with ./setup-env.sh"
    fi
fi

# 3) Other structural keys: warn, never randomize.
for k in "${warns[@]}"; do
    echo "⚠️  $k is missing and was NOT auto-filled (a random value would break it)."
    echo "    Set it by hand, or regenerate the whole file with ./setup-env.sh"
done

echo "✅ Done. A pre-edit copy of .env is in $SAFE (roll back with ./save-env.sh --restore)."
