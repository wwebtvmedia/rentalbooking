#!/usr/bin/env bash
# Database restore: load a bestflats MongoDB archive (produced by backup_mongo.sh)
# back into the running `mongo` container. Designed to run on the Raspberry Pi.
#
# ⚠️  Uses --drop: each restored collection is dropped before it is recreated, so the
#     archive REPLACES the current contents of the database. Take a fresh backup first
#     if the current data matters.
#
# Usage:
#   bash rental-platform/scripts/restore_mongo.sh <archive.gz>     # restore a specific file
#   bash rental-platform/scripts/restore_mongo.sh --latest         # restore newest in BACKUP_DIR
#   CONFIRM=yes bash rental-platform/scripts/restore_mongo.sh --latest   # non-interactive
#
# Env:
#   BACKUP_DIR      dir to search for --latest          (default $HOME/bfs-backups)
#   MONGO_DB        database name                       (default bestflats)
#   MONGO_CONTAINER mongo container name                (default mongo)
#   MONGO_ROOT_USERNAME / MONGO_ROOT_PASSWORD  set these if Mongo auth is enabled
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-$HOME/bfs-backups}"
DB="${MONGO_DB:-bestflats}"
CONTAINER="${MONGO_CONTAINER:-mongo}"
RUNTIME="$(command -v podman || command -v docker)"

ARG="${1:-}"
[ -n "$ARG" ] || { echo "Usage: $0 <archive.gz> | --latest" >&2; exit 1; }

if [ "$ARG" = "--latest" ]; then
  ARCHIVE="$(ls -1t "$BACKUP_DIR"/${DB}-*.archive.gz 2>/dev/null | head -n1 || true)"
  [ -n "$ARCHIVE" ] || { echo "ERROR: no ${DB}-*.archive.gz found in $BACKUP_DIR" >&2; exit 1; }
else
  ARCHIVE="$ARG"
fi
[ -f "$ARCHIVE" ] || { echo "ERROR: archive not found: $ARCHIVE" >&2; exit 1; }

# Pass auth to mongorestore only when credentials are configured.
AUTH_ARGS=()
if [ -n "${MONGO_ROOT_USERNAME:-}" ] && [ -n "${MONGO_ROOT_PASSWORD:-}" ]; then
  AUTH_ARGS=(--username "$MONGO_ROOT_USERNAME" --password "$MONGO_ROOT_PASSWORD" --authenticationDatabase admin)
fi

# Ensure the mongo container is up before restoring.
"$RUNTIME" ps --format '{{.Names}}' 2>/dev/null | grep -qx "$CONTAINER" || {
  echo "ERROR: container '$CONTAINER' is not running. Start the stack first (./init.sh)." >&2
  exit 1
}

echo "Restore plan:"
echo "  archive : $ARCHIVE ($(du -h "$ARCHIVE" | cut -f1))"
echo "  into    : db '$DB' in container '$CONTAINER' (--drop: replaces existing collections)"
if [ "${CONFIRM:-}" != "yes" ]; then
  read -r -p "Type 'yes' to proceed: " ANSWER
  [ "$ANSWER" = "yes" ] || { echo "Aborted — nothing was changed."; exit 1; }
fi

echo "[$(date -u +%FT%TZ)] Restoring '$DB'..."
"$RUNTIME" exec -i "$CONTAINER" mongorestore "${AUTH_ARGS[@]}" --db "$DB" --archive --gzip --drop < "$ARCHIVE"
echo "[$(date -u +%FT%TZ)] Restore complete."
