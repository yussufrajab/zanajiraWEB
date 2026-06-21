# Phase 1 — Foundation

> Part of the **CSC Zanzibar Public Website** implementation plan. See [`CSC-ZNZ-WEB-Implementation-Plan.md`](./CSC-ZNZ-WEB-Implementation-Plan.md) for the overview, file-structure map, and phase index.
>
> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Milestone:** A runnable monorepo with both apps booting, lint/typecheck/test commands wired, and Docker dev stack for Postgres/MinIO/Redis/ClamAV.

**Requirements covered in this phase:** Project/tooling foundation (enables all later REQ-*). `packages/shared` defines the enums used by REQ-USR-01, REQ-CMS-02, REQ-INT-02, and vacancy status.

### Task 1.1: Initialize git repo and workspace root

**Files:**
- Create: `/home/yusuf/zanWEB/.gitignore`
- Create: `/home/yusuf/zanWEB/package.json`
- Create: `/home/yusuf/zanWEB/pnpm-workspace.yaml`
- Create: `/home/yusuf/zanWEB/tsconfig.base.json`
- Create: `/home/yusuf/zanWEB/.env.example`

- [ ] **Step 1: Init repo**

```bash
cd /home/yusuf/zanWEB
git init
git add CSC-ZNZ-SRS-WEB-001.md docs/CSC-ZNZ-WEB-Implementation-Plan.md docs/phase-1-foundation.md
```

- [ ] **Step 2: Write `.gitignore`**

```gitignore
# deps
node_modules/
.pnpm-store/

# build
dist/
build/
.next/
out/

# env
.env
.env.local
.env.*.local

# prisma generated (committed selectively)
packages/prisma/generated/

# misc
*.log
.DS_Store
coverage/
playwright-report/
test-results/
```

- [ ] **Step 3: Write `pnpm-workspace.yaml`**

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

- [ ] **Step 4: Write root `package.json`**

```json
{
  "name": "zanweb",
  "private": true,
  "version": "0.1.0",
  "scripts": {
    "dev:api": "pnpm --filter @zanweb/api dev",
    "dev:web": "pnpm --filter @zanweb/web dev",
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "lint": "pnpm -r lint",
    "typecheck": "pnpm -r typecheck",
    "prisma:generate": "pnpm --filter @zanweb/prisma prisma:generate",
    "prisma:migrate": "pnpm --filter @zanweb/prisma prisma:migrate",
    "prisma:seed": "pnpm --filter @zanweb/prisma prisma:seed",
    "docker:up": "docker compose up -d",
    "docker:down": "docker compose down"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "prettier": "^3.2.0"
  },
  "packageManager": "pnpm@9.0.0",
  "engines": { "node": ">=20.10.0" }
}
```

- [ ] **Step 5: Write `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "sourceMap": true
  }
}
```

- [ ] **Step 6: Write `.env.example`**

```env
# Database
DATABASE_URL=postgresql://zanweb:zanweb@localhost:5432/zanweb?schema=public

# Redis
REDIS_URL=redis://localhost:6379

# MinIO / S3
S3_ENDPOINT=http://localhost:9000
S3_REGION=us-east-1
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=zanweb-documents
S3_PUBLIC_BASE_URL=http://localhost:9000/zanweb-documents

# Auth
JWT_SECRET=change-me-in-production
JWT_EXPIRES_IN=8h

# SMTP
SMTP_HOST=smtp.example.go.tz
SMTP_PORT=587
SMTP_USER=notifications@zanajira.go.tz
SMTP_PASSWORD=change-me
SMTP_FROM="CSC Zanzibar <notifications@zanajira.go.tz>"

# ClamAV
CLAMAV_HOST=localhost
CLAMAV_PORT=3310

# App
API_BASE_URL=http://localhost:4000
WEB_BASE_URL=http://localhost:3000
```

- [ ] **Step 7: Commit**

```bash
git add .gitignore package.json pnpm-workspace.yaml tsconfig.base.json .env.example
git commit -m "chore: initialize pnpm monorepo workspace"
```

### Task 1.2: Docker dev stack

**Files:**
- Create: `/home/yusuf/zanWEB/docker-compose.yml`
- Create: `/home/yusuf/zanWEB/infra/clamav/clamav.conf`

- [ ] **Step 1: Write `docker-compose.yml`**

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: zanweb
      POSTGRES_PASSWORD: zanweb
      POSTGRES_DB: zanweb
    ports: ["5432:5432"]
    volumes: ["pgdata:/var/lib/postgresql/data"]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U zanweb"]
      interval: 5s
      timeout: 3s
      retries: 10

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 10

  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports: ["9000:9000", "9001:9001"]
    volumes: ["miniodata:/data"]
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 10s
      timeout: 5s
      retries: 10

  clamav:
    image: clamav/clamav:latest
    ports: ["3310:3310"]
    volumes: ["clamdata:/var/lib/clamav"]

