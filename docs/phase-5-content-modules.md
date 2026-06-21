# Phase 5 — Content Modules (News, Vacancy, Interview) & Workflow

> Part of the **CSC Zanzibar Public Website** implementation plan. See [`CSC-ZNZ-WEB-Implementation-Plan.md`](./CSC-ZNZ-WEB-Implementation-Plan.md) for the overview. Depends on [Phase 4](./phase-4-documents.md).
>
> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans`.

**Milestone:** Editors can create News, Vacancy, and Interview entries (each with attached PDF + optional cover image), submit them for review; Reviewers approve/reject with comments; approved items are published with stable slugs and version history. Public listing endpoints are paginated, filterable, cached in Redis, and feed a site-wide search index. Closed vacancies are archived, not deleted.

**Requirements covered:** REQ-NEWS-01..04, REQ-VAC-01/02/04/05, REQ-INT-01..03, REQ-CMS-01..06, REQ-SRCH-01, NFR 7.1 (Redis cache), NFR 7.7 (human-readable URLs/slug). (REQ-VAC-03 auto-close and REQ-NEWS public UI live in Phase 7/9.)

### Shared foundation

The three modules share a workflow state machine, slug generation, version snapshots, and document attachment. Build the shared pieces first (Tasks 5.1–5.3), then each module (5.4 News, 5.5 Vacancy, 5.6 Interview), then search and cache (5.7–5.8).

### Task 5.1: Slug + cache helpers

**Files:**
- Create: `apps/api/src/common/slug.util.ts`
- Create: `apps/api/src/cache/cache.service.ts`
- Create: `apps/api/src/cache/cache.module.ts`

- [ ] **Step 1: Write the failing test `apps/api/src/common/slug.util.spec.ts`**

```typescript
import { slugify } from './slug.util';

describe('slugify', () => {
  it('lowercases, trims, replaces non-alnum with hyphens, collapses hyphens', () => {
    expect(slugify('Tangazo la Nafasi za Kazi 2026!')).toBe('tangazo-la-nafasi-za-kazi-2026');
  });
  it('strips leading/trailing hyphens', () => {
    expect(slugify('  --Hello World--  ')).toBe('hello-world');
  });
});
```

Run: `pnpm --filter @zanweb/api test src/common/slug.util.spec.ts`
Expected: FAIL.

- [ ] **Step 2: Implement `apps/api/src/common/slug.util.ts`**

```typescript
export function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function uniqueSlug(base: string, exists: (s: string) => Promise<boolean>): Promise<string> {
  let slug = base;
  let i = 2;
  while (await exists(slug)) { slug = `${base}-${i++}`; }
  return slug;
}
```

- [ ] **Step 3: Implement `apps/api/src/cache/cache.service.ts`** (Redis via ioredis)

```typescript
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class CacheService implements OnModuleInit {
  private redis: Redis;
  constructor(private config: ConfigService) {}

  onModuleInit() {
    this.redis = new Redis(this.config.get<string>('REDIS_URL')!);
  }

  async get<T>(key: string): Promise<T | null> {
    const raw = await this.redis.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  }

  async set(key: string, value: unknown, ttlSeconds = 300): Promise<void> {
    await this.redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  }

  async invalidate(prefix: string): Promise<void> {
    const keys = await this.redis.keys(`${prefix}*`);
    if (keys.length) await this.redis.del(...keys);
  }
}
```

- [ ] **Step 4: Implement `apps/api/src/cache/cache.module.ts`**

```typescript
import { Module, Global } from '@nestjs/common';
import { CacheService } from './cache.service';

@Global()
@Module({ providers: [CacheService], exports: [CacheService] })
export class CacheModule {}
```

- [ ] **Step 5: Wire `CacheModule` into `app.module.ts`**, run tests

Run: `pnpm --filter @zanweb/api test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/common/slug.util.ts apps/api/src/common/slug.util.spec.ts apps/api/src/cache apps/api/src/app.module.ts
git commit -m "feat(common): slug util and Redis cache service"
```

### Task 5.2: Content workflow state machine (REQ-CMS-02, REQ-CMS-03)

**Files:**
- Create: `apps/api/src/content/workflow.service.ts`
- Create: `apps/api/src/content/content.module.ts`

- [ ] **Step 1: Write the failing test `apps/api/src/content/workflow.service.spec.ts`**

```typescript
import { WorkflowService } from './workflow.service';
import { ContentStatus, UserRole } from '@zanweb/shared';
import { BadRequestException, ForbiddenException } from '@nestjs/common';

describe('WorkflowService', () => {
  const w = new WorkflowService();

  it('Editor can move Draft -> InReview', () => {
    expect(w.canTransition(UserRole.Editor, ContentStatus.Draft, ContentStatus.InReview)).toBe(true);
  });
  it('Editor cannot Publish', () => {
    expect(() => w.assertCanTransition(UserRole.Editor, ContentStatus.InReview, ContentStatus.Published))
      .toThrow(ForbiddenException);
  });
  it('Reviewer can Publish from InReview', () => {
    expect(w.canTransition(UserRole.Reviewer, ContentStatus.InReview, ContentStatus.Published)).toBe(true);
  });
  it('Reviewer can Reject from InReview', () => {
    expect(w.canTransition(UserRole.Reviewer, ContentStatus.InReview, ContentStatus.Rejected)).toBe(true);
  });
  it('cannot jump Draft -> Published', () => {
    expect(() => w.assertCanTransition(UserRole.Administrator, ContentStatus.Draft, ContentStatus.Published))
      .toThrow(BadRequestException);
  });
});
```

Run: `pnpm --filter @zanweb/api test src/content/workflow.service.spec.ts`
Expected: FAIL.

- [ ] **Step 2: Implement `apps/api/src/content/workflow.service.ts`**

```typescript
import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { ContentStatus, UserRole, VacancyStatus } from '@zanweb/shared';

