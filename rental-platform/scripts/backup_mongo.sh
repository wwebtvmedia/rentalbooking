#!/usr/bin/env bash
# Database protection: dump the bestflats MongoDB to a compressed archive and rotate
# old backups. Designed to run on the Raspberry Pi (where the `mongo` container runs),
# e.g. from cron. Restore instructions at the bottom.
#
# Usage:
#   bash rental-platform/scripts/backup_mongo.sh
#   BACKUP_DIR=/mnt/usb/bfs-backups KEEP=30 bash rental-platform/scripts/backup_mongo.sh
#
# Cron (daily at 03:30, keep 30 days):
#   30 3 * * * KEEP=30 BACKUP_DIR=$HOME/bfs-backups /bin/bash ~/sby/rentalbooking/rental-platform/scripts/backup_mongo.sh >> ~/bfs-backups/backup.log 2>&1
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-$HOME/bfs-backups}"
KEEP="${KEEP:-14}"                  # how many recent backups to retain
DB="${MONGO_DB:-bestflats}"
CONTAINER="${MONGO_CONTAINER:-mongo}"
RUNTIME="$(command -v podman || command -v docker)"
STAMP="$(date -u +%Y%m%d-%H%M%S)"

mkdir -p "$BACKUP_DIR"
ARCHIVE="$BACKUP_DIR/${DB}-${STAMP}.archive.gz"

echo "[$(date -u +%FT%TZ)] Backing up '$DB' from container '$CONTAINER'..."
# Stream a gzip archive from mongodump (inside the container) to the host file.
"$RUNTIME" exec "$CONTAINER" mongodump --db "$DB" --archive --gzip > "$ARCHIVE"

SIZE="$(du -h "$ARCHIVE" | cut -f1)"
echo "[$(date -u +%FT%TZ)] Wrote $ARCHIVE ($SIZE)"

# Rotation: keep only the newest $KEEP archives.
mapfile -t OLD < <(ls -1t "$BACKUP_DIR"/${DB}-*.archive.gz 2>/dev/null | tail -n +$((KEEP + 1)) || true)
if [ "${#OLD[@]}" -gt 0 ]; then
  printf '%s\n' "${OLD[@]}" | xargs -r rm -f
  echo "[$(date -u +%FT%TZ)] Removed ${#OLD[@]} old backup(s); keeping newest $KEEP."
fi

# --- Restore (manual) ---
#   RUNTIME exec -i mongo mongorestore --archive --gzip --drop < <(cat <archive.gz>)
# e.g.  podman exec -i mongo mongorestore --archive --gzip --drop < bestflats-YYYYMMDD-HHMMSS.archive.gz
