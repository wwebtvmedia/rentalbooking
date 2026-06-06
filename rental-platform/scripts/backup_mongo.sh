#!/usr/bin/env bash
# Database protection: dump the bestflats MongoDB to a compressed archive, rotate old
# backups, and (optionally) copy the archive off-site with rclone. Designed to run on the
# Raspberry Pi (where the `mongo` container runs), e.g. from cron. Restore steps at bottom.
#
# Usage:
#   bash rental-platform/scripts/backup_mongo.sh
#   BACKUP_DIR=/mnt/usb/bfs-backups KEEP=30 RCLONE_REMOTE=gdrive:bfs-backups \
#     bash rental-platform/scripts/backup_mongo.sh
#
# Cron (daily 03:30, keep 30 local, push off-site):
#   30 3 * * * KEEP=30 BACKUP_DIR=/mnt/usb/bfs-backups RCLONE_REMOTE=gdrive:bfs-backups \
#     /bin/bash ~/sby/rentalbooking/rental-platform/scripts/backup_mongo.sh \
#     >> /mnt/usb/bfs-backups/backup.log 2>&1
#
# Env:
#   BACKUP_DIR      local dir for archives           (default $HOME/bfs-backups)
#   KEEP            how many recent archives to keep  (default 14)
#   MONGO_DB        database name                     (default bestflats)
#   MONGO_CONTAINER mongo container name              (default mongo)
#   MONGO_ROOT_USERNAME / MONGO_ROOT_PASSWORD  set these if Mongo auth is enabled
#   RCLONE_REMOTE   rclone target, e.g. gdrive:bfs-backups (off-site copy; optional)
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-$HOME/bfs-backups}"
KEEP="${KEEP:-14}"
DB="${MONGO_DB:-bestflats}"
CONTAINER="${MONGO_CONTAINER:-mongo}"
RUNTIME="$(command -v podman || command -v docker)"
STAMP="$(date -u +%Y%m%d-%H%M%S)"

# Pass auth to mongodump only when credentials are configured.
AUTH_ARGS=()
if [ -n "${MONGO_ROOT_USERNAME:-}" ] && [ -n "${MONGO_ROOT_PASSWORD:-}" ]; then
  AUTH_ARGS=(--username "$MONGO_ROOT_USERNAME" --password "$MONGO_ROOT_PASSWORD" --authenticationDatabase admin)
fi

mkdir -p "$BACKUP_DIR"
ARCHIVE="$BACKUP_DIR/${DB}-${STAMP}.archive.gz"

echo "[$(date -u +%FT%TZ)] Backing up '$DB' from container '$CONTAINER'..."
"$RUNTIME" exec "$CONTAINER" mongodump --db "$DB" "${AUTH_ARGS[@]}" --archive --gzip > "$ARCHIVE"
SIZE="$(du -h "$ARCHIVE" | cut -f1)"
echo "[$(date -u +%FT%TZ)] Wrote $ARCHIVE ($SIZE)"

# Local rotation: keep only the newest $KEEP archives.
mapfile -t OLD < <(ls -1t "$BACKUP_DIR"/${DB}-*.archive.gz 2>/dev/null | tail -n +$((KEEP + 1)) || true)
if [ "${#OLD[@]}" -gt 0 ]; then
  printf '%s\n' "${OLD[@]}" | xargs -r rm -f
  echo "[$(date -u +%FT%TZ)] Removed ${#OLD[@]} old local backup(s); keeping newest $KEEP."
fi

# Off-site copy via rclone (optional). Configure once on the Pi with `rclone config`.
if [ -n "${RCLONE_REMOTE:-}" ]; then
  if command -v rclone >/dev/null 2>&1; then
    echo "[$(date -u +%FT%TZ)] rclone copy -> $RCLONE_REMOTE"
    rclone copy "$ARCHIVE" "$RCLONE_REMOTE" --no-traverse
    # Remote rotation: delete archives older than KEEP days off-site.
    rclone delete "$RCLONE_REMOTE" --min-age "${KEEP}d" --include "${DB}-*.archive.gz" || true
    echo "[$(date -u +%FT%TZ)] Off-site copy complete."
  else
    echo "[$(date -u +%FT%TZ)] WARNING: RCLONE_REMOTE set but 'rclone' not installed (skipping off-site copy)." >&2
  fi
fi

# --- Restore (manual) ---
#   # without auth:
#   podman exec -i mongo mongorestore --archive --gzip --drop < bestflats-YYYYMMDD-HHMMSS.archive.gz
#   # with auth:
#   podman exec -i mongo mongorestore -u "$MONGO_ROOT_USERNAME" -p "$MONGO_ROOT_PASSWORD" \
#     --authenticationDatabase admin --archive --gzip --drop < bestflats-YYYYMMDD-HHMMSS.archive.gz
#   # pull a copy back from off-site first:  rclone copy gdrive:bfs-backups/<file> .
