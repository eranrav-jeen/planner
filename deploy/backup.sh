#!/usr/bin/env bash
# Nightly Postgres backup for Jeen Planner.
#
# Must run as the `postgres` OS user, not root: `pg_dump` uses peer auth,
# which maps the connecting OS user directly to a same-named Postgres role —
# there is no "root" role, so `pg_dump` fails with `role "root" does not
# exist` if run as root. One-time setup, then a system cron.d entry:
#   sudo mkdir -p /var/backups/jeen-planner && sudo chown postgres:postgres /var/backups/jeen-planner
#   sudo touch /var/log/jeen-planner-backup.log && sudo chown postgres:postgres /var/log/jeen-planner-backup.log
#   echo '0 3 * * * postgres /var/www/jeen-project-planner/deploy/backup.sh >> /var/log/jeen-planner-backup.log 2>&1' | sudo tee /etc/cron.d/jeen-planner-backup
set -euo pipefail

BACKUP_DIR="/var/backups/jeen-planner"
RETENTION_DAYS=14
DB_NAME="jeen_planner"
UPLOADS_DIR="/var/www/jeen-project-planner/apps/api/uploads"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"

mkdir -p "$BACKUP_DIR"
pg_dump "$DB_NAME" | gzip > "$BACKUP_DIR/${DB_NAME}-${TIMESTAMP}.sql.gz"

# Uploaded files (e.g. project purchase orders) live on disk, not in Postgres —
# back them up too so a lost/corrupted disk doesn't silently drop attachments.
if [ -d "$UPLOADS_DIR" ]; then
  tar czf "$BACKUP_DIR/uploads-${TIMESTAMP}.tar.gz" -C "$(dirname "$UPLOADS_DIR")" "$(basename "$UPLOADS_DIR")"
fi

find "$BACKUP_DIR" -name "${DB_NAME}-*.sql.gz" -mtime "+${RETENTION_DAYS}" -delete
find "$BACKUP_DIR" -name "uploads-*.tar.gz" -mtime "+${RETENTION_DAYS}" -delete
