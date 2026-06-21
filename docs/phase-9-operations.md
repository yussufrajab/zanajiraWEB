# Phase 9 — Operations (Notifications, Jobs, Analytics, Migration, Deploy)

> Part of the **CSC Zanzibar Public Website** implementation plan. See [`CSC-ZNZ-WEB-Implementation-Plan.md`](./CSC-ZNZ-WEB-Implementation-Plan.md) for the overview. Depends on [Phase 8](./phase-8-admin-frontend.md).
>
> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans`.

**Milestone:** Background workers send editorial email notifications, auto-close expired vacancies at midnight, generate PDF thumbnails, and an analytics endpoint powers the admin reporting dashboard. A documented WordPress→new-system migration script moves existing pages and PDFs. The whole stack deploys to a bare-metal server / VM (no Docker) behind an on-host Nginx reverse proxy, with native daily backups and a recovery runbook. Training material is written.

**Requirements covered:** REQ-NTF-01/02/03, REQ-VAC-03 (auto-close), REQ-RPT-01/02, SRS §8 (hosting/deploy, backup/DR, training/migration), NFR 7.4 (uptime/backup).

### Task 9.1: Queue module (BullMQ + Redis)

**Files:**
- Create: `apps/api/src/queue/queue.module.ts`
- Create: `apps/api/src/queue/queue.constants.ts`

- [ ] **Step 1: Write `apps/api/src/queue/queue.constants.ts`**

```typescript
export const QUEUES = {
  notifications: 'notifications',
  vacancyExpiry: 'vacancy-expiry',
  pdfThumbnail: 'pdf-thumbnail',
} as const;
```

- [ ] **Step 2: Write `apps/api/src/queue/queue.module.ts`**

```typescript
import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { NotificationsProcessor } from './notifications.processor';
import { VacancyExpiryProcessor } from './vacancy-expiry.processor';
import { PdfThumbnailProcessor } from './pdf-thumbnail.processor';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (c: ConfigService) => ({ connection: { url: c.get<string>('REDIS_URL') } }),
    }),
    BullModule.registerQueue(
      { name: 'notifications' },
      { name: 'vacancy-expiry' },
      { name: 'pdf-thumbnail' },
    ),
  ],
  providers: [NotificationsProcessor, VacancyExpiryProcessor, PdfThumbnailProcessor],
  exports: [BullModule],
})
export class QueueModule {}
```

Add `"@nestjs/bullmq": "^10.0.1"` and `"bullmq": "^5.7.0"` (bullmq already present) to api deps.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/queue/queue.module.ts apps/api/src/queue/queue.constants.ts apps/api/package.json
git commit -m "feat(queue): BullMQ queue module"
```

### Task 9.2: Email notifications (REQ-NTF-01/02)

**Files:**
- Create: `apps/api/src/notifications/mail.service.ts`
- Create: `apps/api/src/notifications/notifications.module.ts`
- Create: `apps/api/src/queue/notifications.processor.ts`
- Modify: content services to enqueue on transitions

- [ ] **Step 1: Write `apps/api/src/notifications/mail.service.ts`** (nodemailer SMTP)

```typescript
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService implements OnModuleInit {
  private transport!: nodemailer.Transporter;

  constructor(private config: ConfigService) {}

  onModuleInit() {
    this.transport = nodemailer.createTransport({
      host: this.config.get<string>('SMTP_HOST'),
      port: Number(this.config.get<string>('SMTP_PORT') ?? 587),
      auth: { user: this.config.get<string>('SMTP_USER'), pass: this.config.get<string>('SMTP_PASSWORD') },
    });
  }

  async send(to: string, subject: string, text: string) {
    await this.transport.sendMail({
      from: this.config.get<string>('SMTP_FROM')!,
      to, subject, text,
    });
  }
}
```

- [ ] **Step 2: Write `apps/api/src/notifications/notifications.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { MailService } from './mail.service';
@Module({ providers: [MailService], exports: [MailService] })
export class NotificationsModule {}
```

- [ ] **Step 3: Write `apps/api/src/queue/notifications.processor.ts`**

