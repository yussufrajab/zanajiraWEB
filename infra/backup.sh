#!/usr/bin/env bash
# Native backup: host pg_dump + mc mirror against the host MinIO. No Docker.
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
[[ -f .env ]] && { set -a; . ./.env; set +a; }

TS=$(date +%Y%m%d)
BACKUP_DIR="${BACKUP_DIR:-/backups}"
mkdir -p "$BACKUP_DIR"

# Postgres
pg_dump "$DATABASE_URL" | gzip > "$BACKUP_DIR/db-$TS.sql.gz"

# MinIO documents bucket
mc alias set local "http://127.0.0.1:${MINIO_PORT:-9000}" "${S3_ACCESS_KEY:-minioadmin}" "${S3_SECRET_KEY:-minioadmin}" >/dev/null 2>&1 || true
mc mirror "local/${S3_BUCKET:-zanweb-documents}" "$BACKUP_DIR/minio-$TS/" --overwrite

# Retain 30 days
find "$BACKUP_DIR" -type f -mtime +30 -delete
find "$BACKUP_DIR" -mindepth 1 -maxdepth 1 -type d -mtime +30 -exec rm -rf {} +
echo "backup $TS complete"
