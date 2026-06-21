# Phase 8 — Admin Frontend (CMS UI)

> Part of the **CSC Zanzibar Public Website** implementation plan. See [`CSC-ZNZ-WEB-Implementation-Plan.md`](./CSC-ZNZ-WEB-Implementation-Plan.md) for the overview. Depends on [Phase 7](./phase-7-public-frontend.md).
>
> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans`.

**Milestone:** Staff can log into `/admin`, see a dashboard, and through form-based UI create/edit News, Vacancy, and Interview entries (with PDF upload + preview), submit for review, and have Reviewers approve/reject with comments. Administrators can manage users and roles. The admin UI lives outside the `[locale]` i18n tree (English-only for staff tooling is acceptable; strings kept in one place).

**Requirements covered:** REQ-CMS-01 (form-based editor), REQ-CMS-02/03 (workflow UI), REQ-CMS-06 (PDF upload + preview), REQ-USR UI (user management), REQ-USR-02 (auth-only admin).

### Task 8.1: Admin auth client + layout + route guard

**Files:**
- Create: `apps/web/src/lib/admin-api.ts`
- Create: `apps/web/src/app/admin/layout.tsx`
- Create: `apps/web/src/app/admin/login/page.tsx`
- Create: `apps/web/src/components/admin/AdminShell.tsx`

- [ ] **Step 1: Write `apps/web/src/lib/admin-api.ts`** (cookie-based JWT client for the browser)

```typescript
const BASE = '/api/admin'; // proxied to NestJS in production; in dev use NEXT_PUBLIC_API_BASE_URL

export async function login(email: string, password: string, mfaCode?: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api'}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, mfaCode }),
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Login failed');
  return res.json();
}

async function authed(path: string, init?: RequestInit) {
  const token = localStorage.getItem('accessToken');
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api'}${path}`, {
    ...init,
    headers: { ...init?.headers, Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`${path} ${res.status}`);
  return res.json();
}

export const adminApi = {
  newsCreate: (dto: any) => authed('/news', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dto) }),
  newsUpdate: (id: string, dto: any) => authed(`/news/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dto) }),
  newsTransition: (id: string, to: string) => authed(`/news/${id}/transition`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to }) }),
  vacancyCreate: (dto: any) => authed('/vacancies', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dto) }),
  vacancyTransition: (id: string, to: string) => authed(`/vacancies/${id}/transition`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to }) }),
  interviewCreate: (dto: any) => authed('/interviews', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dto) }),
  interviewTransition: (id: string, to: string) => authed(`/interviews/${id}/transition`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to }) }),
  uploadDocument: (file: File, ownerType: string, ownerId: string) => {
    const fd = new FormData(); fd.append('file', file);
    return authed(`/documents/upload/${ownerType}/${ownerId}`, { method: 'POST', body: fd });
  },
  usersList: () => authed('/users'),
  userCreate: (dto: any) => authed('/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dto) }),
  userUpdate: (id: string, dto: any) => authed(`/users/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dto) }),
  pageUpsert: (dto: any) => authed('/pages', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dto) }),
  pageTree: () => authed('/pages/tree'),
};
```

- [ ] **Step 2: Write `apps/web/src/app/admin/login/page.tsx`**

```tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '../../../lib/admin-api';

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaRequired, setMfaRequired] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError('');
    try {
      const res = await login(email, password, mfaCode || undefined);
      if (res.mfaRequired) { setMfaRequired(true); return; }
      localStorage.setItem('accessToken', res.accessToken);
      localStorage.setItem('user', JSON.stringify(res.user));
      router.push('/admin/dashboard');
    } catch { setError('Invalid credentials'); }
  }

  return (
    <form onSubmit={submit} className="admin-login">
      <h1>Admin Login</h1>
      {error && <p role="alert">{error}</p>}
      <label>Email <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
      <label>Password <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
      {mfaRequired && <label>MFA code <input inputMode="numeric" value={mfaCode} onChange={(e) => setMfaCode(e.target.value)} required /></label>}
      <button type="submit">Sign in</button>
    </form>
  );
}
```

- [ ] **Step 3: Write `apps/web/src/components/admin/AdminShell.tsx`** (client guard + nav)

```tsx
'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token && pathname !== '/admin/login') { router.replace('/admin/login'); return; }
    setReady(true);
  }, [router, pathname]);

  if (!ready) return <p>Loading…</p>;
  if (pathname === '/admin/login') return <>{children}</>;

  return (
    <div className="admin">
      <aside>
        <nav aria-label="Admin">
          <Link href="/admin/dashboard">Dashboard</Link>
          <Link href="/admin/news">News</Link>
          <Link href="/admin/vacancies">Vacancies</Link>
          <Link href="/admin/interviews">Interviews</Link>
          <Link href="/admin/pages">Pages</Link>
          <Link href="/admin/users">Users</Link>
        </nav>
      </aside>
      <main>{children}</main>
    </div>
  );
}
```

- [ ] **Step 4: Write `apps/web/src/app/admin/layout.tsx`**

```tsx
import { AdminShell } from '../../../components/admin/AdminShell';
import '../../../styles/admin.css';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
```

Add `apps/web/styles/admin.css` with a simple two-column layout (sidebar + main), forms with stacked labels.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/admin-api.ts apps/web/src/app/admin apps/web/src/components/admin apps/web/styles/admin.css
git commit -m "feat(admin): auth client, login, guarded shell"
```