```typescript
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { MailService } from '../notifications/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { QUEUES } from './queue.constants';

@Processor(QUEUES.notifications)
@Injectable()
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);
  constructor(private mail: MailService, private prisma: PrismaService) { super(); }

  async process(job: Job<{ kind: 'submitted' | 'approved' | 'rejected' | 'published'; entityType: string; entityId: string; actorId: string }>) {
    const { kind, entityType, entityId, actorId } = job.data;
    const entity = await this.load(entityType, entityId);
    if (!entity) return;
    if (kind === 'submitted') {
      // REQ-NTF-01: notify reviewers
      const reviewers = await this.prisma.user.findMany({ where: { role: 'Reviewer', status: 'Active' } });
      for (const r of reviewers) {
        await this.mail.send(r.email, `Content submitted for review: ${entity.title ?? entity.titleSw}`, `Review ${entityType} ${entityId}.`);
      }
    } else {
      // REQ-NTF-02: notify originating editor
      const author = await this.prisma.user.findUnique({ where: { id: entity.authorId ?? actorId } });
      if (author) await this.mail.send(author.email, `Your content was ${kind}: ${entity.title ?? entity.titleSw}`, `${entityType} ${entityId} is now ${kind}.`);
    }
    this.logger.log(`notification ${kind} for ${entityType}:${entityId}`);
  }

  private async load(entityType: string, entityId: string) {
    switch (entityType) {
      case 'NewsPost': return this.prisma.newsPost.findUnique({ where: { id: entityId } });
      case 'Vacancy': return this.prisma.vacancy.findUnique({ where: { id: entityId } });
      case 'InterviewNotice': return this.prisma.interviewNotice.findUnique({ where: { id: entityId } });
      default: return null;
    }
  }
}
```

- [ ] **Step 4: Enqueue from content transitions** — inject `Queue` into each content service and on transition add a job. Example for News (add to `transition` before returning):

```typescript
await this.notificationsQueue.add('notify', { kind: to === ContentStatus.InReview ? 'submitted' : to === ContentStatus.Published ? 'published' : to === ContentStatus.Rejected ? 'rejected' : 'approved', entityType: 'NewsPost', entityId: id, actorId: user.id });
```

Inject via `@InjectQueue(QUEUES.notifications) private notificationsQueue: Queue`. Do the same in Vacancies (entityType `Vacancy`) and Interviews (entityType `InterviewNotice`). Wire `QueueModule` + `NotificationsModule` into `app.module.ts`.

- [ ] **Step 5: Write test `apps/api/src/queue/notifications.processor.spec.ts`** mocking `MailService` and `PrismaService`; assert `submitted` emails all Reviewers and `published` emails the author.

Run: `pnpm --filter @zanweb/api test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/notifications apps/api/src/queue apps/api/src/news apps/api/src/vacancies apps/api/src/interviews apps/api/src/app.module.ts
git commit -m "feat(notifications): editorial email notifications (REQ-NTF-01/02)"
```

### Task 9.3: Vacancy auto-close scheduled job (REQ-VAC-03)

**Files:**
- Create: `apps/api/src/queue/vacancy-expiry.processor.ts`
- Create: `apps/api/src/queue/scheduler.service.ts`

- [ ] **Step 1: Write `apps/api/src/queue/vacancy-expiry.processor.ts`**

```typescript
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { VacanciesService } from '../vacancies/vacancies.service';
import { QUEUES } from './queue.constants';

@Processor(QUEUES.vacancyExpiry)
@Injectable()
export class VacancyExpiryProcessor extends WorkerHost {
  private readonly logger = new Logger(VacancyExpiryProcessor.name);
  constructor(private vacancies: VacanciesService) { super(); }

  async process(_job: Job) {
    const result = await this.vacancies.autoCloseExpired();
    this.logger.log(`Auto-closed ${result.count} expired vacancies`);
  }
}
```

- [ ] **Step 2: Write `apps/api/src/queue/scheduler.service.ts`** (repeatable job at 00:05 daily)

```typescript
import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUES } from './queue.constants';

@Injectable()
export class SchedulerService implements OnModuleInit {
  private readonly logger = new Logger(SchedulerService.name);
  constructor(@InjectQueue(QUEUES.vacancyExpiry) private queue: Queue) {}

  async onModuleInit() {
    await this.queue.add('expire-check', {}, { repeat: { pattern: '5 0 * * *' } });
    this.logger.log('Scheduled vacancy expiry job for 00:05 daily');
  }
}
```

