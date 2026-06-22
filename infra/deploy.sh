#!/usr/bin/env bash
# Deploy script for bare-metal production. Run on the target host from /opt/zanweb.
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo ">> installing deps"
pnpm install --frozen-lockfile --prod=false

echo ">> generating prisma client"
pnpm --filter @zanweb/prisma prisma:generate

echo ">> building api + web"
pnpm --filter @zanweb/api build
pnpm --filter @zanweb/web build

echo ">> linking standalone web server entrypoint"
ln -sf "$ROOT_DIR/apps/web/.next/standalone/server.js" "$ROOT_DIR/apps/web/server.js"

echo ">> applying migrations"
pnpm --filter @zanweb/prisma prisma migrate deploy

echo ">> reloading services"
sudo cp "$ROOT_DIR/infra/systemd/zanweb-api.service" /etc/systemd/system/
sudo cp "$ROOT_DIR/infra/systemd/zanweb-web.service" /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now zanweb-api zanweb-web
sudo systemctl restart zanweb-api zanweb-web
sudo nginx -t && sudo systemctl reload nginx

echo ">> deploy complete"
./manage.sh status
