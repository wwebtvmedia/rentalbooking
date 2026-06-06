#!/usr/bin/env bash
# Enable MongoDB authentication on an EXISTING bestflats deployment.
#
# Why a migration is needed: the official mongo image only creates the root user and
# turns on access control when it initialises an EMPTY data dir. For a database that
# already has data, we: back up -> move the data dir aside (recoverable) -> let mongo
# re-initialise WITH a root user + auth -> restore the data.
#
# Run ON THE PI, from the repo root, AFTER adding the credentials to .env:
#   MONGO_ROOT_USERNAME=bfs
#   MONGO_ROOT_PASSWORD=<strong-random>
#   MONGO_URI=mongodb://bfs:<strong-random>@mongo:27017/bestflats?authSource=admin
#
# Then:  CONFIRM=yes bash rental-platform/scripts/enable_mongo_auth.sh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COMPOSE_DIR="$ROOT_DIR/rental-platform"
ENV_FILE="$ROOT_DIR/.env"
get() { grep -E "^$1=" "$ENV_FILE" 2>/dev/null | tail -1 | cut -d= -f2- || true; }

USER="${MONGO_ROOT_USERNAME:-$(get MONGO_ROOT_USERNAME)}"
PASS="${MONGO_ROOT_PASSWORD:-$(get MONGO_ROOT_PASSWORD)}"
DB="${MONGO_DB:-bestflats}"
DATA_DIR="$(get MONGO_DATA_DIR)"; DATA_DIR="${DATA_DIR:-$COMPOSE_DIR/data/mongo}"
RUNTIME="$(command -v podman-compose || true)"
STAMP="$(date -u +%Y%m%d-%H%M%S)"

[ -n "$USER" ] && [ -n "$PASS" ] || { echo "ERROR: set MONGO_ROOT_USERNAME and MONGO_ROOT_PASSWORD (in .env or env)."; exit 1; }
[ -n "$RUNTIME" ] || { echo "ERROR: podman-compose not found."; exit 1; }

echo "Plan:"
echo "  1. Back up '$DB' (no-auth) to a safe archive."
echo "  2. Stop backend + mongo."
echo "  3. Move data dir aside: $DATA_DIR -> ${DATA_DIR}.preauth-$STAMP"
echo "  4. Start mongo fresh -> creates root user '$USER' + enables auth."
echo "  5. Restore the backup (with auth)."
echo "  6. You then set MONGO_URI (with creds) in .env and restart backend."
[ "${CONFIRM:-}" = "yes" ] || { echo; echo "Refusing to proceed without CONFIRM=yes."; exit 1; }

BK="$ROOT_DIR/${DB}-preauth-$STAMP.archive.gz"
echo "[1/6] Backing up to $BK ..."
podman exec mongo mongodump --db "$DB" --archive --gzip > "$BK"
echo "      backup size: $(du -h "$BK" | cut -f1)"

echo "[2/6] Stopping backend + mongo ..."
( cd "$COMPOSE_DIR" && $RUNTIME stop backend mongo )

echo "[3/6] Moving data dir aside ..."
mv "$DATA_DIR" "${DATA_DIR}.preauth-$STAMP"
mkdir -p "$DATA_DIR"

echo "[4/6] Starting mongo fresh (auto-creates user + auth) ..."
( cd "$COMPOSE_DIR" && MONGO_ROOT_USERNAME="$USER" MONGO_ROOT_PASSWORD="$PASS" $RUNTIME up -d mongo )
echo "      waiting for mongo to accept authenticated connections ..."
for i in $(seq 1 30); do
  if podman exec mongo mongo -u "$USER" -p "$PASS" --authenticationDatabase admin --quiet --eval 'db.runCommand({ping:1}).ok' 2>/dev/null | grep -q 1; then
    echo "      mongo is up with auth."; break
  fi; sleep 2
done

echo "[5/6] Restoring data (with auth) ..."
podman exec -i mongo mongorestore -u "$USER" -p "$PASS" --authenticationDatabase admin --archive --gzip --drop < "$BK"

echo "[6/6] Done. Now:"
echo "      - ensure .env has: MONGO_URI=mongodb://$USER:<password>@mongo:27017/$DB?authSource=admin"
echo "      - restart the backend:  (cd $COMPOSE_DIR && $RUNTIME up -d backend)"
echo "      - verify:  curl -s https://api.bestflats.vip/health   # {\"status\":\"ok\",\"db\":\"connected\"}"
echo "      The old data is preserved at ${DATA_DIR}.preauth-$STAMP (delete once verified)."