@Injectable()
export class WorkflowService {
  // adjacency map: from -> { to -> roles allowed }
  private transitions: Record<string, Record<string, UserRole[]>> = {
    Draft: { InReview: [UserRole.Editor, UserRole.Administrator] },
    InReview: {
      Published: [UserRole.Reviewer, UserRole.Administrator],
      Rejected: [UserRole.Reviewer, UserRole.Administrator],
      Draft: [UserRole.Editor, UserRole.Administrator], // request changes
    },
    Rejected: { Draft: [UserRole.Editor, UserRole.Administrator], InReview: [UserRole.Editor, UserRole.Administrator] },
    Published: { Archived: [UserRole.Administrator] },
    Archived: { Published: [UserRole.Administrator] },
  };

  canTransition(role: UserRole, from: ContentStatus, to: ContentStatus): boolean {
    const allowed = this.transitions[from]?.[to];
    return !!allowed && allowed.includes(role);
  }

  assertCanTransition(role: UserRole, from: ContentStatus, to: ContentStatus): void {
    if (from === to) return;
    if (!this.transitions[from]) throw new BadRequestException(`No transitions from ${from}`);
    const allowed = this.transitions[from][to];
    if (!allowed) throw new BadRequestException(`Invalid transition ${from} -> ${to}`);
    if (!allowed.includes(role)) throw new ForbiddenException(`Role ${role} cannot ${from} -> ${to}`);
  }

  // Vacancy parallels ContentStatus for workflow; Closed/Archived handled by jobs
  vacancyToContent(v: VacancyStatus): ContentStatus {
    return v as unknown as ContentStatus; // Draft/InReview/Published/Rejected/Archived align
  }
}
```

- [ ] **Step 3: Implement `apps/api/src/content/content.module.ts`**

```typescript
import { Module, Global } from '@nestjs/common';
import { WorkflowService } from './workflow.service';
import { ContentVersionService } from './content-version.service';

@Global()
@Module({
  providers: [WorkflowService, ContentVersionService],
  exports: [WorkflowService, ContentVersionService],
})
export class ContentModule {}
```

- [ ] **Step 4: Run test**

Run: `pnpm --filter @zanweb/api test src/content/workflow.service.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/content/workflow.service.ts apps/api/src/content/workflow.service.spec.ts
git commit -m "feat(content): editorial workflow state machine (REQ-CMS-02/03)"
```

### Task 5.3: Content version snapshots (REQ-CMS-05)

**Files:**
- Create: `apps/api/src/content/content-version.service.ts`

- [ ] **Step 1: Implement `apps/api/src/content/content-version.service.ts`**

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ContentVersionService {
  constructor(private prisma: PrismaService) {}

  async snapshot(args: { entityType: string; entityId: string; data: Record<string, unknown>; authorId?: string }) {
    return this.prisma.contentVersion.create({
      data: {
        entityType: args.entityType,
        entityId: args.entityId,
        snapshot: args.data as any,
        authorId: args.authorId ?? null,
      },
    });
  }

  history(entityType: string, entityId: string) {
    return this.prisma.contentVersion.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/content/content-version.service.ts apps/api/src/content/content.module.ts
git commit -m "feat(content): version snapshots (REQ-CMS-05)"
```

### Task 5.4: News module (REQ-NEWS-01..04, REQ-CMS-01/04/06)

**Files:**
- Create: `apps/api/src/news/dto/create-news.dto.ts`
- Create: `apps/api/src/news/dto/update-news.dto.ts`
- Create: `apps/api/src/news/news.service.ts`
- Create: `apps/api/src/news/news.controller.ts`
- Create: `apps/api/src/news/news.module.ts`

- [ ] **Step 1: Write `apps/api/src/news/dto/create-news.dto.ts`**

```typescript
import { IsDateString, IsEnum, IsOptional, IsString, MinLength, MaxLength } from 'class-validator';
import { ContentStatus } from '@zanweb/shared';

export class CreateNewsDto {
  @IsString() @MinLength(3) @MaxLength(200) titleSw: string;
  @IsOptional() @IsString() @MaxLength(200) titleEn?: string;
  @IsString() @MinLength(3) bodySw: string;
  @IsOptional() @IsString() bodyEn?: string;
  @IsOptional() @IsDateString() publishDate?: string;
  @IsOptional() @IsString() coverImageKey?: string;
}
```

- [ ] **Step 2: Write `apps/api/src/news/dto/update-news.dto.ts`**

```typescript
import { PartialType } from '@nestjs/mapped-types';
import { CreateNewsDto } from './create-news.dto';
export class UpdateNewsDto extends PartialType(CreateNewsDto) {}
```

Add `"@nestjs/mapped-types": "^2.0.5"` to api deps.

- [ ] **Step 3: Write failing test `apps/api/src/news/news.service.spec.ts`**

