# Phase 7 — Public Frontend

> Part of the **CSC Zanzibar Public Website** implementation plan. See [`CSC-ZNZ-WEB-Implementation-Plan.md`](./CSC-ZNZ-WEB-Implementation-Plan.md) for the overview. Depends on [Phase 6](./phase-6-pages-i18n.md).
>
> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans`.

**Milestone:** A server-rendered, bilingual, responsive public site: navigation + branding, Home with latest news/vacancies, all static pages from CMS, News/Vacancy/Interview listing + detail pages with filters, site search, external/staff-services links, a language switcher, WCAG 2.1 AA-conscious markup, and per-page SEO (meta + JSON-LD structured data). All data fetched from the NestJS API.

**Requirements covered:** REQ-PG-01 (Home), REQ-NEWS-02/03/04, REQ-VAC-02/04 (deep-link apply), REQ-INT-03, REQ-SRCH-01/02 (UI), REQ-I18N-01/02/03 (switcher + fallback + default Swahili), REQ-EXT-01/02/03, NFR 7.1 (SSR), 7.3 (a11y), 7.7 (SEO), 7.8 (UI strings).

### Task 7.1: API client + branding shell + nav

**Files:**
- Create: `apps/web/src/lib/api.ts`
- Create: `apps/web/src/components/Header.tsx`
- Create: `apps/web/src/components/Footer.tsx`
- Create: `apps/web/src/components/LanguageSwitcher.tsx`
- Modify: `apps/web/src/app/[locale]/layout.tsx`
- Create: `apps/web/styles/globals.css`

- [ ] **Step 1: Write `apps/web/src/lib/api.ts`** (typed server-side fetch wrapper)

```typescript
import type {
  NewsPostResponse, VacancyResponse, InterviewNoticeResponse, PageResponse, Paginated,
} from '@zanweb/shared';

const BASE = process.env.API_BASE_URL ?? 'http://localhost:4000/api';

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { next: { revalidate: 300 } });
  if (!res.ok) throw new Error(`API ${path} -> ${res.status}`);
  return res.json() as Promise<T>;
}

export const api = {
  newsList: (page = 1) => get<Paginated<NewsPostResponse>>(`/news?page=${page}`),
  newsBySlug: (slug: string) => get<NewsPostResponse>(`/news/by-slug/${slug}`),
  vacancyList: (page = 1, mda?: string) => get<Paginated<VacancyResponse>>(`/vacancies?page=${page}${mda ? `&mda=${mda}` : ''}`),
  vacancyBySlug: (slug: string) => get<VacancyResponse>(`/vacancies/by-slug/${slug}`),
  interviewList: (page = 1, type?: string) => get<Paginated<InterviewNoticeResponse>>(`/interviews?page=${page}${type ? `&type=${type}` : ''}`),
  interviewBySlug: (slug: string) => get<InterviewNoticeResponse>(`/interviews/by-slug/${slug}`),
  pageBySlug: (slug: string) => get<PageResponse>(`/pages/by-slug/${slug}`),
  pageTree: () => get<PageResponse[]>(`/pages/tree`),
  search: (q: string) => get<{ id: string; type: string; slug: string; title: string }[]>(`/search?q=${encodeURIComponent(q)}`),
};
```

- [ ] **Step 2: Write `apps/web/src/components/LanguageSwitcher.tsx`**

```tsx
'use client';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';

export function LanguageSwitcher() {
  const locale = useLocale();
  const t = useTranslations('Lang');
  const router = useRouter();
  const pathname = usePathname();

  function toggle() {
    const next = locale === 'sw' ? 'en' : 'sw';
    const rest = pathname.replace(/^\/(sw|en)/, '');
    router.push(`/${next}${rest}`);
  }
  return (
    <button onClick={toggle} aria-label="Switch language" className="lang-switch">
      {t('switch')}
    </button>
  );
}
```

- [ ] **Step 3: Write `apps/web/src/components/Header.tsx`** (nav from translations + language switcher)

```tsx
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { LanguageSwitcher } from './LanguageSwitcher';