Add `SchedulerService` to `QueueModule` providers. Wire `QueueModule` into `app.module.ts` (done in 9.2).

- [ ] **Step 3: Write test asserting `autoCloseExpired` is invoked** — `apps/api/src/queue/vacancy-expiry.processor.spec.ts` mocks `VacanciesService` and asserts `process()` calls `autoCloseExpired()`.

Run: `pnpm --filter @zanweb/api test`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/queue apps/api/src/app.module.ts
git commit -m "feat(vacancies): scheduled auto-close of expired vacancies (REQ-VAC-03)"
```

### Task 9.4: PDF thumbnail job (cache/queue benefit)

**Files:**
- Create: `apps/api/src/queue/pdf-thumbnail.processor.ts`

- [ ] **Step 1: Write `apps/api/src/queue/pdf-thumbnail.processor.ts`** (generates a first-page thumbnail for cover-less news using a PDF renderer; store under MinIO and set `coverImageKey`). Use `pdf-lib`/`pdf2pic` — add `"pdf2pic": "^3.1.3"`.

```typescript
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { StorageService } from '../documents/storage.service';
import { PrismaService } from '../prisma/prisma.service';
import { QUEUES } from './queue.constants';
import { fromPath } from 'pdf2pic';
import * as tmp from 'tmp';
import { readFile } from 'fs/promises';

@Processor(QUEUES.pdfThumbnail)
@Injectable()
export class PdfThumbnailProcessor extends WorkerHost {
  private readonly logger = new Logger(PdfThumbnailProcessor.name);
  constructor(private storage: StorageService, private prisma: PrismaService) { super(); }

  async process(job: Job<{ documentId: string; ownerType: string; ownerId: string }>) {
    const doc = await this.prisma.document.findUnique({ where: { id: job.data.documentId } });
    if (!doc || !doc.mimeType.includes('pdf')) return;
    const stream = await this.storage.getStream(doc.storageKey);
    const buf = await streamToBuffer(stream);
    const tmpFile = tmp.fileSync({ postfix: '.pdf' });
    await writeFile(tmpFile.fd, buf);
    const convert = fromPath(tmpFile.name, { width: 800, height: 600, format: 'png' });
    const res = await convert(1, { response: false });
    const png = await readFile(res.path);
    const key = this.storage.buildKey(job.data.ownerType, job.data.ownerId, `${doc.filename}-thumb.png`);
    await this.storage.put(key, png, 'image/png');
    if (job.data.ownerType === 'NewsPost') {
      await this.prisma.newsPost.update({ where: { id: job.data.ownerId }, data: { coverImageKey: key } });
    }
    tmpFile.removeCallback();
    this.logger.log(`thumbnail generated for ${doc.filename}`);
  }
}

async function streamToBuffer(stream: import('stream').Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const c of stream) chunks.push(c as Buffer);
  return Buffer.concat(chunks);
}
import { writeFile } from 'fs/promises';
```

> Fix imports: move `import { writeFile } from 'fs/promises';` to the top of the file (don't leave it at the bottom). This is a best-effort enhancement; if `pdf2pic` (which needs GraphicsMagick/ImageMagick) is unavailable in the deploy environment, mark this job optional and skip.

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/queue/pdf-thumbnail.processor.ts apps/api/package.json
git commit -m "feat(queue): PDF first-page thumbnail generation"
```

### Task 9.5: Public subscriber notifications (REQ-NTF-03) — Low priority

- [ ] **Step 1: Add `POST /api/subscribers` (public) and `GET /api/subscribers` (admin)** to a new `SubscribersModule`: public endpoint accepts `{ email, criteria }`, writes a `Subscriber` row; admin lists. Validate email; dedupe.