```typescript
import { Test } from '@nestjs/testing';
import { NewsService } from './news.service';
import { PrismaService } from '../prisma/prisma.service';
import { WorkflowService } from '../content/workflow.service';
import { ContentVersionService } from '../content/content-version.service';
import { CacheService } from '../cache/cache.service';
import { AuditService } from '../audit/audit.service';
import { DocumentsService } from '../documents/documents.service';
import { ContentStatus, UserRole } from '@zanweb/shared';
import { ForbiddenException, BadRequestException } from '@nestjs/common';

describe('NewsService', () => {
  const prisma = {
    newsPost: {
      create: jest.fn().mockResolvedValue({ id: 'n1', slug: 's', status: ContentStatus.Draft }),
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
  };
  const workflow = new WorkflowService();
  const versions = { snapshot: jest.fn().mockResolvedValue({}), history: jest.fn() };
  const cache = { invalidate: jest.fn().mockResolvedValue({}) };
  const audit = { log: jest.fn().mockResolvedValue({}) };
  const docs = { listForOwner: jest.fn().mockResolvedValue([]) };
  let service: NewsService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        NewsService,
        { provide: PrismaService, useValue: prisma },
        { provide: WorkflowService, useValue: workflow },
        { provide: ContentVersionService, useValue: versions },
        { provide: CacheService, useValue: cache },
        { provide: AuditService, useValue: audit },
        { provide: DocumentsService, useValue: docs },
      ],
    }).compile();
    service = moduleRef.get(NewsService);
  });

  it('creates a draft news post with a unique slug', async () => {
    prisma.newsPost.findUnique.mockResolvedValue(null);
    const res = await service.create({ titleSw: 'Habari Mpya', bodySw: 'body' } as any, { id: 'u1', role: UserRole.Editor } as any);
    expect(res.id).toBe('n1');
    expect(prisma.newsPost.create).toHaveBeenCalled();
  });

  it('submitForReview moves Draft -> InReview for Editor', async () => {
    prisma.newsPost.findUnique.mockResolvedValue({ id: 'n1', status: ContentStatus.Draft, authorId: 'u1' });
    prisma.newsPost.update.mockResolvedValue({ id: 'n1', status: ContentStatus.InReview });
    const res = await service.transition('n1', ContentStatus.InReview, { id: 'u1', role: UserRole.Editor } as any);
    expect(res.status).toBe(ContentStatus.InReview);
  });

  it('Editor cannot publish', async () => {
    prisma.newsPost.findUnique.mockResolvedValue({ id: 'n1', status: ContentStatus.InReview, authorId: 'u1' });
    await expect(service.transition('n1', ContentStatus.Published, { id: 'u1', role: UserRole.Editor } as any))
      .rejects.toThrow(ForbiddenException);
  });

  it('cannot transition Draft -> Published directly', async () => {
    prisma.newsPost.findUnique.mockResolvedValue({ id: 'n1', status: ContentStatus.Draft, authorId: 'u1' });
    await expect(service.transition('n1', ContentStatus.Published, { id: 'u1', role: UserRole.Administrator } as any))
      .rejects.toThrow(BadRequestException);
  });
});
```

Run: `pnpm --filter @zanweb/api test src/news/news.service.spec.ts`
Expected: FAIL.

- [ ] **Step 4: Implement `apps/api/src/news/news.service.ts`**

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkflowService } from '../content/workflow.service';
import { ContentVersionService } from '../content/content-version.service';
import { CacheService } from '../cache/cache.service';
import { AuditService } from '../audit/audit.service';
import { DocumentsService } from '../documents/documents.service';
import { AuditAction, ContentStatus, UserRole } from '@zanweb/shared';
import { slugify, uniqueSlug } from '../common/slug.util';

@Injectable()
export class NewsService {
  constructor(
    private prisma: PrismaService,
    private workflow: WorkflowService,
    private versions: ContentVersionService,
    private cache: CacheService,
    private audit: AuditService,
    private docs: DocumentsService,
  ) {}

  async create(dto: any, user: { id: string; role: UserRole }) {
    const base = slugify(dto.titleSw);
    const slug = await uniqueSlug(base, (s) => this.prisma.newsPost.findUnique({ where: { slug: s } }).then(Boolean));
    const post = await this.prisma.newsPost.create({
      data: {
        slug,
        titleSw: dto.titleSw,
        titleEn: dto.titleEn ?? null,
        bodySw: dto.bodySw,
        bodyEn: dto.bodyEn ?? null,
        publishDate: dto.publishDate ? new Date(dto.publishDate) : new Date(),
        coverImageKey: dto.coverImageKey ?? null,
        status: ContentStatus.Draft,
        authorId: user.id,
      },
    });
    await this.versions.snapshot({ entityType: 'NewsPost', entityId: post.id, data: post as any, authorId: user.id });
    await this.audit.log({ userId: user.id, action: AuditAction.Create, entityType: 'NewsPost', entityId: post.id });
    return post;
  }

  async update(id: string, dto: any, user: { id: string; role: UserRole }) {
    const post = await this.findOneOrThrow(id);
    const updated = await this.prisma.newsPost.update({ where: { id }, data: { ...dto, bodyEn: dto.bodyEn ?? null, titleEn: dto.titleEn ?? null } });
    await this.versions.snapshot({ entityType: 'NewsPost', entityId: id, data: updated as any, authorId: user.id });
    await this.audit.log({ userId: user.id, action: AuditAction.Update, entityType: 'NewsPost', entityId: id });
    await this.cache.invalidate('news:');
    return updated;
  }

  async transition(id: string, to: ContentStatus, user: { id: string; role: UserRole }) {
    const post = await this.findOneOrThrow(id);
    this.workflow.assertCanTransition(user.role, post.status, to);
    const updated = await this.prisma.newsPost.update({ where: { id }, data: { status: to, reviewerId: user.id } });
    await this.versions.snapshot({ entityType: 'NewsPost', entityId: id, data: { status: to } as any, authorId: user.id });
    const action = to === ContentStatus.Published ? AuditAction.Publish : to === ContentStatus.Rejected ? AuditAction.Reject : AuditAction.Update;
    await this.audit.log({ userId: user.id, action, entityType: 'NewsPost', entityId: id });
    await this.cache.invalidate('news:');
    return updated;
  }

