#!/usr/bin/env bash
# Nightly Postgres backup for Jeen Planner. Add to root crontab, e.g.:
#   0 3 * * * /var/www/jeen-project-planner/deploy/backup.sh >> /var/log/jeen-planner-backup.log 2>&1
set -euo pipefail

BACKUP_DIR="/var/backups/jeen-planner"
RETENTION_DAYS=14
DB_NAME="jeen_planner"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"

mkdir -p "$BACKUP_DIR"
pg_dump "$DB_NAME" | gzip > "$BACKUP_DIR/${DB_NAME}-${TIMESTAMP}.sql.gz"

find "$BACKUP_DIR" -name "${DB_NAME}-*.sql.gz" -mtime "+${RETENTION_DAYS}" -delete