volumes:
  pgdata:
  miniodata:
  clamdata:
```

- [ ] **Step 2: Verify stack starts**

Run: `docker compose up -d && docker compose ps`
Expected: postgres, redis, minio, clamav all `Up` (postgres/redis/minio eventually `healthy`).

- [ ] **Step 3: Create the documents bucket**

Run: `docker compose exec minio mc alias set local http://localhost:9000 minioadmin minioadmin && docker compose exec minio mc mb local/zanweb-documents --ignore-existing`
Expected: bucket created.

- [ ] **Step 4: Commit**

```bash
git add docker-compose.yml infra/clamav/clamav.conf
git commit -m "chore: add docker dev stack (postgres, redis, minio, clamav)"
```

### Task 1.3: Scaffold `packages/shared`

**Files:**
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/enums.ts`
- Create: `packages/shared/src/types.ts`
- Create: `packages/shared/src/index.ts`

- [ ] **Step 1: Write `packages/shared/package.json`**

```json
{
  "name": "@zanweb/shared",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "typecheck": "tsc --noEmit",
    "build": "tsc"
  },
  "devDependencies": { "typescript": "^5.4.0" }
}
```

- [ ] **Step 2: Write `packages/shared/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "outDir": "./dist" },
  "include": ["src"]
}
```

- [ ] **Step 3: Write `packages/shared/src/enums.ts`** (covers REQ-USR-01, REQ-CMS-02, REQ-INT-02, REQ-VAC status)

```typescript
export enum UserRole {
  Editor = 'Editor',
  Reviewer = 'Reviewer',
  Administrator = 'Administrator',
}

export enum UserStatus {
  Active = 'Active',
  Deactivated = 'Deactivated',
}

export enum ContentStatus {
  Draft = 'Draft',
  InReview = 'InReview',
  Published = 'Published',
  Rejected = 'Rejected',
  Archived = 'Archived',
}

export enum VacancyStatus {
  Draft = 'Draft',
  InReview = 'InReview',
  Published = 'Published',
  Closed = 'Closed',
  Archived = 'Archived',
}

export enum InterviewType {
  CallForInterview = 'CallForInterview',
  InterviewResult = 'InterviewResult',
}

export enum AuditAction {
  Create = 'Create',
  Update = 'Update',
  Publish = 'Publish',
  Reject = 'Reject',
  Delete = 'Delete',
  AuthSuccess = 'AuthSuccess',
  AuthFailure = 'AuthFailure',
}
```

- [ ] **Step 4: Write `packages/shared/src/types.ts`**

```typescript
import {
  ContentStatus, UserRole, VacancyStatus, InterviewType, UserStatus, AuditAction,
} from './enums.js';

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface PaginationQuery {
  page?: number;
  pageSize?: number;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
}

export interface PageResponse {
  id: string;
  slug: string;
  titleSw: string;
  titleEn: string | null;
  bodySw: string;
  bodyEn: string | null;
  updatedAt: string;
}

export interface DocumentResponse {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  downloadCount: number;
  url: string;
}

export interface NewsPostResponse {
  id: string;
  slug: string;
  titleSw: string;
  titleEn: string | null;
  bodySw: string;
  bodyEn: string | null;
  publishDate: string;
  status: ContentStatus;
  coverImageUrl: string | null;
  documents: DocumentResponse[];
}

export interface VacancyResponse {
  id: string;
  slug: string;
  title: string;
  mda: string;
  publishDate: string;
  closingDate: string;
  status: VacancyStatus;
  applyUrl: string | null;
  documents: DocumentResponse[];
}

export interface InterviewNoticeResponse {
  id: string;
  slug: string;
  title: string;
  mda: string;
  type: InterviewType;
  publishDate: string;
  status: ContentStatus;
  documents: DocumentResponse[];
}