  // Public listing (REQ-NEWS-02, REQ-NEWS-03) — cached (NFR 7.1)
  async listPublic(args: { page: number; pageSize: number; dateFrom?: string; dateTo?: string; q?: string }) {
    const cacheKey = `news:list:${JSON.stringify(args)}`;
    const cached = await this.cache.get<any>(cacheKey);
    if (cached) return cached;

    const where = {
      status: ContentStatus.Published,
      publishDate: { lte: new Date() },
      ...(args.dateFrom || args.dateTo ? { publishDate: { gte: args.dateFrom ? new Date(args.dateFrom) : undefined, lte: args.dateTo ? new Date(args.dateTo) : new Date() } } : {}),
      ...(args.q ? { OR: [{ titleSw: { contains: args.q, mode: 'insensitive' } }, { titleEn: { contains: args.q, mode: 'insensitive' } }, { bodySw: { contains: args.q, mode: 'insensitive' } }] } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.newsPost.findMany({ where, orderBy: { publishDate: 'desc' }, skip: (args.page - 1) * args.pageSize, take: args.pageSize }),
      this.prisma.newsPost.count({ where }),
    ]);
    const result = { items, total, page: args.page, pageSize: args.pageSize };
    await this.cache.set(cacheKey, result, 300);
    return result;
  }

  async getBySlug(slug: string) { // REQ-NEWS-04 stable URL
    return this.prisma.newsPost.findUnique({ where: { slug } });
  }

  async history(id: string) { return this.versions.history('NewsPost', id); }

  private async findOneOrThrow(id: string) {
    const post = await this.prisma.newsPost.findUnique({ where: { id } });
    if (!post) throw new NotFoundException('News post not found');
    return post;
  }
}
```

- [ ] **Step 5: Implement `apps/api/src/news/news.controller.ts`**

```typescript
import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards, Req } from '@nestjs/common';
import { NewsService } from './news.service';
import { CreateNewsDto } from './dto/create-news.dto';
import { UpdateNewsDto } from './dto/update-news.dto';
import { ContentStatus } from '@zanweb/shared';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { Public } from '../auth/public.decorator';

@Controller('news')
export class NewsController {
  constructor(private news: NewsService) {}

  @Public()
  @Get()
  list(@Query('page') page = '1', @Query('pageSize') pageSize = '10', @Query('q') q?: string, @Query('dateFrom') dateFrom?: string, @Query('dateTo') dateTo?: string) {
    return this.news.listPublic({ page: Number(page), pageSize: Number(pageSize), q, dateFrom, dateTo });
  }

  @Public()
  @Get('by-slug/:slug')
  bySlug(@Param('slug') slug: string) { return this.news.getBySlug(slug); }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.Editor, UserRole.Administrator)
  create(@Body() dto: CreateNewsDto, @Req() req: any) { return this.news.create(dto, req.user); }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.Editor, UserRole.Administrator)
  update(@Param('id') id: string, @Body() dto: UpdateNewsDto, @Req() req: any) { return this.news.update(id, dto, req.user); }

  @Post(':id/transition')
  @UseGuards(RolesGuard)
  @Roles(UserRole.Editor, UserRole.Reviewer, UserRole.Administrator)
  transition(@Param('id') id: string, @Body() body: { to: ContentStatus }, @Req() req: any) {
    return this.news.transition(id, body.to, req.user);
  }

  @Get(':id/history')
  @UseGuards(RolesGuard)
  @Roles(UserRole.Editor, UserRole.Reviewer, UserRole.Administrator)
  history(@Param('id') id: string) { return this.news.history(id); }
}
```

Add `UserRole` import from `@zanweb/shared`.

- [ ] **Step 6: Implement `apps/api/src/news/news.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { NewsController } from './news.controller';
import { NewsService } from './news.service';

@Module({ controllers: [NewsController], providers: [NewsService], exports: [NewsService] })
export class NewsModule {}
```

- [ ] **Step 7: Wire `ContentModule`, `NewsModule` into `app.module.ts`**, run tests

Run: `pnpm --filter @zanweb/api test`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/news apps/api/src/content apps/api/src/app.module.ts apps/api/package.json
git commit -m "feat(news): CRUD + workflow + versions + cached public listing (REQ-NEWS, REQ-CMS)"
```

### Task 5.5: Vacancy module (REQ-VAC-01/02/04/05)

Vacancies differ from News by: `mda`, `closingDate`, `applyUrl` (deep-link to ZanAjira — REQ-VAC-04), `VacancyStatus` (adds `Closed`), and archive-not-delete (REQ-VAC-05). Auto-close is a scheduled job in Phase 9.

**Files:**
- Create: `apps/api/src/vacancies/dto/create-vacancy.dto.ts`
- Create: `apps/api/src/vacancies/dto/update-vacancy.dto.ts`
- Create: `apps/api/src/vacancies/vacancies.service.ts`
- Create: `apps/api/src/vacancies/vacancies.controller.ts`
- Create: `apps/api/src/vacancies/vacancies.module.ts`

- [ ] **Step 1: Write `apps/api/src/vacancies/dto/create-vacancy.dto.ts`**

```typescript
import { IsDateString, IsOptional, IsString, IsUrl, MinLength, MaxLength } from 'class-validator';

export class CreateVacancyDto {
  @IsString() @MinLength(3) @MaxLength(300) title: string;
  @IsString() @MaxLength(200) mda: string;
  @IsDateString() closingDate: string;
  @IsOptional() @IsDateString() publishDate?: string;
  @IsOptional() @IsUrl() applyUrl?: string;
  @IsOptional() @IsString() departmentId?: string;
}
```

- [ ] **Step 2: Write `apps/api/src/vacancies/dto/update-vacancy.dto.ts`**

```typescript
import { PartialType } from '@nestjs/mapped-types';
import { CreateVacancyDto } from './create-vacancy.dto';
export class UpdateVacancyDto extends PartialType(CreateVacancyDto) {}
```

- [ ] **Step 3: Implement `apps/api/src/vacancies/vacancies.service.ts`**

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkflowService } from '../content/workflow.service';
import { ContentVersionService } from '../content/content-version.service';
import { CacheService } from '../cache/cache.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction, UserRole, VacancyStatus } from '@zanweb/shared';
import { slugify, uniqueSlug } from '../common/slug.util';