### Task 8.2: Dashboard (REQ-RPT-02 preview)

**Files:**
- Create: `apps/web/src/app/admin/dashboard/page.tsx`

- [ ] **Step 1: Write `apps/web/src/app/admin/dashboard/page.tsx`** — a client component that calls a future reporting endpoint (Phase 9); for now shows the logged-in user and quick links.

```tsx
'use client';
export default function Dashboard() {
  const user = JSON.parse(localStorage.getItem('user') ?? '{}');
  return (
    <>
      <h1>Dashboard</h1>
      <p>Signed in as {user.name} ({user.role})</p>
      <ul>
        <li>Create News, Vacancy, or Interview notice</li>
        <li>Review pending submissions</li>
        <li>Manage users and static pages</li>
      </ul>
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/admin/dashboard
git commit -m "feat(admin): dashboard"
```

### Task 8.3: News editor form + workflow (REQ-CMS-01/02/03/06)

**Files:**
- Create: `apps/web/src/components/admin/NewsForm.tsx`
- Create: `apps/web/src/components/admin/DocumentUploader.tsx`
- Create: `apps/web/src/app/admin/news/page.tsx`
- Create: `apps/web/src/app/admin/news/[id]/page.tsx`

- [ ] **Step 1: Write `apps/web/src/components/admin/DocumentUploader.tsx`** (upload + preview, REQ-CMS-06)

```tsx
'use client';
import { useState } from 'react';
import { adminApi } from '../../../lib/admin-api';

export function DocumentUploader({ ownerType, ownerId }: { ownerType: string; ownerId: string }) {
  const [docs, setDocs] = useState<{ id: string; filename: string }[]>([]);
  const [preview, setPreview] = useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(file.type.startsWith('image/') ? url : null);
    const doc = await adminApi.uploadDocument(file, ownerType, ownerId);
    setDocs((d) => [...d, { id: doc.id, filename: doc.filename }]);
    if (preview) URL.revokeObjectURL(preview);
  }

  return (
    <div>
      <label>Attach document (PDF/DOCX/JPG/PNG, ≤25MB)
        <input type="file" accept=".pdf,.docx,.jpg,.jpeg,.png" onChange={onFile} />
      </label>
      {preview && <img src={preview} alt="Preview" width={200} />}
      <ul>{docs.map((d) => <li key={d.id}>{d.filename}</li>)}</ul>
    </div>
  );
}
```

- [ ] **Step 2: Write `apps/web/src/components/admin/NewsForm.tsx`**

```tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi } from '../../../lib/admin-api';
import { DocumentUploader } from './DocumentUploader';

export function NewsForm({ initial }: { initial?: any }) {
  const router = useRouter();
  const [form, setForm] = useState({
    titleSw: initial?.titleSw ?? '', titleEn: initial?.titleEn ?? '',
    bodySw: initial?.bodySw ?? '', bodyEn: initial?.bodyEn ?? '',
    publishDate: initial?.publishDate?.slice(0, 10) ?? '',
  });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (initial?.id) { await adminApi.newsUpdate(initial.id, form); }
    else { const created = await adminApi.newsCreate(form); router.push(`/admin/news/${created.id}`); }
  }

  async function transition(to: string) {
    await adminApi.newsTransition(initial.id, to);
    router.refresh();
  }

  return (
    <form onSubmit={save}>
      <label>Title (Swahili) <input value={form.titleSw} onChange={set('titleSw')} required /></label>
      <label>Title (English) <input value={form.titleEn} onChange={set('titleEn')} /></label>
      <label>Body (Swahili) <textarea value={form.bodySw} onChange={set('bodySw')} rows={8} required /></label>
      <label>Body (English) <textarea value={form.bodyEn} onChange={set('bodyEn')} rows={8} /></label>
      <label>Publish date <input type="date" value={form.publishDate} onChange={set('publishDate')} /></label>
      {initial?.id && <DocumentUploader ownerType="NewsPost" ownerId={initial.id} />}
      <button type="submit">Save draft</button>
      {initial?.id && <>
        <button type="button" onClick={() => transition('InReview')}>Submit for review</button>
        <button type="button" onClick={() => transition('Published')}>Publish</button>
        <button type="button" onClick={() => transition('Rejected')}>Reject</button>
      </>}
    </form>
  );
}
```

- [ ] **Step 3: Write list + edit pages**

`apps/web/src/app/admin/news/page.tsx`:

