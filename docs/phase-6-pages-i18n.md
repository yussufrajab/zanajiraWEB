# Phase 6 — Static Pages & Internationalization

> Part of the **CSC Zanzibar Public Website** implementation plan. See [`CSC-ZNZ-WEB-Implementation-Plan.md`](./CSC-ZNZ-WEB-Implementation-Plan.md) for the overview. Depends on [Phase 5](./phase-5-content-modules.md).
>
> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans`.

**Milestone:** Every informational page from SRS Appendix A (Home, About Us + sub-pages, Organization Structure + sub-pages, Our Service, Contact Us) is stored as an editable bilingual `Page` row, admins can edit page text without code changes (REQ-PG-06), and all UI strings are translatable via `next-intl` message files (NFR 7.8). A `sitemap.xml` is generated.

**Requirements covered:** REQ-PG-01..06, REQ-I18N-01/02/03, NFR 7.8 (UI string translation), NFR 7.7 (sitemap/SEO plumbing for pages).

### Task 6.1: Pages API module (REQ-PG-06)

**Files:**
- Create: `apps/api/src/pages/dto/upsert-page.dto.ts`
- Create: `apps/api/src/pages/pages.service.ts`
- Create: `apps/api/src/pages/pages.controller.ts`
- Create: `apps/api/src/pages/pages.module.ts`

- [ ] **Step 1: Write `apps/api/src/pages/dto/upsert-page.dto.ts`**

```typescript
import { IsOptional, IsString, MinLength, MaxLength } from 'class-validator';

export class UpsertPageDto {
  @IsString() @MinLength(1) @MaxLength(200) slug: string;
  @IsString() @MinLength(1) @MaxLength(200) titleSw: string;
  @IsOptional() @IsString() @MaxLength(200) titleEn?: string;
  @IsString() @MinLength(1) bodySw: string;
  @IsOptional() @IsString() bodyEn?: string;
  @IsOptional() @IsString() parentId?: string;
}
```

- [ ] **Step 2: Write failing test `apps/api/src/pages/pages.service.spec.ts`**

```typescript
import { Test } from '@nestjs/testing';
import { PagesService } from './pages.service';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { AuditService } from '../audit/audit.service';
import { UserRole } from '@zanweb/shared';

describe('PagesService', () => {
  const prisma = {
    page: {
      upsert: jest.fn().mockResolvedValue({ id: 'p1', slug: 'about' }),
      findUnique: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
    },
  };
  const cache = { invalidate: jest.fn().mockResolvedValue({}), get: jest.fn().mockResolvedValue(null), set: jest.fn() };
  const audit = { log: jest.fn().mockResolvedValue({}) };
  let service: PagesService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        PagesService,
        { provide: PrismaService, useValue: prisma },
        { provide: CacheService, useValue: cache },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();
    service = moduleRef.get(PagesService);
  });

  it('upserts a page by slug', async () => {
    const res = await service.upsert({ slug: 'about', titleSw: 'Kuhutu', bodySw: 'body' }, { id: 'u1', role: UserRole.Administrator });
    expect(res.id).toBe('p1');
    expect(prisma.page.upsert).toHaveBeenCalled();
    expect(cache.invalidate).toHaveBeenCalledWith('pages:');
  });

  it('getBySlug returns cached if present', async () => {
    cache.get.mockResolvedValueOnce({ id: 'cached' });
    const res = await service.getBySlug('about');
    expect(res).toEqual({ id: 'cached' });
  });
});
```

Run: `pnpm --filter @zanweb/api test src/pages/pages.service.spec.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `apps/api/src/pages/pages.service.ts`**

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction, UserRole } from '@zanweb/shared';

@Injectable()
export class PagesService {
  constructor(private prisma: PrismaService, private cache: CacheService, private audit: AuditService) {}