@Injectable()
export class VacanciesService {
  constructor(
    private prisma: PrismaService,
    private workflow: WorkflowService,
    private versions: ContentVersionService,
    private cache: CacheService,
    private audit: AuditService,
  ) {}

  async create(dto: any, user: { id: string; role: UserRole }) {
    const base = slugify(dto.title);
    const slug = await uniqueSlug(base, (s) => this.prisma.vacancy.findUnique({ where: { slug: s } }).then(Boolean));
    const v = await this.prisma.vacancy.create({
      data: {
        slug, title: dto.title, mda: dto.mda, departmentId: dto.departmentId ?? null,
        publishDate: dto.publishDate ? new Date(dto.publishDate) : new Date(),
        closingDate: new Date(dto.closingDate),
        applyUrl: dto.applyUrl ?? null, status: VacancyStatus.Draft, authorId: user.id,
      },
    });
    await this.versions.snapshot({ entityType: 'Vacancy', entityId: v.id, data: v as any, authorId: user.id });
    await this.audit.log({ userId: user.id, action: AuditAction.Create, entityType: 'Vacancy', entityId: v.id });
    return v;
  }

  async update(id: string, dto: any, user: { id: string; role: UserRole }) {
    await this.findOneOrThrow(id);
    const updated = await this.prisma.vacancy.update({ where: { id }, data: { ...dto, closingDate: dto.closingDate ? new Date(dto.closingDate) : undefined } });
    await this.versions.snapshot({ entityType: 'Vacancy', entityId: id, data: updated as any, authorId: user.id });
    await this.audit.log({ userId: user.id, action: AuditAction.Update, entityType: 'Vacancy', entityId: id });
    await this.cache.invalidate('vacancies:');
    return updated;
  }

  async transition(id: string, to: VacancyStatus, user: { id: string; role: UserRole }) {
    const v = await this.findOneOrThrow(id);
    this.workflow.assertCanTransition(user.role, v.status as any, to as any);
    const updated = await this.prisma.vacancy.update({ where: { id }, data: { status: to, reviewerId: user.id } });
    await this.versions.snapshot({ entityType: 'Vacancy', entityId: id, data: { status: to } as any, authorId: user.id });
    const action = to === VacancyStatus.Published ? AuditAction.Publish : to === VacancyStatus.Archived ? AuditAction.Delete : AuditAction.Update;
    await this.audit.log({ userId: user.id, action, entityType: 'Vacancy', entityId: id });
    await this.cache.invalidate('vacancies:');
    return updated;
  }

  // REQ-VAC-02: filter by mda + status, paginated. REQ-VAC-05: closed kept & searchable.
  async listPublic(args: { page: number; pageSize: number; mda?: string; status?: VacancyStatus; q?: string }) {
    const cacheKey = `vacancies:list:${JSON.stringify(args)}`;
    const cached = await this.cache.get<any>(cacheKey);
    if (cached) return cached;

    const where = {
      status: args.status ?? { in: [VacancyStatus.Published, VacancyStatus.Closed] },
      ...(args.mda ? { mda: { contains: args.mda, mode: 'insensitive' } } : {}),
      ...(args.q ? { OR: [{ title: { contains: args.q, mode: 'insensitive' } }, { mda: { contains: args.q, mode: 'insensitive' } }] } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.vacancy.findMany({ where, orderBy: { publishDate: 'desc' }, skip: (args.page - 1) * args.pageSize, take: args.pageSize }),
      this.prisma.vacancy.count({ where }),
    ]);
    const result = { items, total, page: args.page, pageSize: args.pageSize };
    await this.cache.set(cacheKey, result, 300);
    return result;
  }

  async getBySlug(slug: string) { return this.prisma.vacancy.findUnique({ where: { slug } }); }
  async history(id: string) { return this.versions.history('Vacancy', id); }

  // used by the scheduled job in Phase 9 (REQ-VAC-03)
  async autoCloseExpired(now = new Date()) {
    return this.prisma.vacancy.updateMany({
      where: { status: VacancyStatus.Published, closingDate: { lt: now } },
      data: { status: VacancyStatus.Closed },
    });
  }

  private async findOneOrThrow(id: string) {
    const v = await this.prisma.vacancy.findUnique({ where: { id } });
    if (!v) throw new NotFoundException('Vacancy not found');
    return v;
  }
}
```

- [ ] **Step 4: Implement `apps/api/src/vacancies/vacancies.controller.ts`**

```typescript
import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { VacanciesService } from './vacancies.service';
import { CreateVacancyDto } from './dto/create-vacancy.dto';
import { UpdateVacancyDto } from './dto/update-vacancy.dto';
import { UserRole, VacancyStatus } from '@zanweb/shared';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { Public } from '../auth/public.decorator';

@Controller('vacancies')
export class VacanciesController {
  constructor(private vacancies: VacanciesService) {}

  @Public()
  @Get()
  list(@Query() q: Record<string, string>) {
    return this.vacancies.listPublic({
      page: Number(q.page ?? 1), pageSize: Number(q.pageSize ?? 10),
      mda: q.mda, status: q.status as VacancyStatus | undefined, q: q.q,
    });
  }