- [ ] **Step 2: Extend `NotificationsProcessor`** with a `newVacancy` kind: when a vacancy is published, query `Subscriber` rows whose `criteria` matches the MDA/keyword and email them. Gate behind a feature flag env `ENABLE_SUBSCRIBER_NOTIFY=true` (it's Low priority — default off to avoid spam).

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/subscribers apps/api/src/queue/notifications.processor.ts
git commit -m "feat(notifications): optional public vacancy subscriber emails (REQ-NTF-03)"
```

### Task 9.6: Analytics + reporting (REQ-RPT-01/02)

**Files:**
- Create: `apps/api/src/analytics/analytics.service.ts`
- Create: `apps/api/src/analytics/analytics.controller.ts`
- Create: `apps/api/src/analytics/analytics.module.ts`
- Create: `apps/api/src/analytics/page-view.interceptor.ts`

- [ ] **Step 1: Write `apps/api/src/analytics/analytics.service.ts`**

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  recordPageView(path: string, locale: string) {
    return this.prisma.pageView.create({ data: { path, locale } });
  }

  recordDownload(documentId: string) {
    return this.prisma.documentDownload.create({ data: { documentId } });
  }

  // REQ-RPT-02 dashboard summary
  async dashboard() {
    const [byMonth, byMda, topDocs] = await Promise.all([
      this.prisma.$queryRaw`
        SELECT to_char(date_trunc('month', "publishDate"), 'YYYY-MM') AS month,
               COUNT(*) AS count
        FROM (SELECT "publishDate" FROM "NewsPost" WHERE status='Published'
              UNION ALL SELECT "publishDate" FROM "Vacancy" WHERE status IN ('Published','Closed')
              UNION ALL SELECT "publishDate" FROM "InterviewNotice" WHERE status='Published') p
        GROUP BY 1 ORDER BY 1 DESC LIMIT 12`,
      this.prisma.vacancy.groupBy({ by: ['mda'], where: { status: { in: ['Published', 'Closed'] } }, _count: true, orderBy: { _count: { mda: 'desc' } }, take: 10 }),
      this.prisma.document.findMany({ orderBy: { downloadCount: 'desc' }, take: 10, select: { id: true, filename: true, downloadCount: true } }),
    ]);
    return { byMonth, byMda, topDocs };
  }
}
```

- [ ] **Step 2: Write `apps/api/src/analytics/page-view.interceptor.ts`** to record a page view for public GET routes (insert into `PageView` non-blocking). Apply as `APP_INTERCEPTOR` in `analytics.module.ts`.

```typescript
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { AnalyticsService } from './analytics.service';

@Injectable()
export class PageViewInterceptor implements NestInterceptor {
  constructor(private analytics: AnalyticsService) {}
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest<{ method: string; path: string; user?: any }>();
    return next.handle().pipe(tap(() => {
      if (req.method === 'GET' && !req.path.startsWith('/api/admin') && !req.path.startsWith('/api/health')) {
        const locale = (req.path.match(/^\/api\/(sw|en)/) ?? [])[1] ?? 'sw';
        this.analytics.recordPageView(req.path, locale).catch(() => {});
      }
    }));
  }
}
```

> Note: `req.path` works under Express. Adapt to the `@nestjs/platform-express` default. The interceptor runs on the API, recording API-path views; for true page-view tracking use the Next.js `reportWebVitals`/a lightweight beacon to a public `POST /api/analytics/page-view`. Add that public endpoint and call it from the Next.js layout via a client component if more accurate path tracking is wanted.

- [ ] **Step 3: Write `apps/api/src/analytics/analytics.controller.ts`**

```typescript
import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { Public } from '../auth/public.decorator';
import { UserRole } from '@zanweb/shared';

@Controller('analytics')
export class AnalyticsController {
  constructor(private analytics: AnalyticsService) {}

  @Public()
  @Post('page-view')
  pageView(@Body() body: { path: string; locale: string }) { return this.analytics.recordPageView(body.path, body.locale); }

  @Get('dashboard')
  @UseGuards(RolesGuard)
  @Roles(UserRole.Administrator)
  dashboard() { return this.analytics.dashboard(); }
}
```

- [ ] **Step 4: Write `apps/api/src/analytics/analytics.module.ts`**, wire into `app.module.ts` with `APP_INTERCEPTOR`

```typescript
import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { PageViewInterceptor } from './page-view.interceptor';

@Module({
  controllers: [AnalyticsController],
  providers: [AnalyticsService, PageViewInterceptor],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
```

In `app.module.ts`: `providers: [{ provide: APP_GUARD, useClass: JwtAuthGuard }, { provide: APP_INTERCEPTOR, useClass: PageViewInterceptor }]` (add `APP_INTERCEPTOR` import from `@nestjs/core`).

- [ ] **Step 5: Wire the dashboard into the admin UI** — replace Phase 8 Task 8.2 dashboard body with a fetch to `/api/analytics/dashboard` and render the three summary tables (byMonth, byMda, topDocs).

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/analytics apps/api/src/app.module.ts apps/web/src/app/admin/dashboard
git commit -m "feat(analytics): page views + document downloads + admin dashboard (REQ-RPT-01/02)"
```

### Task 9.7: WordPress content migration (SRS §8.3)

**Files:**
- Create: `scripts/migrate-wordpress.ts`
- Create: `docs/migration-runbook.md`

- [ ] **Step 1: Write `scripts/migrate-wordpress.ts`** (expects a WordPress WXR export XML + an `wp-content/uploads` folder mounted at a path). Parse with `fast-xml-parser`; map posts to News/Vacancy/Interview by category heuristics (categories containing "Nafasi"/"vacancy" → Vacancy; "Usaili"/"interview" → Interview; else News). Download referenced attachments into MinIO via the API's upload path (or directly through `StorageService`). Set status to `Published`, author to the seeded admin.

```typescript
import { XMLParser } from 'fast-xml-parser';
import { readFile, readdir, stat } from 'fs/promises';
import { join } from 'path';

async function main() {
  const wxrPath = process.env.MIGRATE_WXR_PATH!;
  const uploadsDir = process.env.MIGRATE_UPLOADS_DIR!;
  const xml = await readFile(wxrPath, 'utf8');
  const parser = new XMLParser({ ignoreAttributes: false });
  const doc = parser.parse(xml);
  const items = (doc.rss?.channel?.item ?? []).filter((i: any) => i['wp:post_type'] === 'post');

  for (const item of items) {
    const title = item.title;
    const body = item['content:encoded'] ?? '';
    const date = item['wp:post_date'];
    const categories = Array.isArray(item.category) ? item.category.map((c: any) => (typeof c === 'string' ? c : c['#text'])) : [item.category];
    const kind = classify(categories);
    // POST to the API create endpoint (with admin token) for the right content type
    console.log(`migrate [${kind}] ${title} (${date})`);
  }
  console.log(`Migrated ${items.length} posts.`);
}

function classify(categories: string[]): 'news' | 'vacancy' | 'interview' {
  const joined = categories.join(' ').toLowerCase();
  if (/nafasi|vacancy|kazi/.test(joined)) return 'vacancy';
  if (/usaili|interview/.test(joined)) return 'interview';
  return 'news';
}

main().catch((e) => { console.error(e); process.exit(1); });
```

> Provide the full implementation that actually calls the API: build the create payload, upload each `<wp:attachment_url>` PDF via the documents endpoint, and call the transition endpoint to set `Published`. Use the `adminApi`-style fetches with an admin JWT obtained from `/api/auth/login`. Document the category→type mapping and any manual reclassification needed.

- [ ] **Step 2: Write `docs/migration-runbook.md`** with exact commands:
  1. Export WordPress: Tools → Export → All content → `zanajira.wxr.xml`.
  2. Archive `wp-content/uploads/` to `uploads/`.
  3. Set env: `MIGRATE_WXR_PATH`, `MIGRATE_UPLOADS_DIR`, `API_BASE_URL`, `MIGRATE_ADMIN_EMAIL`, `MIGRATE_ADMIN_PASSWORD`.
  4. Run `tsx scripts/migrate-wordpress.ts` against the staging environment.
  5. Spot-check counts vs. source; manually reclassify ambiguous posts.
  6. Re-run is idempotent (match by slug; skip existing).

- [ ] **Step 3: Commit**

```bash
git add scripts/migrate-wordpress.ts docs/migration-runbook.md
git commit -m "feat(migration): WordPress content migration script + runbook (SRS §8.3)"
```

### Task 9.8: Production deployment — bare-metal + Nginx on host (SRS §8.1, NFR 7.5)

**Decision (user):** No Docker, not even in production. Target is a bare-metal server / VM with Nginx installed on the host. The app processes run as systemd services (so they survive reboot and restart on crash), and Nginx terminates TLS and routes `/api` → API, everything else → web. `manage.sh` is still used for ad-hoc control, but systemd owns lifecycle in production.

**Files:**
- Create: `infra/nginx/site.conf` (on-host Nginx server block)
- Create: `infra/systemd/zanweb-api.service`
- Create: `infra/systemd/zanweb-web.service`
- Create: `infra/deploy.sh` (build + migrate + reload units)
- Modify: `apps/web/next.config.ts` (enable `output: 'standalone'`)

- [ ] **Step 1: Enable Next standalone output** in `apps/web/next.config.ts` (add `output: 'standalone'` to `nextConfig`).

- [ ] **Step 2: Write `infra/nginx/site.conf`** (install on host at `/etc/nginx/sites-available/zanajira.go.tz`, symlink into `sites-enabled`). The apps run on `127.0.0.1:4000` (api) and `127.0.0.1:3000` (web).

```nginx
server {
  listen 80;
  server_name zanajira.go.tz;
  return 301 https://$host$request_uri;
}

server {
  listen 443 ssl http2;
  server_name zanajira.go.tz;
  ssl_certificate     /etc/letsencrypt/live/zanajira.go.tz/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/zanajira.go.tz/privkey.pem;
  ssl_protocols TLSv1.2 TLSv1.3;

  client_max_body_size 26m;

  location /api/ {
    proxy_pass http://127.0.0.1:4000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

- [ ] **Step 3: Write `infra/systemd/zanweb-api.service`**

```ini
[Unit]
Description=CSC Zanzibar NestJS API
After=network.target postgresql.service redis-server.service

[Service]
Type=simple
User=zanweb
WorkingDirectory=/opt/zanweb
EnvironmentFile=/opt/zanweb/.env
ExecStart=/usr/bin/node /opt/zanweb/apps/api/dist/main.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

- [ ] **Step 4: Write `infra/systemd/zanweb-web.service`**

```ini
[Unit]
Description=CSC Zanzibar Next.js web
After=network.target zanweb-api.service

[Service]
Type=simple
User=zanweb
WorkingDirectory=/opt/zanweb
EnvironmentFile=/opt/zanweb/.env
ExecStart=/usr/bin/node /opt/zanweb/apps/web/server.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

- [ ] **Step 5: Write `infra/deploy.sh`** (build on the host, run migrations, reload systemd units)

```bash
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
```

- [ ] **Step 6: Commit**

```bash
git add infra/nginx/site.conf infra/systemd infra/deploy.sh apps/web/next.config.ts
git commit -m "feat(infra): bare-metal prod deploy + on-host Nginx + systemd units (SRS §8.1)"
```

### Task 9.9: Backups + disaster recovery (SRS §8.2, NFR 7.4)

**Files:**
- Create: `infra/backup.sh`
- Create: `docs/disaster-recovery-runbook.md`
- Create: `infra/restore.sh`

- [ ] **Step 1: Write `infra/backup.sh`** (daily native `pg_dump` + `mc mirror`, retain 30 days — no Docker)

```bash
#!/usr/bin/env bash
# Native backup: host pg_dump + mc mirror against the host MinIO. No Docker.
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
[[ -f .env ]] && { set -a; . ./.env; set +a; }

TS=$(date +%Y%m%d)
BACKUP_DIR="${BACKUP_DIR:-/backups}"
mkdir -p "$BACKUP_DIR"

# Postgres
pg_dump "$DATABASE_URL" | gzip > "$BACKUP_DIR/db-$TS.sql.gz"

# MinIO documents bucket
mc alias set local "http://127.0.0.1:${MINIO_PORT:-9000}" "${S3_ACCESS_KEY:-minioadmin}" "${S3_SECRET_KEY:-minioadmin}" >/dev/null 2>&1 || true
mc mirror "local/${S3_BUCKET:-zanweb-documents}" "$BACKUP_DIR/minio-$TS/" --overwrite

# Retain 30 days
find "$BACKUP_DIR" -type f -mtime +30 -delete
find "$BACKUP_DIR" -mindepth 1 -maxdepth 1 -type d -mtime +30 -exec rm -rf {} +
echo "backup $TS complete"
```

- [ ] **Step 2: Write `infra/restore.sh`** restoring from a given date (native)

```bash
#!/usr/bin/env bash
# Native restore. Usage: restore.sh YYYYMMDD
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
[[ -f .env ]] && { set -a; . ./.env; set +a; }

TS="${1:?usage: restore.sh YYYYMMDD}"
BACKUP_DIR="${BACKUP_DIR:-/backups}"

gunzip -c "$BACKUP_DIR/db-$TS.sql.gz" | psql "$DATABASE_URL"

mc alias set local "http://127.0.0.1:${MINIO_PORT:-9000}" "${S3_ACCESS_KEY:-minioadmin}" "${S3_SECRET_KEY:-minioadmin}" >/dev/null 2>&1 || true
mc mirror "$BACKUP_DIR/minio-$TS/" "local/${S3_BUCKET:-zanweb-documents}" --overwrite
echo "restored $TS"
```

- [ ] **Step 3: Write `docs/disaster-recovery-runbook.md`** — RTO 4h: (1) provision replacement host, (2) install host packages (Postgres/Redis/MinIO/ClamAV/Nginx/Node/pnpm) and clone the repo to `/opt/zanweb`, (3) `cp .env.example .env` and fill production secrets, (4) `./infra/deploy.sh` (builds, migrates, enables systemd units), (5) run `./infra/restore.sh <date>` to load the latest backup, (6) smoke test public + admin, (7) switch DNS. Document daily cron entry: `0 2 * * * /opt/zanweb/infra/backup.sh`.

- [ ] **Step 4: Commit**

```bash
git add infra/backup.sh infra/restore.sh docs/disaster-recovery-runbook.md
git commit -m "feat(infra): daily native backups + DR runbook (SRS §8.2, NFR 7.4)"
```

### Task 9.10: Training & handover docs (SRS §8.3)

**Files:**
- Create: `docs/training-editors.md`
- Create: `docs/training-reviewers.md`
- Create: `docs/training-admins.md`
- Create: `docs/admin-runbook.md`

- [ ] **Step 1: Write each training doc** with step-by-step screenshots/paths:
  - `training-editors.md`: logging in, creating a News/Vacancy/Interview entry, attaching a PDF, submitting for review.
  - `training-reviewers.md`: the review inbox, approving/rejecting with comments, publishing.
  - `training-admins.md`: user/role management, static page editing, MFA enrollment, the reporting dashboard.
- [ ] **Step 2: Write `docs/admin-runbook.md`** — env vars, running migrations, restarting services, reading audit logs, common incidents (ClamAV down → uploads rejected), backup verification.
- [ ] **Step 3: Commit**

```bash
git add docs/training-*.md docs/admin-runbook.md
git commit -m "docs: staff training material and admin runbook (SRS §8.3)"
```

### Task 9.11: Final verification + go-live checklist

- [ ] **Step 1: Full test suite green** — `pnpm -r test && pnpm -r test:e2e` against staging.
- [ ] **Step 2: Run migration against staging** and verify page/notice/PDF counts match the source WordPress export.
- [ ] **Step 3: SEO smoke** — `curl` Home, a News detail, and a Vacancy detail; confirm SSR meta + JSON-LD present; submit `sitemap.xml` to Google Search Console.
- [ ] **Step 4: a11y audit** — axe run across all public page types (NFR 7.3); fix remaining criticals.
- [ ] **Step 5: Security check** — confirm all admin routes return 401/403 without a token; OWASP Top 10 review (parameterized queries via Prisma ✓; XSS via DOMPurify ✓; CSRF — add `@nestjs/cookie-csrf` or SameSite cookies for admin mutations; file upload validation ✓; ClamAV ✓).
- [ ] **Step 6: Tag release**

```bash
git tag -a v1.0.0 -m "CSC Zanzibar public website v1.0 — go-live"
```

- [ ] **Step 7: Commit + close out**

```bash
git add -A
git commit -m "chore: v1.0.0 go-live verification"
```

---

## Post-go-live (not in v1.0 scope, tracked for later)

- REQ-NTF-03 subscriber matching refinement (saved-criteria matching beyond MDA).
- Horizontal/vertical scaling policy for recruitment-traffic spikes (NFR 7.5) — e.g. adding app-process workers behind Nginx upstream balancing, or sizing up the VM.
- Deeper analytics (REQ-RPT-02 trends over time) once baseline data accrues.

*End of plan.*