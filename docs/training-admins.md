# Training Guide — Administrators

Administrators manage users, static pages, and reporting.

## User management

1. Log in at `/admin/login`.
2. Go to **Admin → Users**.
3. Click **Add User** to create an editor, reviewer, or administrator.
4. Deactivate a user by toggling their status.

## Roles and permissions

| Role | Can create | Can review | Can manage users | Can publish |
|---|---|---|---|---|
| Editor | Yes | No | No | No |
| Reviewer | Yes | Yes | No | Yes |
| Administrator | Yes | Yes | Yes | Yes |

## Static page editor

1. Go to **Admin → Pages**.
2. Create a new page with Swahili title and body.
3. Set a slug and optional parent page.
4. Save; the page appears on the public site under `/page/:slug`.

## MFA enrollment

1. Go to your profile or the user edit screen.
2. Enable MFA.
3. Scan the QR code with an authenticator app.
4. Enter the one-time code to confirm.

## Reporting dashboard

1. Go to the **Dashboard**.
2. View tables for:
   - Published content by month
   - Vacancies by MDA
   - Most-downloaded documents
3. Use these metrics to guide content planning.

## Audit logs

All create, update, publish, reject, and delete actions are logged. Use the audit log screen to investigate changes.