  @Public()
  @Get('by-slug/:slug')
  bySlug(@Param('slug') slug: string) { return this.vacancies.getBySlug(slug); }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.Editor, UserRole.Administrator)
  create(@Body() dto: CreateVacancyDto, @Req() req: any) { return this.vacancies.create(dto, req.user); }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.Editor, UserRole.Administrator)
  update(@Param('id') id: string, @Body() dto: UpdateVacancyDto, @Req() req: any) { return this.vacancies.update(id, dto, req.user); }

  @Post(':id/transition')
  @UseGuards(RolesGuard)
  @Roles(UserRole.Editor, UserRole.Reviewer, UserRole.Administrator)
  transition(@Param('id') id: string, @Body() body: { to: VacancyStatus }, @Req() req: any) {
    return this.vacancies.transition(id, body.to, req.user);
  }

  @Get(':id/history')
  @UseGuards(RolesGuard)
  @Roles(UserRole.Editor, UserRole.Reviewer, UserRole.Administrator)
  history(@Param('id') id: string) { return this.vacancies.history(id); }
}
```

- [ ] **Step 5: Implement `apps/api/src/vacancies/vacancies.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { VacanciesController } from './vacancies.controller';
import { VacanciesService } from './vacancies.service';

@Module({ controllers: [VacanciesController], providers: [VacanciesService], exports: [VacanciesService] })
export class VacanciesModule {}
```

- [ ] **Step 6: Write a service test mirroring the News test shape — `apps/api/src/vacancies/vacancies.service.spec.ts`**

Reuse the News test pattern: mock prisma (`vacancy` model), assert `create` builds a slug, `transition` enforces the workflow (Draft→Published via Editor must throw ForbiddenException; Administrator cannot jump Draft→Published directly — must go through InReview). Also assert `autoCloseExpired` calls `vacancy.updateMany` with `status: Published, closingDate lt now → Closed`.

Run: `pnpm --filter @zanweb/api test src/vacancies/vacancies.service.spec.ts`
Expected: PASS after implementation.

- [ ] **Step 7: Wire `VacanciesModule` into `app.module.ts`**, run full test suite

Run: `pnpm --filter @zanweb/api test`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/vacancies apps/api/src/app.module.ts
git commit -m "feat(vacancies): CRUD + workflow + MDA/status filters + archive (REQ-VAC-01/02/04/05)"
```

### Task 5.6: Interview module (REQ-INT-01/02/03)

Interviews differ by: `type` (`CallForInterview` | `InterviewResult` — REQ-INT-02), `mda`, and `ContentStatus`. Filter by `type` (REQ-INT-03).

**Files:**
- Create: `apps/api/src/interviews/dto/create-interview.dto.ts`
- Create: `apps/api/src/interviews/dto/update-interview.dto.ts`
- Create: `apps/api/src/interviews/interviews.service.ts`
- Create: `apps/api/src/interviews/interviews.controller.ts`
- Create: `apps/api/src/interviews/interviews.module.ts`

- [ ] **Step 1: Write `apps/api/src/interviews/dto/create-interview.dto.ts`**

```typescript
import { IsDateString, IsEnum, IsOptional, IsString, MinLength, MaxLength } from 'class-validator';
import { InterviewType } from '@zanweb/shared';

export class CreateInterviewDto {
  @IsString() @MinLength(3) @MaxLength(300) title: string;
  @IsString() @MaxLength(200) mda: string;
  @IsEnum(InterviewType) type: InterviewType;
  @IsOptional() @IsDateString() publishDate?: string;
  @IsOptional() @IsString() departmentId?: string;
}
```

- [ ] **Step 2: Write `apps/api/src/interviews/dto/update-interview.dto.ts`**

```typescript
import { PartialType } from '@nestjs/mapped-types';
import { CreateInterviewDto } from './create-interview.dto';
export class UpdateInterviewDto extends PartialType(CreateInterviewDto) {}
```

- [ ] **Step 3: Implement `apps/api/src/interviews/interviews.service.ts`**

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkflowService } from '../content/workflow.service';
import { ContentVersionService } from '../content/content-version.service';
import { CacheService } from '../cache/cache.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction, ContentStatus, InterviewType, UserRole } from '@zanweb/shared';
import { slugify, uniqueSlug } from '../common/slug.util';

@Injectable()
export class InterviewsService {
  constructor(
    private prisma: PrismaService,
    private workflow: WorkflowService,
    private versions: ContentVersionService,
    private cache: CacheService,
    private audit: AuditService,
  ) {}

  async create(dto: any, user: { id: string; role: UserRole }) {
    const base = slugify(`${dto.type === InterviewType.InterviewResult ? 'matokeo' : 'wito'}-${dto.title}`);
    const slug = await uniqueSlug(base, (s) => this.prisma.interviewNotice.findUnique({ where: { slug: s } }).then(Boolean));
    const n = await this.prisma.interviewNotice.create({
      data: {
        slug, title: dto.title, mda: dto.mda, type: dto.type, departmentId: dto.departmentId ?? null,
        publishDate: dto.publishDate ? new Date(dto.publishDate) : new Date(),
        status: ContentStatus.Draft, authorId: user.id,
      },
    });
    await this.versions.snapshot({ entityType: 'InterviewNotice', entityId: n.id, data: n as any, authorId: user.id });
    await this.audit.log({ userId: user.id, action: AuditAction.Create, entityType: 'InterviewNotice', entityId: n.id });
    return n;
  }

  async update(id: string, dto: any, user: { id: string; role: UserRole }) {
    await this.findOneOrThrow(id);
    const updated = await this.prisma.interviewNotice.update({ where: { id }, data: dto });
    await this.versions.snapshot({ entityType: 'InterviewNotice', entityId: id, data: updated as any, authorId: user.id });
    await this.audit.log({ userId: user.id, action: AuditAction.Update, entityType: 'InterviewNotice', entityId: id });
    await this.cache.invalidate('interviews:');
    return updated;
  }

