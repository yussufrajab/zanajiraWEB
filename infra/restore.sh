#!/usr/bin/env bash
# Native restore. Usage: restore.sh YYYYMMDD
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
[[ -f .env ]] && { set -a; . ./.env; set +a; }

TS="${1:?usage: restore.sh YYYYMMDD}"
BACKUP_DIR="${BACKUP_DIR:-/backups}"

gunzip -c "$BACKUP_DIR/db-$TS.sql.gz" | psql "$DATABASE_URL"

mc alias set local "http://127.0.0.1:${MINIO_PORT:-9000}" "${S3_ACCESS_KEY:-minioadmin}" "${S3_SECRET_KEY:-minioadmin}" >/dev/null 2>&1 || true
mc mirror "$BACKUP_DIR/minio-$TS/" "local/${S3_BUCKET:-zanweb-documents}" --overwrite
echo "restored $TS"