export interface AuditLogResponse {
  id: string;
  userId: string | null;
  action: AuditAction;
  entityType: string;
  entityId: string;
  timestamp: string;
  diff: Record<string, unknown> | null;
}
```

- [ ] **Step 5: Write `packages/shared/src/index.ts`**

```typescript
export * from './enums.js';
export * from './types.js';
```

- [ ] **Step 6: Typecheck**

Run: `pnpm --filter @zanweb/shared typecheck`
Expected: PASS, no errors.

- [ ] **Step 7: Commit**

```bash
git add packages/shared
git commit -m "feat(shared): add shared enums and DTO types"
```

### Task 1.4: Scaffold NestJS API app

**Files:**
- Create: `apps/api/package.json`
- Create: `apps/api/tsconfig.json`
- Create: `apps/api/jest.config.ts`
- Create: `apps/api/src/main.ts`
- Create: `apps/api/src/app.module.ts`
- Create: `apps/api/test/health.spec.ts`

- [ ] **Step 1: Write `apps/api/package.json`**

```json
{
  "name": "@zanweb/api",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "nest start --watch",
    "build": "nest build",
    "start": "node dist/main.js",
    "test": "jest",
    "test:e2e": "jest --config ./test/jest-e2e.json",
    "lint": "eslint \"src/**/*.ts\"",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@nestjs/common": "^10.3.0",
    "@nestjs/core": "^10.3.0",
    "@nestjs/platform-express": "^10.3.0",
    "@nestjs/config": "^3.2.0",
    "@nestjs/jwt": "^10.2.0",
    "@nestjs/passport": "^10.0.3",
    "@nestjs/swagger": "^7.3.0",
    "@nestjs/throttler": "^5.1.2",
    "@prisma/client": "^5.12.0",
    "passport": "^0.7.0",
    "passport-jwt": "^4.0.1",
    "bcrypt": "^5.1.1",
    "class-validator": "^0.14.1",
    "class-transformer": "^0.5.1",
    "ioredis": "^5.3.2",
    "bullmq": "^5.7.0",
    "@aws-sdk/client-s3": "^3.577.0",
    "nodemailer": "^6.9.13",
    "clamscan": "^2.2.1",
    "reflect-metadata": "^0.2.2",
    "rxjs": "^7.8.1"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.3.2",
    "@nestjs/schematics": "^10.1.1",
    "@nestjs/testing": "^10.3.0",
    "@types/bcrypt": "^5.0.2",
    "@types/express": "^4.17.21",
    "@types/jest": "^29.5.12",
    "@types/node": "^20.12.0",
    "@types/nodemailer": "^6.4.14",
    "@types/passport-jwt": "^4.0.1",
    "@types/supertest": "^6.0.2",
    "jest": "^29.7.0",
    "supertest": "^6.3.4",
    "ts-jest": "^29.1.2",
    "ts-node": "^10.9.2",
    "typescript": "^5.4.0"
  }
}
```

- [ ] **Step 2: Write `apps/api/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "module": "CommonJS",
    "moduleResolution": "Node",
    "outDir": "./dist",
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "useDefineForClassFields": false,
    "types": ["node", "jest"]
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Write `apps/api/jest.config.ts`**

```typescript
import type { Config } from 'jest';
const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: { '^.+\\.ts$': 'ts-jest' },
  collectCoverageFrom: ['src/**/*.ts', '!src/main.ts'],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
  moduleNameMapper: { '^@zanweb/shared$': '<rootDir>/../../packages/shared/src' },
};
export default config;
```

- [ ] **Step 4: Write `apps/api/src/main.ts`**

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.setGlobalPrefix('api');
  app.enableCors({ origin: process.env.WEB_BASE_URL ?? 'http://localhost:3000' });
  await app.listen(process.env.PORT ?? 4000);
}
bootstrap();
```

- [ ] **Step 5: Write `apps/api/src/app.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
})
export class AppModule {}
```

- [ ] **Step 6: Write the failing health test `apps/api/test/health.spec.ts`**

```typescript
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Health (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => { await app.close(); });

  it('GET /api/health returns 200 ok', async () => {
    const res = await request(app.getHttpServer()).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});
```

Run: `pnpm --filter @zanweb/api test:e2e`
Expected: FAIL — no `/api/health` route.

- [ ] **Step 7: Implement health controller `apps/api/src/health.controller.ts`**

```typescript
import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  health() { return { status: 'ok' }; }
}
```

Wire it in `app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health.controller';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  controllers: [HealthController],
})
export class AppModule {}
```

- [ ] **Step 8: Run e2e test**

Run: `pnpm --filter @zanweb/api test:e2e`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add apps/api
git commit -m "feat(api): scaffold NestJS app with health endpoint"
```

### Task 1.5: Scaffold Next.js web app

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/next.config.ts`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/vitest.config.ts`
- Create: `apps/web/src/app/[locale]/layout.tsx`
- Create: `apps/web/src/app/[locale]/page.tsx`
- Create: `apps/web/src/i18n.ts`
- Create: `apps/web/src/middleware.ts`
- Create: `apps/web/messages/sw.json`
- Create: `apps/web/messages/en.json`
- Create: `apps/web/src/app/page.spec.tsx`

- [ ] **Step 1: Write `apps/web/package.json`**

