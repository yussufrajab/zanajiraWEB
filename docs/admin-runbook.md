# Admin Runbook

Operational guidance for the CSC Zanzibar public website.

## Environment variables

Key variables in `/opt/zanweb/.env`:

- `DATABASE_URL` — PostgreSQL connection string.
- `REDIS_URL` — Redis connection for BullMQ and cache.
- `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_PUBLIC_BASE_URL` — MinIO settings.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` — Email notifications.
- `ENABLE_SUBSCRIBER_NOTIFY` — Set to `true` to email vacancy subscribers (default off).
- `CLAMAV_ENABLED` — Set to `true` in production to scan uploads.

## Running migrations

```bash
pnpm --filter @zanweb/prisma prisma migrate deploy
```

Run migrations before restarting services after a schema change.

## Restarting services

```bash
sudo systemctl restart zanweb-api
sudo systemctl restart zanweb-web
sudo systemctl reload nginx
```

## Full deploy

```bash
cd /opt/zanweb
./infra/deploy.sh
```

## Reading audit logs

Audit logs are in the `AuditLog` table. Query via Prisma Studio or SQL:

```bash
pnpm --filter @zanweb/prisma prisma studio
```

## Common incidents

### ClamAV is down — uploads rejected

```bash
sudo systemctl status clamav-daemon
sudo systemctl restart clamav-daemon
```

### Redis is down — queues and cache fail

```bash
sudo systemctl status redis-server
sudo systemctl restart redis-server
```

### PostgreSQL is down

```bash
sudo systemctl status postgresql
sudo systemctl restart postgresql
```

### High memory usage on the web process

Check logs:

```bash
sudo journalctl -u zanweb-web -n 200 --no-pager
```

Restart the service and monitor.

## Backup verification

1. List the latest backup files in `/backups`.
2. Restore the latest backup to a staging host using `./infra/restore.sh YYYYMMDD`.
3. Confirm record counts match production.