```tsx
'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminApi } from '../../../../lib/admin-api';

export default function NewsAdmin() {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => { fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api'}/news?page=1`, { headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` } }).then((r) => r.json()).then((d) => setItems(d.items)); }, []);
  return (
    <>
      <h1>News</h1>
      <Link href="/admin/news/new">+ New news</Link>
      <ul>{items.map((n) => <li key={n.id}><Link href={`/admin/news/${n.id}`}>{n.titleSw}</Link> — {n.status}</li>)}</ul>
    </>
  );
}
```

`apps/web/src/app/admin/news/[id]/page.tsx`:

```tsx
'use client';
import { useEffect, useState } from 'react';
import { NewsForm } from '../../../../components/admin/NewsForm';

export default function EditNews({ params }: { params: { id: string } }) {
  const [item, setItem] = useState<any>(null);
  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api'}/news?byId=${params.id}`, { headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` } })
      .then((r) => r.json()).then(setItem).catch(() => setItem({}));
  }, [params.id]);
  if (!item) return <p>Loading…</p>;
  return <NewsForm initial={item} />;
}
```

> Add a `GET /news/:id` admin endpoint (id-based) to the News controller so the editor can load a draft by id (the public one is by-slug). Add: `@Get('by-id/:id') @Roles(...) @UseGuards(RolesGuard) byId(@Param('id') id: string) { return this.news.findOneOrThrow(id); }` and make `findOneOrThrow` public on the service (rename to `findById` and export).

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/admin apps/web/src/app/admin/news apps/api/src/news
git commit -m "feat(admin): news editor form + workflow + document upload (REQ-CMS-01/02/03/06)"
```

### Task 8.4: Vacancy editor (REQ-VAC-01, REQ-VAC-04 applyUrl)

- [ ] **Step 1: Write `apps/web/src/components/admin/VacancyForm.tsx`** mirroring `NewsForm` with fields: `title`, `mda`, `closingDate` (date), `applyUrl` (url, prefilled with `https://portal.zanajira.go.tz/home`), `departmentId` (select from a departments fetch), and workflow buttons (Submit/Publish/Reject) via `adminApi.vacancy*`. Owner type for documents is `Vacancy`.

- [ ] **Step 2: Write list + edit pages** under `apps/web/src/app/admin/vacancies/` mirroring the News pages, calling `adminApi.vacancyCreate` / `vacancyTransition` and a `GET /vacancies/by-id/:id` admin endpoint (add it to the Vacancies controller like News).

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/admin/VacancyForm.tsx apps/web/src/app/admin/vacancies apps/api/src/vacancies
git commit -m "feat(admin): vacancy editor with MDA + closing date + apply URL (REQ-VAC-01/04)"
```

### Task 8.5: Interview editor (REQ-INT-01/02)

- [ ] **Step 1: Write `apps/web/src/components/admin/InterviewForm.tsx`** with fields: `title`, `mda`, `type` (select: CallForInterview / InterviewResult — REQ-INT-02), `departmentId`, and workflow buttons. Owner type `InterviewNotice`.

- [ ] **Step 2: Write list + edit pages** under `apps/web/src/app/admin/interviews/`, plus a `GET /interviews/by-id/:id` admin endpoint.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/admin/InterviewForm.tsx apps/web/src/app/admin/interviews apps/api/src/interviews
git commit -m "feat(admin): interview editor with type sub-categories (REQ-INT-01/02)"
```

### Task 8.6: Static pages editor (REQ-PG-06)

- [ ] **Step 1: Write `apps/web/src/components/admin/PageForm.tsx`** with fields: `slug` (read-only when editing existing), `titleSw`, `titleEn`, `bodySw`, `bodyEn` (rich-ish textarea), `parentId` (select from page tree). Calls `adminApi.pageUpsert`.

- [ ] **Step 2: Write `apps/web/src/app/admin/pages/page.tsx`** listing the page tree (`adminApi.pageTree`) with edit links; and `apps/web/src/app/admin/pages/[slug]/page.tsx` rendering `PageForm` loaded via `GET /pages/by-slug/:slug` (admin can call the public endpoint).

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/admin/PageForm.tsx apps/web/src/app/admin/pages
git commit -m "feat(admin): static pages editor (REQ-PG-06)"
```

### Task 8.7: User management (REQ-USR-03)

- [ ] **Step 1: Write `apps/web/src/components/admin/UserForm.tsx`** with `name`, `email`, `role` (select Editor/Reviewer/Administrator), and `status`; calls `adminApi.userCreate` / `userUpdate`.

- [ ] **Step 2: Write `apps/web/src/app/admin/users/page.tsx`** listing users (`adminApi.usersList`) with role + status and edit links, plus a "New user" form. Role options restricted: only Administrator can see this route (enforce client-side by checking `localStorage.user.role`; the API `RolesGuard` enforces server-side).

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/admin/UserForm.tsx apps/web/src/app/admin/users
git commit -m "feat(admin): user management UI (REQ-USR-03)"
```

### Task 8.8: Reviewer review UI (REQ-CMS-03)

- [ ] **Step 1: Add a "Pending review" inbox** at `apps/web/src/app/admin/reviews/page.tsx` that fetches items with status `InReview` across the three content types. Add API endpoints `GET /news?status=InReview` etc. (extend the controllers' list to accept an admin `status` filter and skip the published-only constraint when the caller is an Editor/Reviewer/Admin — gate by `@Roles`).

- [ ] **Step 2: Each row links to the editor with Reject-with-comment** — add an optional `comment` field on the transition endpoint body and persist it in the `ContentVersion.snapshot` diff so reviewers' comments are recorded (REQ-CMS-03 "optional comments").

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/admin/reviews apps/api/src/news apps/api/src/vacancies apps/api/src/interviews
git commit -m "feat(admin): reviewer inbox + reject-with-comment (REQ-CMS-03)"
```

### Task 8.9: Admin e2e smoke

- [ ] **Step 1: Playwright `apps/web/e2e/admin.spec.ts`**

```typescript
import { test, expect } from '@playwright/test';
test('admin login flow', async ({ page }) => {
  await page.goto('http://localhost:3000/admin/login');
  await page.getByLabel('Email').fill('admin@zanajira.go.tz');
  await page.getByLabel('Password').fill('ChangeMe!123');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/admin\/dashboard/);
});
```

Run: `pnpm --filter @zanweb/web test:e2e`
Expected: PASS (uses seeded admin).

- [ ] **Step 2: Commit**

```bash
git add apps/web/e2e/admin.spec.ts
git commit -m "test(admin): e2e login smoke"
```

---