```json
{
  "name": "@zanweb/web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:e2e": "playwright test"
  },
  "dependencies": {
    "next": "^14.2.0",
    "next-intl": "^3.15.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "@zanweb/shared": "workspace:*"
  },
  "devDependencies": {
    "@types/node": "^20.12.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@playwright/test": "^1.44.0",
    "@testing-library/react": "^15.0.0",
    "@vitejs/plugin-react": "^4.2.0",
    "eslint": "^8.57.0",
    "eslint-config-next": "^14.2.0",
    "jsdom": "^24.0.0",
    "typescript": "^5.4.0",
    "vitest": "^1.6.0"
  }
}
```

- [ ] **Step 2: Write `apps/web/next.config.ts`**

```typescript
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n.ts');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: { remotePatterns: [{ protocol: 'http', hostname: 'localhost' }] },
};

export default withNextIntl(nextConfig);
```

- [ ] **Step 3: Write `apps/web/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "preserve",
    "noEmit": true,
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"], "@zanweb/shared": ["../../packages/shared/src"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"]
}
```

- [ ] **Step 4: Write `apps/web/src/i18n.ts`**

```typescript
import { getRequestConfig } from 'next-intl/server';

export const locales = ['sw', 'en'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'sw'; // REQ-I18N-03

export default getRequestConfig(async ({ locale }) => {
  return {
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
```

- [ ] **Step 5: Write `apps/web/src/middleware.ts`**

```typescript
import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n';

export default createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always',
});

export const config = {
  matcher: ['/((?!admin|api|_next|.*\\..*).*)'],
};
```

- [ ] **Step 6: Write `apps/web/messages/sw.json`**

```json
{
  "Home": { "title": "Tume ya Utumishi wa Umma – Zanzibar", "welcome": "Karibu kwenye tovuti rasmi ya Tume ya Utumishi wa Umma Zanzibar." },
  "Nav": { "about": "Kuhusu Sisi", "organization": "Muundo wa Shirika", "services": "Huduma Zetu", "contact": "Wasiliana Nasi", "news": "Habari", "vacancies": "Tangazo la Nafasi za Kazi", "interviews": "Wito wa Usaili", "search": "Tafuta" },
  "Lang": { "switch": "English" }
}
```

- [ ] **Step 7: Write `apps/web/messages/en.json`**

```json
{
  "Home": { "title": "Civil Service Commission – Zanzibar", "welcome": "Welcome to the official website of the Civil Service Commission of Zanzibar." },
  "Nav": { "about": "About Us", "organization": "Organization Structure", "services": "Our Services", "contact": "Contact Us", "news": "News", "vacancies": "Vacancy Announcements", "interviews": "Call for Interviews", "search": "Search" },
  "Lang": { "switch": "Kiswahili" }
}
```

- [ ] **Step 8: Write `apps/web/src/app/[locale]/layout.tsx`**

```tsx
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales } from '../../i18n';

export default async function LocaleLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  if (!locales.includes(locale as never)) notFound();
  const messages = await getMessages();
  return (
    <html lang={locale}>
      <body>
        <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 9: Write the failing test `apps/web/src/app/page.spec.tsx`**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import Home from './[locale]/page';

function renderWithIntl(ui: React.ReactNode, locale = 'sw') {
  const messages = require(`../messages/${locale}.json`);
  return render(<NextIntlClientProvider locale={locale} messages={messages}>{ui}</NextIntlClientProvider>);
}

describe('Home page', () => {
  it('renders the site title heading in Swahili', () => {
    renderWithIntl(<Home />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('Tume ya Utumishi');
  });
});
```

Run: `pnpm --filter @zanweb/web test`
Expected: FAIL — `Home` not implemented.

- [ ] **Step 10: Implement `apps/web/src/app/[locale]/page.tsx`**

```tsx
import { useTranslations } from 'next-intl';

export default function Home() {
  const t = useTranslations('Home');
  return (
    <main>
      <h1>{t('title')}</h1>
      <p>{t('welcome')}</p>
    </main>
  );
}
```

Run: `pnpm --filter @zanweb/web test`
Expected: PASS.

- [ ] **Step 11: Commit**

```bash
git add apps/web
git commit -m "feat(web): scaffold Next.js app with i18n and home page"
```

### Task 1.6: Install and verify workspace wiring

- [ ] **Step 1: Install**

Run: `pnpm install`
Expected: workspace links resolved, no peer-dep errors blocking.

- [ ] **Step 2: Verify both apps build/typecheck**

Run: `pnpm typecheck`
Expected: PASS across all packages.

- [ ] **Step 3: Commit lockfile**

```bash
git add pnpm-lock.yaml
git commit -m "chore: lock dependencies after workspace install"
```

---