export function Header({ locale }: { locale: string }) {
  const t = useTranslations('Nav');
  const links: { href: string; key: keyof ReturnType<typeof useTranslations<'Nav'>> }[] = [
    { href: '/news', key: 'news' },
    { href: '/vacancies', key: 'vacancies' },
    { href: '/interviews', key: 'interviews' },
    { href: '/about', key: 'about' },
    { href: '/organization', key: 'organization' },
    { href: '/services', key: 'services' },
    { href: '/contact', key: 'contact' },
    { href: '/external-links', key: 'externalLinks' },
  ];
  return (
    <header className="site-header">
      <Link href={`/${locale}`} className="brand">
        <img src="/branding/coat-of-arms.svg" alt="" width={48} height={48} />
        <span>{t('about') === 'About Us' ? 'CSC Zanzibar' : 'Tume ya Utumishi'}</span>
      </Link>
      <nav aria-label="Primary">
        <ul>
          {links.map((l) => (
            <li key={l.href}><Link href={`/${locale}${l.href}`}>{t(l.key as any)}</Link></li>
          ))}
        </ul>
      </nav>
      <LanguageSwitcher />
    </header>
  );
}
```

> The brand-name branch is a placeholder approach; better: read a translated `Site.name` key from messages. Add `"Site": { "name": "Tume ya Utumishi wa Umma – Zanzibar" }` to both message files and use `useTranslations('Site')('name')` instead of the conditional. Apply that.

- [ ] **Step 4: Write `apps/web/src/components/Footer.tsx`**

```tsx
import { useTranslations } from 'next-intl';
export function Footer() {
  const t = useTranslations('External');
  return (
    <footer className="site-footer">
      <ul>
        <li><a href="https://portal.zanajira.go.tz/home">{t('zanajiraPortal')}</a></li>
        <li><a href="https://www.ajira.go.tz/">{t('nationalAjira')}</a></li>
        <li><a href="https://eoffice.zanzibar.go.tz/">{t('eOffice')}</a></li>
        <li><a href="https://hrms.zanzibar.go.tz/">{t('hrms')}</a></li>
        <li><a href="https://mail.zanzibar.go.tz/">{t('staffMail')}</a></li>
        <li><a href="https://salary.zanzibar.go.tz/">{t('salaryClaim')}</a></li>
      </ul>
    </footer>
  );
}
```

- [ ] **Step 5: Write `apps/web/styles/globals.css`** (minimal SMZ-blue palette; refine with real branding assets)

```css
:root { --smz-blue: #003366; --smz-gold: #c9a227; --ink: #1a1a1a; --bg: #ffffff; }
* { box-sizing: border-box; }
body { margin: 0; font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; color: var(--ink); }
.site-header { display: flex; align-items: center; gap: 1rem; padding: 0.75rem 1.5rem; background: var(--smz-blue); color: #fff; }
.site-header nav ul { display: flex; gap: 1rem; list-style: none; padding: 0; margin: 0; }
.site-header a { color: #fff; text-decoration: none; }
.site-footer { background: var(--smz-blue); color: #fff; padding: 1rem 1.5rem; }
.site-footer ul { display: flex; flex-wrap: wrap; gap: 1rem; list-style: none; padding: 0; margin: 0; }
.site-footer a { color: var(--smz-gold); }
main { max-width: 1100px; margin: 0 auto; padding: 1.5rem; }
.lang-switch { background: var(--smz-gold); color: #1a1a1a; border: 0; padding: 0.4rem 0.8rem; border-radius: 4px; }
@media (max-width: 768px) {
  .site-header { flex-wrap: wrap; }
  .site-header nav ul { flex-wrap: wrap; }
}
```

- [ ] **Step 6: Update `apps/web/src/app/[locale]/layout.tsx`** to render Header/Footer + import global CSS + set `<title>`/metadata

```tsx
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales } from '../../i18n';
import { Header } from '../../../components/Header';
import { Footer } from '../../../components/Footer';
import '../../../styles/globals.css';

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }) {
  const t = await getTranslations({ locale, namespace: 'Site' });
  return { title: { default: t('name'), template: `%s | ${t('name')}` }, description: 'CSC Zanzibar official website' };
}

export default async function LocaleLayout({ children, params: { locale } }: { children: React.ReactNode; params: { locale: string } }) {
  if (!locales.includes(locale as never)) notFound();
  const messages = await getMessages();
  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider messages={messages}>
          <Header locale={locale} />
          <main>{children}</main>
          <Footer />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/lib/api.ts apps/web/src/components apps/web/src/app/[locale]/layout.tsx apps/web/styles apps/web/messages
git commit -m "feat(web): API client, header/footer, language switcher, branding shell"
```

### Task 7.2: Home page — latest news + vacancies (REQ-PG-01)

**Files:**
- Modify: `apps/web/src/app/[locale]/page.tsx`
- Create: `apps/web/src/components/NoticeCard.tsx`

- [ ] **Step 1: Write `apps/web/src/components/NoticeCard.tsx`**

```tsx
import Link from 'next/link';
import { useTranslations } from 'next-intl';

export function NoticeCard({ locale, section, slug, title, date }: { locale: string; section: string; slug: string; title: string; date: string }) {
  const t = useTranslations('Common');
  return (
    <article className="notice-card">
      <h3><Link href={`/${locale}/${section}/${slug}`}>{title}</Link></h3>
      <time dateTime={date}>{t('publishedOn')}: {new Date(date).toLocaleDateString(locale === 'sw' ? 'sw-TZ' : 'en-GB')}</time>
    </article>
  );
}
```

- [ ] **Step 2: Update `apps/web/src/app/[locale]/page.tsx`** (SSR fetch of latest news + vacancies)

```tsx
import { useTranslations } from 'next-intl';
import { api } from '../../../lib/api';
import { NoticeCard } from '../../../components/NoticeCard';

export default async function Home({ params: { locale } }: { params: { locale: string } }) {
  const t = useTranslations('Home');
  const [news, vacancies] = await Promise.all([api.newsList(1), api.vacancyList(1)]);
  return (
    <>
      <h1>{t('title')}</h1>
      <p>{t('welcome')}</p>
      <section aria-labelledby="news-h">
        <h2 id="news-h">{t('latestNews')}</h2>
        <ul className="notice-list">{news.items.slice(0, 5).map((n) => (
          <li key={n.id}><NoticeCard locale={locale} section="news" slug={n.slug} title={n.titleSw} date={n.publishDate} /></li>
        ))}</ul>
      </section>
      <section aria-labelledby="vac-h">
        <h2 id="vac-h">{t('latestVacancies')}</h2>
        <ul className="notice-list">{vacancies.items.slice(0, 5).map((v) => (
          <li key={v.id}><NoticeCard locale={locale} section="vacancies" slug={v.slug} title={v.title} date={v.publishDate} /></li>
        ))}</ul>
      </section>
    </>
  );
}
```

Add `.notice-list { list-style: none; padding: 0; display: grid; gap: 1rem; }` to `globals.css`.

- [ ] **Step 3: Playwright e2e `apps/web/e2e/home.spec.ts`**

```typescript
import { test, expect } from '@playwright/test';
test('home renders latest news and vacancies headings', async ({ page }) => {
  await page.goto('http://localhost:3000/sw');
  await expect(page.getByRole('heading', { name: /Tume ya Utumishi/ })).toBeVisible();
});
```

Run: `pnpm --filter @zanweb/web test:e2e`
Expected: PASS (requires API + web running — start both in dev for the e2e run).

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/[locale]/page.tsx apps/web/src/components/NoticeCard.tsx apps/web/e2e apps/web/styles
git commit -m "feat(web): home page with latest news and vacancies (REQ-PG-01)"
```

### Task 7.3: Static page rendering from CMS (REQ-PG-02/03/04/05)

**Files:**
- Create: `apps/web/src/app/[locale]/[slug]/page.tsx` (catch dynamic static pages)
- Create: `apps/web/src/app/[locale]/about/page.tsx`
- Create: `apps/web/src/app/[locale]/organization/page.tsx`
- Create: `apps/web/src/app/[locale]/services/page.tsx`
- Create: `apps/web/src/app/[locale]/contact/page.tsx`

- [ ] **Step 1: Write `apps/web/src/app/[locale]/[slug]/page.tsx`** (renders any CMS page by slug with bilingual fallback)

```tsx
import { notFound } from 'next/navigation';
import { api } from '../../../lib/api';
import { localizedField } from '../../../lib/i18n-content';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata({ params: { locale, slug } }: { params: { locale: string; slug: string } }) {
  try {
    const page = await api.pageBySlug(slug);
    const { text } = localizedField(page.titleSw, page.titleEn, locale as 'sw' | 'en');
    return { title: text };
  } catch { return {}; }
}

export default async function StaticPage({ params: { locale, slug } }: { params: { locale: string; slug: string } }) {
  let page;
  try { page = await api.pageBySlug(slug); } catch { notFound(); }
  const title = localizedField(page.titleSw, page.titleEn, locale as 'sw' | 'en');
  const body = localizedField(page.bodySw, page.bodyEn, locale as 'sw' | 'en');
  return (
    <article>
      <h1>{title.text}{!title.translated && <small> · {await getTranslations({ locale, namespace: 'Common' }).then((t) => t('notTranslated'))}</small>}</h1>
      <div dangerouslySetInnerHTML={{ __html: body.text || '' }} />
    </article>
  );
}
```

> Use a sanitizer (e.g. `dompurify` + `isomorphic-dompurify`) before `dangerouslySetInnerHTML` to mitigate XSS (NFR 7.2). Add `"isomorphic-dompurify": "^2.11.0"` to deps and wrap: `import DOMPurify from 'isomorphic-dompurify'; ... __html: DOMPurify.sanitize(body.text || '')`.

- [ ] **Step 2: Write thin wrappers** for `about`, `organization`, `services`, `contact` that re-export the catch-all by hardcoding the slug, e.g. `apps/web/src/app/[locale]/about/page.tsx`:

```tsx
import StaticPage from '../[slug]/page';
export default function About(props: any) { return <StaticPage {...props} params={{ ...props.params, slug: 'about' }} />; }
export { generateMetadata } from '../[slug]/page';
```

Replicate for `organization` (slug `organization`), `services` (slug `services`), `contact` (slug `contact`). For nested sub-pages (e.g. `about/introduction`), create `apps/web/src/app/[locale]/about/[child]/page.tsx` that joins the path and calls `api.pageBySlug(\`${slug}/${child}\`)`.

- [ ] **Step 3: Contact page extras (REQ-PG-05: address, phone, email, map)** — extend the `contact` CMS page or render a dedicated `apps/web/src/app/[locale]/contact/page.tsx` with a static block:

```tsx
import { useTranslations } from 'next-intl';
import { api } from '../../../lib/api';
import { localizedField } from '../../../lib/i18n-content';

export default async function Contact({ params: { locale } }: { params: { locale: string } }) {
  const t = useTranslations('Contact');
  const page = await api.pageBySlug('contact').catch(() => null);
  const body = page ? localizedField(page.bodySw, page.bodyEn, locale as 'sw' | 'en') : null;
  return (
    <article>
      <h1>{t('address')}</h1>
      {body && <div dangerouslySetInnerHTML={{ __html: body.text }} />}
      <dl>
        <dt>{t('phone')}</dt><dd>+255 24 223 0000</dd>
        <dt>{t('email')}</dt><dd><a href="mailto:info@zanajira.go.tz">info@zanajira.go.tz</a></dd>
      </dl>
      <iframe title={t('map')} src="https://www.openstreetmap.org/export/embed.html?bbox=39.19%2C-6.22%2C39.24%2C-6.18&layer=mapnik" width="100%" height="320" loading="lazy" />
    </article>
  );
}
```

(Replace hardcoded phone/email with CMS-managed fields if desired in a later iteration.)

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/[locale]
git commit -m "feat(web): CMS-driven static pages + contact (REQ-PG-02..05)"
```

### Task 7.4: News listing + detail (REQ-NEWS-02/03/04)

**Files:**
- Create: `apps/web/src/app/[locale]/news/page.tsx`
- Create: `apps/web/src/app/[locale]/news/[slug]/page.tsx`
- Create: `apps/web/src/components/NewsFilters.tsx`

- [ ] **Step 1: Write `apps/web/src/app/[locale]/news/page.tsx`** (reverse-chron list + date/keyword filters)

```tsx
import { api } from '../../../../lib/api';
import { NoticeCard } from '../../../../components/NoticeCard';
import { NewsFilters } from '../../../../components/NewsFilters';

export default async function NewsList({ params: { locale }, searchParams }: { params: { locale: string }; searchParams: { q?: string; dateFrom?: string; dateTo?: string; page?: string } }) {
  const q = new URLSearchParams();
  if (searchParams.q) q.set('q', searchParams.q);
  if (searchParams.dateFrom) q.set('dateFrom', searchParams.dateFrom);
  if (searchParams.dateTo) q.set('dateTo', searchParams.dateTo);
  q.set('page', searchParams.page ?? '1');
  const data = await fetch(`${process.env.API_BASE_URL}/api/news?${q}`).then((r) => r.json());
  return (
    <>
      <h1>{locale === 'sw' ? 'Habari' : 'News'}</h1>
      <NewsFilters locale={locale} />
      <ul className="notice-list">{data.items.map((n: any) => (
        <li key={n.id}><NoticeCard locale={locale} section="news" slug={n.slug} title={n.titleSw} date={n.publishDate} /></li>
      ))}</ul>
    </>
  );
}
```

- [ ] **Step 2: Write `apps/web/src/components/NewsFilters.tsx`** (a `<form method="get">` with `q`, `dateFrom`, `dateTo` inputs, labels for a11y)

```tsx
export function NewsFilters({ locale }: { locale: string }) {
  return (
    <form method="get" className="filters" aria-label="Filter news">
      <label>{locale === 'sw' ? 'Neno muhimu' : 'Keyword'} <input name="q" /></label>
      <label>{locale === 'sw' ? 'Kutoka' : 'From'} <input type="date" name="dateFrom" /></label>
      <label>{locale === 'sw' ? 'Hadi' : 'To'} <input type="date" name="dateTo" /></label>
      <button type="submit">{locale === 'sw' ? 'Chuja' : 'Filter'}</button>
    </form>
  );
}
```

- [ ] **Step 3: Write `apps/web/src/app/[locale]/news/[slug]/page.tsx`** (detail + documents + cover + SEO)

```tsx
import { notFound } from 'next/navigation';
import { api } from '../../../../../lib/api';
import { localizedField } from '../../../../../lib/i18n-content';
import DOMPurify from 'isomorphic-dompurify';
import type { Metadata } from 'next';

export async function generateMetadata({ params: { locale, slug } }: { params: { locale: string; slug: string } }): Promise<Metadata> {
  try {
    const n = await api.newsBySlug(slug);
    const title = localizedField(n.titleSw, n.titleEn, locale as 'sw' | 'en');
    return {
      title: title.text,
      description: (localizedField(n.bodySw, n.bodyEn, locale as 'sw' | 'en').text ?? '').slice(0, 160),
      alternates: { canonical: `/${locale}/news/${slug}` },
      openGraph: { type: 'article', title: title.text, publishedTime: n.publishDate },
    };
  } catch { return {}; }
}

export default async function NewsDetail({ params: { locale, slug } }: { params: { locale: string; slug: string } }) {
  let n;
  try { n = await api.newsBySlug(slug); } catch { notFound(); }
  const title = localizedField(n.titleSw, n.titleEn, locale as 'sw' | 'en');
  const body = localizedField(n.bodySw, n.bodyEn, locale as 'sw' | 'en');
  const jsonLd = { '@context': 'https://schema.org', '@type': 'NewsArticle', headline: title.text, datePublished: n.publishDate, url: `/${locale}/news/${slug}` };
  return (
    <article>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <h1>{title.text}{!title.translated && <small> · not translated</small>}</h1>
      <time dateTime={n.publishDate}>{new Date(n.publishDate).toLocaleDateString(locale === 'sw' ? 'sw-TZ' : 'en-GB')}</time>
      {n.coverImageUrl && <img src={n.coverImageUrl} alt="" width={800} height={400} />}
      <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(body.text ?? '') }} />
      {n.documents?.length > 0 && <section><h2>{locale === 'sw' ? 'Nyaraka' : 'Documents'}</h2><ul>{n.documents.map((d) => (
        <li key={d.id}><a href={d.url}>{d.filename}</a></li>
      ))}</ul></section>}
    </article>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/[locale]/news apps/web/src/components/NewsFilters.tsx apps/web/package.json
git commit -m "feat(web): news listing, filters, and detail with SEO (REQ-NEWS-02/03/04)"
```

### Task 7.5: Vacancy listing + detail + apply deep-link (REQ-VAC-02/04)

**Files:**
- Create: `apps/web/src/app/[locale]/vacancies/page.tsx`
- Create: `apps/web/src/app/[locale]/vacancies/[slug]/page.tsx`

- [ ] **Step 1: Write `apps/web/src/app/[locale]/vacancies/page.tsx`** (filter by MDA + open/closed status, paginated)

```tsx
import { NoticeCard } from '../../../../components/NoticeCard';

export default async function VacancyList({ params: { locale }, searchParams }: { params: { locale: string }; searchParams: { mda?: string; status?: string; page?: string } }) {
  const q = new URLSearchParams({ page: searchParams.page ?? '1' });
  if (searchParams.mda) q.set('mda', searchParams.mda);
  if (searchParams.status) q.set('status', searchParams.status);
  const data = await fetch(`${process.env.API_BASE_URL}/api/vacancies?${q}`).then((r) => r.json());
  return (
    <>
      <h1>{locale === 'sw' ? 'Tangazo la Nafasi za Kazi' : 'Vacancy Announcements'}</h1>
      <form method="get" className="filters" aria-label="Filter vacancies">
        <label>{locale === 'sw' ? 'MDA' : 'MDA'} <input name="mda" defaultValue={searchParams.mda ?? ''} /></label>
        <label>{locale === 'sw' ? 'Hali' : 'Status'}
          <select name="status" defaultValue={searchParams.status ?? ''}>
            <option value="">{locale === 'sw' ? 'Zote' : 'All'}</option>
            <option value="Published">{locale === 'sw' ? 'Wazi' : 'Open'}</option>
            <option value="Closed">{locale === 'sw' ? 'Imefungwa' : 'Closed'}</option>
          </select>
        </label>
        <button type="submit">{locale === 'sw' ? 'Chuja' : 'Filter'}</button>
      </form>
      <ul className="notice-list">{data.items.map((v: any) => (
        <li key={v.id}><NoticeCard locale={locale} section="vacancies" slug={v.slug} title={v.title} date={v.publishDate} /></li>
      ))}</ul>
    </>
  );
}
```

- [ ] **Step 2: Write `apps/web/src/app/[locale]/vacancies/[slug]/page.tsx`** (detail + closing date + apply deep-link REQ-VAC-04 + JobPosting JSON-LD NFR 7.7)

```tsx
import { notFound } from 'next/navigation';
import { api } from '../../../../../lib/api';
import type { Metadata } from 'next';

export async function generateMetadata({ params: { slug } }: { params: { locale: string; slug: string } }): Promise<Metadata> {
  try { const v = await api.vacancyBySlug(slug); return { title: v.title, alternates: { canonical: `/vacancies/${slug}` } }; } catch { return {}; }
}

export default async function VacancyDetail({ params: { locale, slug } }: { params: { locale: string; slug: string } }) {
  let v;
  try { v = await api.vacancyBySlug(slug); } catch { notFound(); }
  const jsonLd = { '@context': 'https://schema.org', '@type': 'JobPosting', title: v.title, hiringOrganization: v.mda, datePosted: v.publishDate, validThrough: v.closingDate, identifier: v.slug };
  return (
    <article>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <h1>{v.title}</h1>
      <p><strong>{locale === 'sw' ? 'MDA' : 'MDA'}:</strong> {v.mda}</p>
      <p><strong>{locale === 'sw' ? 'Tarehe ya Mwisho' : 'Closing date'}:</strong> <time dateTime={v.closingDate}>{new Date(v.closingDate).toLocaleDateString(locale === 'sw' ? 'sw-TZ' : 'en-GB')}</time></p>
      {v.applyUrl && <p><a className="apply" href={v.applyUrl} rel="noopener">{locale === 'sw' ? 'Omba Hapa' : 'Apply Here'}</a></p>}
      {v.documents?.length > 0 && <section><h2>{locale === 'sw' ? 'Nyaraka' : 'Documents'}</h2><ul>{v.documents.map((d: any) => (
        <li key={d.id}><a href={d.url}>{d.filename}</a></li>
      ))}</ul></section>}
    </article>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/[locale]/vacancies
git commit -m "feat(web): vacancy listing, filters, detail + apply deep-link (REQ-VAC-02/04)"
```

### Task 7.6: Interview listing + detail (REQ-INT-03)

**Files:**
- Create: `apps/web/src/app/[locale]/interviews/page.tsx`
- Create: `apps/web/src/app/[locale]/interviews/[slug]/page.tsx`

- [ ] **Step 1: Write `apps/web/src/app/[locale]/interviews/page.tsx`** (filter by type: CallForInterview / InterviewResult — REQ-INT-02)

```tsx
import { NoticeCard } from '../../../../components/NoticeCard';

export default async function InterviewList({ params: { locale }, searchParams }: { params: { locale: string }; searchParams: { type?: string; page?: string } }) {
  const q = new URLSearchParams({ page: searchParams.page ?? '1' });
  if (searchParams.type) q.set('type', searchParams.type);
  const data = await fetch(`${process.env.API_BASE_URL}/api/interviews?${q}`).then((r) => r.json());
  return (
    <>
      <h1>{locale === 'sw' ? 'Wito wa Usaili' : 'Call for Interviews'}</h1>
      <form method="get" className="filters" aria-label="Filter interviews">
        <label>{locale === 'sw' ? 'Aina' : 'Type'}
          <select name="type" defaultValue={searchParams.type ?? ''}>
            <option value="">{locale === 'sw' ? 'Zote' : 'All'}</option>
            <option value="CallForInterview">{locale === 'sw' ? 'Wito wa Usaili' : 'Call for Interview'}</option>
            <option value="InterviewResult">{locale === 'sw' ? 'Matokeo ya Usaili' : 'Interview Results'}</option>
          </select>
        </label>
        <button type="submit">{locale === 'sw' ? 'Chuja' : 'Filter'}</button>
      </form>
      <ul className="notice-list">{data.items.map((i: any) => (
        <li key={i.id}><NoticeCard locale={locale} section="interviews" slug={i.slug} title={i.title} date={i.publishDate} /></li>
      ))}</ul>
    </>
  );
}
```

- [ ] **Step 2: Write `apps/web/src/app/[locale]/interviews/[slug]/page.tsx`** (detail + document download; mirror the News detail structure, using `api.interviewBySlug` and an `Article` JSON-LD).

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/[locale]/interviews
git commit -m "feat(web): interview listing by type + detail (REQ-INT-03)"
```

### Task 7.7: Search page (REQ-SRCH-01/02)

**Files:**
- Create: `apps/web/src/app/[locale]/search/page.tsx`

- [ ] **Step 1: Write `apps/web/src/app/[locale]/search/page.tsx`**

```tsx
import { useTranslations } from 'next-intl';
import Link from 'next/link';

export default async function SearchPage({ params: { locale }, searchParams }: { params: { locale: string }; searchParams: { q?: string } }) {
  const t = useTranslations('Common');
  let results: { id: string; type: string; slug: string; title: string }[] = [];
  if (searchParams.q) {
    results = await fetch(`${process.env.API_BASE_URL}/api/search?q=${encodeURIComponent(searchParams.q)}`).then((r) => r.json()).catch(() => []);
  }
  const sectionFor = (type: string) => type === 'NewsPost' ? 'news' : type === 'Vacancy' ? 'vacancies' : type === 'InterviewNotice' ? 'interviews' : null;
  return (
    <>
      <h1>{t('searchResults')}</h1>
      <form method="get" aria-label="Search">
        <input name="q" defaultValue={searchParams.q ?? ''} placeholder={t('searchPlaceholder')} />
        <button type="submit">{t('search')}</button>
      </form>
      {results.length === 0 && <p>{t('noResults')}</p>}
      <ul className="notice-list">{results.map((r) => {
        const sec = sectionFor(r.type);
        const href = sec ? `/${locale}/${sec}/${r.slug}` : `/${locale}/${r.slug}`;
        return <li key={r.id}><Link href={href}>{r.title}</Link></li>;
      })}</ul>
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/[locale]/search
git commit -m "feat(web): site search page (REQ-SRCH-01/02)"
```

### Task 7.8: External links page (REQ-EXT-01/02)

**Files:**
- Create: `apps/web/src/app/[locale]/external-links/page.tsx`

- [ ] **Step 1: Write `apps/web/src/app/[locale]/external-links/page.tsx`** listing all external systems + partner institutions

```tsx
import { useTranslations } from 'next-intl';

const SYSTEMS = [
  { key: 'zanajiraPortal', href: 'https://portal.zanajira.go.tz/home' },
  { key: 'nationalAjira', href: 'https://www.ajira.go.tz/' },
  { key: 'eOffice', href: 'https://eoffice.zanzibar.go.tz/' },
  { key: 'hrms', href: 'https://hrms.zanzibar.go.tz/' },
  { key: 'staffMail', href: 'https://mail.zanzibar.go.tz/' },
  { key: 'salaryClaim', href: 'https://salary.zanzibar.go.tz/' },
];
const PARTNERS = [
  { key: 'ikulu', href: 'https://ikulu.go.tz/' },
  { key: 'egaz', href: 'https://egaz.go.tz/' },
  { key: 'zaeca', href: 'https://zaeca.go.tz/' },
  { key: 'zpsc', href: 'https://zpsc.go.tz/' },
  { key: 'ipa', href: 'https://ipa.go.tz/' },
];

export default function ExternalLinks({ params: { locale } }: { params: { locale: string } }) {
  const t = useTranslations('External');
  return (
    <>
      <h1>{locale === 'sw' ? 'Viungo vya Nje' : 'External Links'}</h1>
      <section><h2>{locale === 'sw' ? 'Mifumo inayohusiana' : 'Related systems'}</h2>
        <ul>{SYSTEMS.map((s) => <li key={s.key}><a href={s.href} rel="noopener">{t(s.key as any)}</a></li>)}</ul>
      </section>
      <section><h2>{locale === 'sw' ? 'Taasisi washirika' : 'Partner institutions'}</h2>
        <ul>{PARTNERS.map((p) => <li key={p.key}><a href={p.href} rel="noopener">{t(p.key as any)}</a></li>)}</ul>
      </section>
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/[locale]/external-links
git commit -m "feat(web): external links + partner institutions page (REQ-EXT-01/02)"
```

### Task 7.9: Accessibility + responsiveness pass (NFR 7.3)

- [ ] **Step 1: Add alt text + labels audit checklist** — verify every `<img>` has `alt`, every form input has a `<label>`, color contrast meets AA against the SMZ-blue background (white text on `#003366` passes; gold `#c9a227` on blue passes for large text). Run an automated check:

Run: `pnpm --filter @zanweb/web exec axe --url http://localhost:3000/sw` (add `axe-playwright` if not present)
Expected: zero critical violations on Home, News, Vacancy, Contact.

- [ ] **Step 2: Add `lang`/`dir` correctness** — confirm `<html lang>` matches locale (set in layout). For Swahili/English both are LTR; no `dir` needed.

- [ ] **Step 3: Commit**

```bash
git add apps/web
git commit -m "test(web): a11y + responsiveness verification (NFR 7.3)"
```

### Task 7.10: SEO metadata baseline (NFR 7.7)

- [ ] **Step 1: Add a root `metadata` export** in `apps/web/src/app/layout.tsx` (the root, not `[locale]`) with `metadataBase`, `openGraph`, and default `title.template` fallbacks.

- [ ] **Step 2: Verify SSR output** — `curl http://localhost:3000/sw/vacancies/<slug>` and confirm `<title>`, `<meta name="description">`, and the JSON-LD script render in the HTML source (not client-injected).

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/layout.tsx
git commit -m "feat(web): root metadata baseline + SSR SEO verification (NFR 7.7)"
```

---