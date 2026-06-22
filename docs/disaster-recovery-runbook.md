# Disaster Recovery Runbook

Target RTO: **4 hours**.

## Backup schedule

A daily backup runs via cron at 02:00:

```cron
0 2 * * * /opt/zanweb/infra/backup.sh
```

The backup script:

1. Dumps the PostgreSQL database with `pg_dump` and compresses it.
2. Mirrors the MinIO `zanweb-documents` bucket to local disk.
3. Retains backups for 30 days.

Backups are written to `/backups` (override with `BACKUP_DIR`).

## Recovery procedure

1. **Provision a replacement host** with the same base OS and resources.
2. **Install host packages**: PostgreSQL, Redis, MinIO, ClamAV, Nginx, Node.js, pnpm, and the `mc` MinIO client.
3. **Clone the repository** to `/opt/zanweb` and `cd /opt/zanweb`.
4. **Prepare environment**:

   ```bash
   cp .env.example .env
   # fill in production secrets, DB, Redis, SMTP, S3, etc.
   ```

5. **Build and enable services**:

   ```bash
   ./infra/deploy.sh
   ```

6. **Restore the latest backup**:

   ```bash
   ./infra/restore.sh 20260621
   ```

7. **Smoke test**:

   - Visit the home page.
   - Open a news detail, vacancy detail, and interview notice.
   - Log in to the admin dashboard.
   - Download an attached PDF.

8. **Switch DNS** to the new host once tests pass.

## Verification

Periodically test restore by restoring the latest backup to a non-production host and checking counts:

```bash
psql "$DATABASE_URL" -c "SELECT count(*) FROM \"NewsPost\";"
psql "$DATABASE_URL" -c "SELECT count(*) FROM \"Vacancy\";"
```

## Common incidents

| Symptom | Likely cause | Action |
|---|---|---|
| Uploads rejected | ClamAV is down | Check `systemctl status clamav-daemon`; restart if needed. |
| 502 from Nginx | API or web service crashed | `sudo systemctl status zanweb-api zanweb-web`; restart. |
| DB connection errors | PostgreSQL not running | `sudo systemctl start postgresql`. |
| MinIO errors | Bucket missing or credentials wrong | Verify `S3_*` env vars and `mc alias set local`. |
