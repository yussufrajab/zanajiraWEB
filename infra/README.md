# Infrastructure (no Docker)

Per project decision, this project does **not** use Docker. Backing services run
as **pre-installed native services** on the host, managed by `../manage.sh`.

## Required host packages
Install these on the host before running `./manage.sh start`:
- PostgreSQL 16 (cluster `main`, user/db per `.env` `DATABASE_URL`)
- Redis 7
- MinIO server + `mc` client
- ClamAV (`clamav-daemon`, uses `infra/clamav/clamav.conf`)

## Usage
- `./manage.sh start`   — start backing services + ensure the documents bucket
- `./manage.sh start-apps` — start API + web (after `pnpm build`)
- `./manage.sh stop`    — stop everything
- `./manage.sh status`  — show service + app status

## Production (planned — added in later phases)
Bare-metal / VM with Nginx installed on the host (`infra/nginx/site.conf`).
Systemd units for the apps (`infra/systemd/`). Backups via `infra/backup.sh`
(native `pg_dump` + `mc mirror`). These files are created in later phases.