  async transition(id: string, to: ContentStatus, user: { id: string; role: UserRole }) {
    const n = await this.findOneOrThrow(id);
    this.workflow.assertCanTransition(user.role, n.status, to);
    const updated = await this.prisma.interviewNotice.update({ where: { id }, data: { status: to, reviewerId: user.id } });
    await this.versions.snapshot({ entityType: 'InterviewNotice', entityId: id, data: { status: to } as any, authorId: user.id });
    const action = to === ContentStatus.Published ? AuditAction.Publish : to === ContentStatus.Rejected ? AuditAction.Reject : AuditAction.Update;
    await this.audit.log({ userId: user.id, action, entityType: 'InterviewNotice', entityId: id });
    await this.cache.invalidate('interviews:');
    return updated;
  }

  // REQ-INT-03: filterable paginated list, by type
  async listPublic(args: { page: number; pageSize: number; type?: InterviewType; mda?: string; q?: string }) {
    const cacheKey = `interviews:list:${JSON.stringify(args)}`;
    const cached = await this.cache.get<any>(cacheKey);
    if (cached) return cached;

    const where = {
      status: ContentStatus.Published,
      ...(args.type ? { type: args.type } : {}),
      ...(args.mda ? { mda: { contains: args.mda, mode: 'insensitive' } } : {}),
      ...(args.q ? { OR: [{ title: { contains: args.q, mode: 'insensitive' } }, { mda: { contains: args.q, mode: 'insensitive' } }] } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.interviewNotice.findMany({ where, orderBy: { publishDate: 'desc' }, skip: (args.page - 1) * args.pageSize, take: args.pageSize }),
      this.prisma.interviewNotice.count({ where }),
    ]);
    const result = { items, total, page: args.page, pageSize: args.pageSize };
    await this.cache.set(cacheKey, result, 300);
    return result;
  }

  async getBySlug(slug: string) { return this.prisma.interviewNotice.findUnique({ where: { slug } }); }
  async history(id: string) { return this.versions.history('InterviewNotice', id); }

  private async findOneOrThrow(id: string) {
    const n = await this.prisma.interviewNotice.findUnique({ where: { id } });
    if (!n) throw new NotFoundException('Interview notice not found');
    return n;
  }
}
```

- [ ] **Step 4: Implement `apps/api/src/interviews/interviews.controller.ts`**

```typescript
import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { InterviewsService } from './interviews.service';
import { CreateInterviewDto } from './dto/create-interview.dto';
import { UpdateInterviewDto } from './dto/update-interview.dto';
import { ContentStatus, InterviewType, UserRole } from '@zanweb/shared';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { Public } from '../auth/public.decorator';

@Controller('interviews')
export class InterviewsController {
  constructor(private interviews: InterviewsService) {}

  @Public()
  @Get()
  list(@Query() q: Record<string, string>) {
    return this.interviews.listPublic({
      page: Number(q.page ?? 1), pageSize: Number(q.pageSize ?? 10),
      type: q.type as InterviewType | undefined, mda: q.mda, q: q.q,
    });
  }

  @Public()
  @Get('by-slug/:slug')
  bySlug(@Param('slug') slug: string) { return this.interviews.getBySlug(slug); }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.Editor, UserRole.Administrator)
  create(@Body() dto: CreateInterviewDto, @Req() req: any) { return this.interviews.create(dto, req.user); }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.Editor, UserRole.Administrator)
  update(@Param('id') id: string, @Body() dto: UpdateInterviewDto, @Req() req: any) { return this.interviews.update(id, dto, req.user); }

  @Post(':id/transition')
  @UseGuards(RolesGuard)
  @Roles(UserRole.Editor, UserRole.Reviewer, UserRole.Administrator)
  transition(@Param('id') id: string, @Body() body: { to: ContentStatus }, @Req() req: any) {
    return this.interviews.transition(id, body.to, req.user);
  }

  @Get(':id/history')
  @UseGuards(RolesGuard)
  @Roles(UserRole.Editor, UserRole.Reviewer, UserRole.Administrator)
  history(@Param('id') id: string) { return this.interviews.history(id); }
}
```

- [ ] **Step 5: Implement `apps/api/src/interviews/interviews.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { InterviewsController } from './interviews.controller';
import { InterviewsService } from './interviews.service';

@Module({ controllers: [InterviewsController], providers: [InterviewsService], exports: [InterviewsService] })
export class InterviewsModule {}
```

- [ ] **Step 6: Write a service test mirroring News — `apps/api/src/interviews/interviews.service.spec.ts`**

Assert: `create` produces a slug prefixed `wito-` for `CallForInterview` and `matokeo-` for `InterviewResult`; workflow transitions enforced; `listPublic` filters by `type`.

Run: `pnpm --filter @zanweb/api test src/interviews/interviews.service.spec.ts`
Expected: PASS.

- [ ] **Step 7: Wire `InterviewsModule` into `app.module.ts`**, run full suite

Run: `pnpm --filter @zanweb/api test`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/interviews apps/api/src/app.module.ts
git commit -m "feat(interviews): CRUD + workflow + type filter (REQ-INT-01/02/03)"
```

### Task 5.7: Document attachment to content (REQ-CMS-06)

Attach uploaded documents to a content item by updating `Document.ownerId`/`ownerType` to the content id after the content is created.

- [ ] **Step 1: Add `attachDocuments` to `DocumentsService`**

```typescript
async attachDocuments(ownerType: string, ownerId: string, documentIds: string[]) {
  return this.prisma.document.updateMany({
    where: { id: { in: documentIds } },
    data: { ownerType, ownerId },
  });
}
```

- [ ] **Step 2: In each content service `create`, after creating the row, call attach** if `dto.documentIds` is provided. Add `@IsOptional() @IsArray() documentIds?: string[]` to each create DTO (import `IsArray`). Example for News, inside `create` after the `newsPost.create`:

```typescript
if (dto.documentIds?.length) {
  await this.docs.attachDocuments('NewsPost', post.id, dto.documentIds);
}
```

