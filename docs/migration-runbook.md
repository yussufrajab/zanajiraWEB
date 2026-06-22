# WordPress Migration Runbook

This guide moves content from an existing WordPress site into the CSC Zanzibar public website.

## What is migrated

- WordPress `post` items become **News**, **Vacancy**, or **Interview** notices based on category heuristics.
- WordPress `attachment` items linked to a post are uploaded into the document store and attached to the new record.
- Each migrated item is transitioned to `Published` automatically.

## Category mapping

| WordPress categories | Target type |
|---|---|
| Contains `nafasi`, `vacancy`, `kazi`, or `ajira` | Vacancy |
| Contains `usaili`, `interview`, or `matokeo` | Interview notice |
| Everything else | News |

Review ambiguous posts after migration and reclassify manually if needed.

## Prerequisites

1. A running target API (staging or production) with at least one admin user.
2. Node.js, pnpm, and `tsx` installed in the repo workspace.
3. WordPress export file (`*.wxr.xml`).
4. The WordPress `wp-content/uploads/` directory copied to a local path.

## Step 1 — Export WordPress content

1. Log in to the WordPress admin.
2. Go to **Tools → Export**.
3. Choose **All content**.
4. Download `zanajira.wxr.xml`.

## Step 2 — Copy uploads

Archive or rsync the WordPress uploads directory locally:

```bash
rsync -av user@old-host:/var/www/html/wp-content/uploads/ ./uploads/
```

The migration script looks up attachment filenames in this directory.

## Step 3 — Set environment variables

```bash
export MIGRATE_WXR_PATH=/path/to/zanajira.wxr.xml
export MIGRATE_UPLOADS_DIR=/path/to/uploads
export API_BASE_URL=https://zanajira.go.tz/api
export MIGRATE_ADMIN_EMAIL=admin@zanajira.go.tz
export MIGRATE_ADMIN_PASSWORD=<secure-password>
```

## Step 4 — Run the migration

```bash
cd /opt/zanweb
pnpm exec tsx scripts/migrate-wordpress.ts
```

The script is idempotent: it checks by slug and skips items that already exist.

## Step 5 — Verify

1. Compare the created counts against the source post counts.
2. Open a few News, Vacancy, and Interview records in the admin UI.
3. Confirm attached PDFs download correctly.
4. Reclassify any posts that were mapped to the wrong type.

## Troubleshooting

- **Uploads missing**: If `MIGRATE_UPLOADS_DIR` is not set, the script still creates content but skips attachments.
- **Login failure**: Check that the admin user exists and MFA is disabled for the migration account.
- **Category wrong**: Re-run after changing WordPress categories or edit the `classify()` function in `scripts/migrate-wordpress.ts`.