  async upsert(dto: any, user: { id: string; role: UserRole }) {
    const page = await this.prisma.page.upsert({
      where: { slug: dto.slug },
      update: { titleSw: dto.titleSw, titleEn: dto.titleEn ?? null, bodySw: dto.bodySw, bodyEn: dto.bodyEn ?? null, parentId: dto.parentId ?? null },
      create: { slug: dto.slug, titleSw: dto.titleSw, titleEn: dto.titleEn ?? null, bodySw: dto.bodySw, bodyEn: dto.bodyEn ?? null, parentId: dto.parentId ?? null },
    });
    await this.audit.log({ userId: user.id, action: AuditAction.Update, entityType: 'Page', entityId: page.id });
    await this.cache.invalidate('pages:');
    return page;
  }

  async getBySlug(slug: string) {
    const cached = await this.cache.get<any>(`pages:slug:${slug}`);
    if (cached) return cached;
    const page = await this.prisma.page.findUnique({ where: { slug } });
    if (!page) throw new NotFoundException('Page not found');
    await this.cache.set(`pages:slug:${slug}`, page, 600);
    return page;
  }

  list() { return this.prisma.page.findMany({ orderBy: { slug: 'asc' } }); }

  tree() {
    return this.prisma.page.findMany({ where: { parentId: null }, include: { children: true }, orderBy: { slug: 'asc' } });
  }
}
```

- [ ] **Step 4: Implement `apps/api/src/pages/pages.controller.ts`**

```typescript
import { Body, Controller, Get, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { PagesService } from './pages.service';
import { UpsertPageDto } from './dto/upsert-page.dto';
import { UserRole } from '@zanweb/shared';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { Public } from '../auth/public.decorator';

@Controller('pages')
export class PagesController {
  constructor(private pages: PagesService) {}

  @Public()
  @Get('tree') tree() { return this.pages.tree(); }

  @Public()
  @Get('by-slug/:slug') bySlug(@Param('slug') slug: string) { return this.pages.getBySlug(slug); }

  @Get() @UseGuards(RolesGuard) @Roles(UserRole.Administrator) list() { return this.pages.list(); }

  @Put()
  @UseGuards(RolesGuard)
  @Roles(UserRole.Administrator)
  upsert(@Body() dto: UpsertPageDto, @Req() req: any) { return this.pages.upsert(dto, req.user); }
}
```

- [ ] **Step 5: Implement `apps/api/src/pages/pages.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { PagesController } from './pages.controller';
import { PagesService } from './pages.service';

@Module({ controllers: [PagesController], providers: [PagesService], exports: [PagesService] })
export class PagesModule {}
```

- [ ] **Step 6: Wire `PagesModule` into `app.module.ts`**, run tests

Run: `pnpm --filter @zanweb/api test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/pages apps/api/src/app.module.ts
git commit -m "feat(pages): bilingual static-page CRUD (REQ-PG-06)"
```

### Task 6.2: Seed default pages from SRS Appendix A (REQ-PG-02..05)

**Files:**
- Modify: `packages/prisma/seed.ts`

- [ ] **Step 1: Append default page seeding to `seed.ts`** (after departments):

```typescript
const defaultPages = [
  { slug: 'about', titleSw: 'Kuhutu Sisi', titleEn: 'About Us', bodySw: '', bodyEn: '' },
  { slug: 'about/introduction', titleSw: 'Utangulizi', titleEn: 'Introduction', bodySw: '', bodyEn: '', parentSlug: 'about' },
  { slug: 'about/mission-vision', titleSw: 'Dhamira na Maono', titleEn: 'Mission & Vision', bodySw: '', bodyEn: '', parentSlug: 'about' },
  { slug: 'about/core-functions', titleSw: 'Kazi Kuu', titleEn: 'Core Functions', bodySw: '', bodyEn: '', parentSlug: 'about' },
  { slug: 'organization', titleSw: 'Muundo wa Shirika', titleEn: 'Organization Structure', bodySw: '', bodyEn: '' },
  { slug: 'organization/board', titleSw: 'Bodi', titleEn: 'Board', bodySw: '', bodyEn: '', parentSlug: 'organization' },
  { slug: 'organization/department', titleSw: 'Idara', titleEn: 'Department', bodySw: '', bodyEn: '', parentSlug: 'organization' },
  { slug: 'organization/unit-division', titleSw: 'Kitengo & Tawi', titleEn: 'Unit & Division', bodySw: '', bodyEn: '', parentSlug: 'organization' },
  { slug: 'organization/chart', titleSw: 'Chatu ya Shirika', titleEn: 'Organization Chart', bodySw: '', bodyEn: '', parentSlug: 'organization' },
  { slug: 'services', titleSw: 'Huduma Zetu', titleEn: 'Our Services', bodySw: '', bodyEn: '' },
  { slug: 'contact', titleSw: 'Wasiliana Nasi', titleEn: 'Contact Us', bodySw: '', bodyEn: '' },
];

for (const p of defaultPages) {
  let parentId: string | null = null;
  if (p.parentSlug) {
    const parent = await prisma.page.findUnique({ where: { slug: p.parentSlug } });
    parentId = parent?.id ?? null;
  }
  await prisma.page.upsert({
    where: { slug: p.slug },
    update: {},
    create: { slug: p.slug, titleSw: p.titleSw, titleEn: p.titleEn, bodySw: p.bodySw, bodyEn: p.bodyEn, parentId },
  });
}
console.log('Default pages seeded.');
```

- [ ] **Step 2: Run seed**

Run: `pnpm --filter @zanweb/prisma prisma:seed`
Expected: `Default pages seeded.` and 11 `Page` rows.

- [ ] **Step 3: Commit**

```bash
git add packages/prisma/seed.ts
git commit -m "feat(prisma): seed default pages from SRS Appendix A (REQ-PG-02..05)"
```

### Task 6.3: UI string translation resources (NFR 7.8, REQ-I18N-01)

**Files:**
- Modify: `apps/web/messages/sw.json`
- Modify: `apps/web/messages/en.json`

- [ ] **Step 1: Expand `sw.json`** with all UI strings used by the public site:

```json
{
  "Home": { "title": "Tume ya Utumishi wa Umma – Zanzibar", "welcome": "Karibu kwenye tovuti rasmi ya Tume ya Utumishi wa Umma Zanzibar.", "latestNews": "Habari Mpya", "latestVacancies": "Tangazo la Nafasi za Kazi" },
  "Nav": { "about": "Kuhutu Sisi", "organization": "Muundo wa Shirika", "services": "Huduma Zetu", "contact": "Wasiliana Nasi", "news": "Habari", "vacancies": "Tangazo la Nafasi za Kazi", "interviews": "Wito wa Usaili", "search": "Tafuta", "externalLinks": "Viungo vya Nje", "staffServices": "Huduma za Wafanyakazi" },
  "Lang": { "switch": "English" },
  "Common": { "publishedOn": "Imechapishwa", "closingDate": "Tarehe ya Mwisho", "closed": "Imefungwa", "open": "Wazi", "download": "Pakua", "notTranslated": "Haijatafsiriwa bado", "readMore": "Soma Zaidi", "searchPlaceholder": "Tafuta tovuti...", "searchResults": "Matokeo ya Utafutaji", "noResults": "Hakuna matokeo", "applyHere": "Omba Hapa" },
  "Contact": { "address": "Anuani", "phone": "Simu", "email": "Barua Pepe", "map": "Ramani" },
  "External": { "zanajiraPortal": "Lango la Maombi la ZanAjira", "nationalAjira": "Lango la Ajira Taifa", "eOffice": "e-Office", "hrms": "HRMS", "staffMail": "Barua Pepe ya Wafanyakazi", "salaryClaim": "Daawa ya Mshahara", "ikulu": "Ikulu Zanzibar", "egaz": "eGAZ", "zaeca": "ZAECA", "zpsc": "ZPSC", "ipa": "IPA" }
}
```

- [ ] **Step 2: Expand `en.json`** with matching keys/values in English (mirror the structure above with English text).

- [ ] **Step 3: Commit**

```bash
git add apps/web/messages
git commit -m "feat(web): full bilingual UI string resources (NFR 7.8, REQ-I18N-01)"
```

### Task 6.4: Sitemap + robots (NFR 7.7)

**Files:**
- Create: `apps/web/src/app/sitemap.ts`
- Create: `apps/web/src/app/robots.ts`

- [ ] **Step 1: Write `apps/web/src/app/sitemap.ts`**

```typescript
import type { MetadataRoute } from 'next';
import { locales, defaultLocale } from '../i18n';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const apiBase = process.env.API_BASE_URL ?? 'http://localhost:4000';
  const staticSlugs = ['about', 'organization', 'services', 'contact'];
  const lastModified = new Date(2026, 5, 21); // fixed seed date; no Date.now() in build

  const entries: MetadataRoute.Sitemap = [];
  for (const slug of staticSlugs) {
    for (const locale of locales) {
      entries.push({ url: `${process.env.WEB_BASE_URL}/${locale}/${slug}`, lastModified, changeFrequency: 'monthly', priority: 0.7 });
    }
  }
  // dynamic listings
  for (const section of ['news', 'vacancies', 'interviews']) {
    for (const locale of locales) {
      entries.push({ url: `${process.env.WEB_BASE_URL}/${locale}/${section}`, lastModified, changeFrequency: 'daily', priority: 0.8 });
    }
  }
  return entries;
}
```

- [ ] **Step 2: Write `apps/web/src/app/robots.ts`**

```typescript
import type { MetadataRoute } from 'next';
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin'] }],
    sitemap: `${process.env.WEB_BASE_URL}/sitemap.xml`,
  };
}
```

- [ ] **Step 3: Build to verify sitemap emits**

Run: `pnpm --filter @zanweb/web build`
Expected: build succeeds; `sitemap.xml` and `robots.txt` generated in `.next` output.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/sitemap.ts apps/web/src/app/robots.ts
git commit -m "feat(web): sitemap.xml and robots.txt (NFR 7.7)"
```