Inject `DocumentsService` into `VacanciesService` and `InterviewsService` as well (News already has it).

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/documents/documents.service.ts apps/api/src/news apps/api/src/vacancies apps/api/src/interviews
git commit -m "feat(content): attach uploaded PDFs to content entries (REQ-CMS-06)"
```

### Task 5.8: Search service (REQ-SRCH-01) — PostgreSQL full-text

**Files:**
- Create: `apps/api/src/search/search.service.ts`
- Create: `apps/api/src/search/search.controller.ts`
- Create: `apps/api/src/search/search.module.ts`

- [ ] **Step 1: Write the failing test `apps/api/src/search/search.service.spec.ts`**

```typescript
import { SearchService } from './search.service';
import { PrismaService } from '../prisma/prisma.service';

describe('SearchService.search', () => {
  it('queries all four content types with a published filter and a term', async () => {
    const $queryRaw = jest.fn().mockResolvedValue([{ id: 'n1', type: 'NewsPost', title: 'x', slug: 'x' }]);
    const prisma = { $queryRaw } as unknown as PrismaService;
    const service = new SearchService(prisma);
    const results = await service.search('tangazo', 10);
    expect(results.length).toBe(1);
    expect($queryRaw).toHaveBeenCalled();
    const sql = ($queryRaw.mock.calls[0][0] as any)?.strings?.join('') ?? '';
    expect(sql).toContain('NewsPost');
    expect(sql).toContain('Vacancy');
    expect(sql).toContain('InterviewNotice');
    expect(sql).toContain('Page');
  });
});
```

Run: `pnpm --filter @zanweb/api test src/search/search.service.spec.ts`
Expected: FAIL.

- [ ] **Step 2: Implement `apps/api/src/search/search.service.ts`**

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SearchService {
  constructor(private prisma: PrismaService) {}

  async search(term: string, limit = 20) {
    const rows = await this.prisma.$queryRaw`
      (SELECT id, 'NewsPost' AS type, slug, "titleSw" AS title, "publishDate" AS date FROM "NewsPost"
        WHERE status = 'Published' AND (to_tsvector('simple', coalesce("titleSw",'') || ' ' || coalesce("bodySw",'')) @@ plainto_tsquery('simple', ${term})))
      UNION ALL
      (SELECT id, 'Vacancy' AS type, slug, title, "publishDate" AS date FROM "Vacancy"
        WHERE status IN ('Published','Closed') AND (to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(mda,'')) @@ plainto_tsquery('simple', ${term})))
      UNION ALL
      (SELECT id, 'InterviewNotice' AS type, slug, title, "publishDate" AS date FROM "InterviewNotice"
        WHERE status = 'Published' AND (to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(mda,'')) @@ plainto_tsquery('simple', ${term})))
      UNION ALL
      (SELECT id, 'Page' AS type, slug, "titleSw" AS title, "updatedAt" AS date FROM "Page"
        WHERE (to_tsvector('simple', coalesce("titleSw",'') || ' ' || coalesce("bodySw",'')) @@ plainto_tsquery('simple', ${term})))
      ORDER BY date DESC NULLS LAST
      LIMIT ${limit};
    `;
    return rows;
  }
}
```

> Add a GIN index migration in a follow-up migration `search_indexes` for performance (REQ-SRCH-02): `CREATE INDEX ON "NewsPost" USING GIN (to_tsvector('simple', coalesce("titleSw",'') || ' ' || coalesce("bodySw",'')));` and equivalents for Vacancy, InterviewNotice, Page. Generate with `pnpm --filter @zanweb/prisma prisma migrate dev --name search_indexes`.

- [ ] **Step 3: Implement `apps/api/src/search/search.controller.ts`**

```typescript
import { Controller, Get, Query } from '@nestjs/common';
import { SearchService } from './search.service';
import { Public } from '../auth/public.decorator';

@Controller('search')
export class SearchController {
  constructor(private search: SearchService) {}

  @Public()
  @Get()
  search(@Query('q') q: string, @Query('limit') limit = '20') {
    return this.search.search(q ?? '', Number(limit));
  }
}
```

- [ ] **Step 4: Implement `apps/api/src/search/search.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';

@Module({ controllers: [SearchController], providers: [SearchService] })
export class SearchModule {}
```

- [ ] **Step 5: Wire `SearchModule` into `app.module.ts`**, run tests

Run: `pnpm --filter @zanweb/api test`
Expected: PASS.

- [ ] **Step 6: Add the GIN-index migration and commit**

Run: `pnpm --filter @zanweb/prisma prisma migrate dev --name search_indexes`

```bash
git add apps/api/src/search apps/api/src/app.module.ts packages/prisma/migrations
git commit -m "feat(search): site-wide full-text search across all content (REQ-SRCH-01/02)"
```

### Task 5.9: Scheduled-publish + revision-notes field (REQ-CMS-04)

- [ ] **Step 1: Add `scheduledPublishAt DateTime?` to `NewsPost`, `Vacancy`, `InterviewNotice`** via a new migration `scheduled_publish`. Update schema and `pnpm --filter @zanweb/prisma prisma migrate dev --name scheduled_publish`.

- [ ] **Step 2: In each `transition` to `Published`, if `scheduledPublishAt` is set in the future, keep `status` as-is and instead create a delayed BullMQ job** (queue wiring is Phase 9). For Phase 5, store `scheduledPublishAt` and let Phase 9's worker flip status at the scheduled time. Accept the field in the create/update DTOs (`@IsOptional() @IsDateString()`).

- [ ] **Step 3: Commit**

```bash
git add packages/prisma packages/prisma/schema.prisma packages/prisma/migrations apps/api/src/news apps/api/src/vacancies apps/api/src/interviews
git commit -m "feat(content): support scheduled publishing metadata (REQ-CMS-04)"
```

---