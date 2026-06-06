#!/bin/bash
#
# save-env.sh — keep a safe copy of .env in .env_restore (and put it back on demand).
#
# .env is the operator-managed source of truth. This makes a recoverable copy so a
# bad deploy, a clean, or a fat-fingered edit can never lose it. Run it after you have
# .env the way you want; restore from the safe copy any time.
#
# Usage:
#   ./save-env.sh             # copy  .env         -> .env_restore   (safe backup)
#   ./save-env.sh --restore   # copy  .env_restore -> .env           (recover; backs up current .env first)
set -euo pipefail
cd "$(dirname "$0")"

ENV_FILE=".env"
SAFE=".env_restore"

case "${1:-save}" in
    save|"")
        [ -f "$ENV_FILE" ] || { echo "❌ $ENV_FILE not found — nothing to copy." >&2; exit 1; }
        if [ -f "$SAFE" ] && cmp -s "$ENV_FILE" "$SAFE"; then
            echo "✅ $SAFE already matches $ENV_FILE — nothing to do."
            exit 0
        fi
        [ -f "$SAFE" ] && cp -p "$SAFE" "$SAFE.prev"   # keep the previous safe copy
        cp -p "$ENV_FILE" "$SAFE"
        chmod 600 "$SAFE"
        echo "✅ saved $ENV_FILE -> $SAFE ($(wc -l < "$SAFE") lines, mode 600)"
        [ -f "$SAFE.prev" ] && echo "   (previous safe copy kept at $SAFE.prev)"
        ;;
    --restore|restore)
        [ -f "$SAFE" ] || { echo "❌ $SAFE not found — no safe copy to restore." >&2; exit 1; }
        if [ -f "$ENV_FILE" ] && cmp -s "$ENV_FILE" "$SAFE"; then
            echo "✅ $ENV_FILE already matches $SAFE — nothing to restore."
            exit 0
        fi
        if [ -f "$ENV_FILE" ]; then
            BAK="$ENV_FILE.bak-$(date -u +%Y%m%d-%H%M%S)"
            cp -p "$ENV_FILE" "$BAK"
            echo "🛟 backed up current $ENV_FILE -> $BAK"
        fi
        cp -p "$SAFE" "$ENV_FILE"
        chmod 600 "$ENV_FILE"
        echo "✅ restored $SAFE -> $ENV_FILE"
        ;;
    -h|--help)
        echo "Usage: $0 [save|--restore]"
        ;;
    *)
        echo "Unknown option: $1" >&2
        echo "Usage: $0 [save|--restore]" >&2
        exit 1
        ;;
esac