### Task 6.5: Bilingual content fallback helper (REQ-I18N-02)

**Files:**
- Create: `apps/web/src/lib/i18n-content.ts`

- [ ] **Step 1: Write `apps/web/src/lib/i18n-content.ts`**

```typescript
export function localizedField(sw: string | null, en: string | null | undefined, locale: 'sw' | 'en') {
  if (locale === 'en' && en) return { text: en, translated: true as const };
  if (locale === 'en' && !en && sw) return { text: sw, translated: false as const };
  return { text: sw ?? '', translated: true as const };
}
```

- [ ] **Step 2: Write the test `apps/web/src/lib/i18n-content.spec.ts`**

```tsx
import { describe, it, expect } from 'vitest';
import { localizedField } from './i18n-content';

describe('localizedField', () => {
  it('returns English when present', () => {
    expect(localizedField('sw', 'en', 'en')).toEqual({ text: 'en', translated: true });
  });
  it('falls back to Swahili with not-translated flag', () => {
    expect(localizedField('sw', null, 'en')).toEqual({ text: 'sw', translated: false });
  });
  it('returns Swahili for sw locale', () => {
    expect(localizedField('sw', 'en', 'sw')).toEqual({ text: 'sw', translated: true });
  });
});
```

Run: `pnpm --filter @zanweb/web test`
Expected: PASS. The `translated: false` flag drives the "not yet translated" indicator in Phase 7 (REQ-I18N-02).

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/lib/i18n-content.ts apps/web/src/lib/i18n-content.spec.ts
git commit -m "feat(web): bilingual content fallback helper (REQ-I18N-02)"
```

---