# Phase 2 — Data Layer

> Part of the **CSC Zanzibar Public Website** implementation plan. See [`CSC-ZNZ-WEB-Implementation-Plan.md`](./CSC-ZNZ-WEB-Implementation-Plan.md) for the overview, file-structure map, and phase index. Depends on [Phase 1](./phase-1-foundation.md).
>
> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task.

**Milestone:** A version-controlled Prisma schema modeling every entity in SRS §5, the first migration applied to the dev Postgres, a generated client exported from `packages/prisma`, a `PrismaService` wired into NestJS, and a seed script that creates the three roles and one administrator.

**Requirements covered:** SRS §5 (all entities), REQ-USR-01 (roles), foundation for every later phase.

### Task 2.1: Scaffold `packages/prisma`

**Files:**
- Create: `packages/prisma/package.json`
- Create: `packages/prisma/tsconfig.json`

- [ ] **Step 1: Write `packages/prisma/package.json`**

```json
{
  "name": "@zanweb/prisma",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:deploy": "prisma migrate deploy",
    "prisma:seed": "tsx seed.ts",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@prisma/client": "^5.12.0"
  },
  "devDependencies": {
    "prisma": "^5.12.0",
    "tsx": "^4.7.0",
    "typescript": "^5.4.0"
  },
  "prisma": { "seed": "tsx seed.ts" }
}
```

- [ ] **Step 2: Write `packages/prisma/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "outDir": "./dist" },
  "include": ["src", "seed.ts"]
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/prisma
git commit -m "chore(prisma): scaffold prisma package"
```

### Task 2.2: Write the Prisma schema (SRS §5)

**Files:**
- Create: `packages/prisma/schema.prisma`
- Create: `packages/prisma/src/client.ts`

- [ ] **Step 1: Write `packages/prisma/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client-js"
  output   = "../generated/client"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum UserRole {
  Editor
  Reviewer
  Administrator
}

enum UserStatus {
  Active
  Deactivated
}

enum ContentStatus {
  Draft
  InReview
  Published
  Rejected
  Archived
}

enum VacancyStatus {
  Draft
  InReview
  Published
  Closed
  Archived
}

enum InterviewType {
  CallForInterview
  InterviewResult
}

enum AuditAction {
  Create
  Update
  Publish
  Reject
  Delete
  AuthSuccess
  AuthFailure
}

model User {
  id           String      @id @default(uuid())
  name         String
  email        String      @unique
  passwordHash String
  role         UserRole    @default(Editor)
  status       UserStatus  @default(Active)
  mfaSecret    String?
  mfaEnabled   Boolean     @default(false)
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt
  authoredNews       NewsPost[]         @relation("NewsAuthor")
  authoredVacancies  Vacancy[]          @relation("VacancyAuthor")
  authoredInterviews InterviewNotice[]  @relation("InterviewAuthor")
  reviewedNews       NewsPost[]         @relation("NewsReviewer")
  reviewedVacancies  Vacancy[]          @relation("VacancyReviewer")
  reviewedInterviews InterviewNotice[]  @relation("InterviewReviewer")
  auditLogs    AuditLog[]
}

model Department {
  id      String  @id @default(uuid())
  nameSw  String
  nameEn  String?
  vacancies        Vacancy[]         @relation("VacancyDepartment")
  interviewNotices InterviewNotice[] @relation("InterviewDepartment")
  pages   Page[]   @relation("PageDepartment")
}

model Page {
  id           String       @id @default(uuid())
  slug         String       @unique
  titleSw      String
  titleEn      String?
  bodySw       String
  bodyEn       String?
  parentId     String?
  parent       Page?        @relation("PageTree", fields: [parentId], references: [id])
  children     Page[]       @relation("PageTree")
  departmentId String?
  department   Department?  @relation("PageDepartment", fields: [departmentId], references: [id])
  updatedAt    DateTime     @updatedAt
  createdAt    DateTime     @default(now())
}

model NewsPost {
  id            String         @id @default(uuid())
  slug          String         @unique
  titleSw       String
  titleEn       String?
  bodySw        String
  bodyEn        String?
  publishDate   DateTime       @default(now())
  status        ContentStatus  @default(Draft)
  coverImageKey String?
  authorId      String
  author        User           @relation("NewsAuthor", fields: [authorId], references: [id])
  reviewerId    String?
  reviewer      User?          @relation("NewsReviewer", fields: [reviewerId], references: [id])
  versions      ContentVersion[]
  documents     Document[]     @relation("NewsDocuments")
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt

  @@index([status, publishDate])
}

model Vacancy {
  id            String         @id @default(uuid())
  slug          String         @unique
  title         String
  mda           String
  departmentId  String?
  department    Department?    @relation("VacancyDepartment", fields: [departmentId], references: [id])
  publishDate   DateTime       @default(now())
  closingDate   DateTime
  status        VacancyStatus  @default(Draft)
  applyUrl      String?
  authorId      String
  author        User           @relation("VacancyAuthor", fields: [authorId], references: [id])
  reviewerId    String?
  reviewer      User?          @relation("VacancyReviewer", fields: [reviewerId], references: [id])
  versions      ContentVersion[]
  documents     Document[]     @relation("VacancyDocuments")
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt

  @@index([status, closingDate])
  @@index([mda])
}

model InterviewNotice {
  id            String         @id @default(uuid())
  slug          String         @unique
  title         String
  mda           String
  type          InterviewType
  departmentId  String?
  department    Department?    @relation("InterviewDepartment", fields: [departmentId], references: [id])
  publishDate   DateTime       @default(now())
  status        ContentStatus  @default(Draft)
  authorId      String
  author        User           @relation("InterviewAuthor", fields: [authorId], references: [id])
  reviewerId    String?
  reviewer      User?          @relation("InterviewReviewer", fields: [reviewerId], references: [id])
  versions      ContentVersion[]
  documents     Document[]     @relation("InterviewDocuments")
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt

  @@index([type, status, publishDate])
}

model Document {
  id             String   @id @default(uuid())
  filename       String
  mimeType       String
  sizeBytes      Int
  storageKey     String   @unique
  ownerType      String   // 'NewsPost' | 'Vacancy' | 'InterviewNotice' | 'Page'
  ownerId        String
  downloadCount  Int      @default(0)
  scannedClean   Boolean  @default(false)
  createdAt      DateTime @default(now())

  newsPost       NewsPost?        @relation("NewsDocuments", fields: [ownerId], references: [id])
  vacancy        Vacancy?         @relation("VacancyDocuments", fields: [ownerId], references: [id])
  interviewNotice InterviewNotice? @relation("InterviewDocuments", fields: [ownerId], references: [id])

  @@index([ownerType, ownerId])
}

model ContentVersion {
  id           String   @id @default(uuid())
  entityType   String   // 'NewsPost' | 'Vacancy' | 'InterviewNotice' | 'Page'
  entityId     String
  snapshot     Json
  authorId     String?
  author       User?    @relation(fields: [authorId], references: [id])
  createdAt    DateTime @default(now())

  newsPost      NewsPost?       @relation(fields: [entityId], references: [id])
  vacancy       Vacancy?        @relation(fields: [entityId], references: [id])
  interviewNotice InterviewNotice? @relation(fields: [entityId], references: [id])

  @@index([entityType, entityId, createdAt])
}

model AuditLog {
  id          String      @id @default(uuid())
  userId      String?
  user        User?       @relation(fields: [userId], references: [id])
  action      AuditAction
  entityType  String
  entityId    String
  diff        Json?
  timestamp   DateTime    @default(now())

  @@index([entityType, entityId])
  @@index([timestamp])
}

model Subscriber {
  id        String   @id @default(uuid())
  email     String   @unique
  criteria  Json?
  createdAt DateTime @default(now())
}

model PageView {
  id        String   @id @default(uuid())
  path      String
  locale    String
  createdAt DateTime @default(now())

  @@index([path, createdAt])
}

model DocumentDownload {
  id          String   @id @default(uuid())
  documentId  String
  createdAt   DateTime @default(now())

  @@index([documentId, createdAt])
}
```

- [ ] **Step 2: Write `packages/prisma/src/client.ts`** (single shared client)

```typescript
import { PrismaClient } from '../generated/client';

export const prisma = new PrismaClient();
export * from '../generated/client';
```

- [ ] **Step 3: Commit**

```bash
git add packages/prisma/schema.prisma packages/prisma/src/client.ts
git commit -m "feat(prisma): add schema for all SRS §5 entities"
```

### Task 2.3: Create the first migration

- [ ] **Step 1: Ensure native services are up and `.env` loaded**

Run: `cp .env.example .env && ./manage.sh start && ./manage.sh status`
Expected: postgres (and redis/minio) running (Phase 1 Task 1.2). The migration only needs Postgres.

- [ ] **Step 2: Generate the client and create migration**

Run: `pnpm --filter @zanweb/prisma prisma:generate && pnpm --filter @zanweb/prisma prisma migrate dev --name init`
Expected: migration `packages/prisma/migrations/<timestamp>_init/migration.sql` created and applied; `generated/client/` produced.

- [ ] **Step 3: Commit migration + generated client reference**

```bash
git add packages/prisma/migrations packages/prisma/generated
git commit -m "feat(prisma): apply initial migration"
```

> **Note:** the generated client is committed so the API can import it without re-running `prisma generate` in CI before install. Re-generate after any schema change.

### Task 2.4: Wire `PrismaService` into the API

**Files:**
- Create: `apps/api/src/prisma/prisma.module.ts`
- Create: `apps/api/src/prisma/prisma.service.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Write `apps/api/src/prisma/prisma.service.ts`**

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@zanweb/prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() { await this.$connect(); }
  async onModuleDestroy() { await this.$disconnect(); }
}
```

- [ ] **Step 2: Write `apps/api/src/prisma/prisma.module.ts`**

```typescript
import { Module, Global } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

- [ ] **Step 3: Add a path alias for the client in `apps/api/tsconfig.json`** (add inside `compilerOptions`)

```json
"paths": { "@zanweb/prisma/client": ["../../packages/prisma/generated/client"] }
```

And in `apps/api/jest.config.ts` add to `moduleNameMapper`:

```typescript
'^@zanweb/prisma/client$': '<rootDir>/../../packages/prisma/generated/client',
```

- [ ] **Step 4: Write a failing test `apps/api/src/prisma/prisma.service.spec.ts`**

```typescript
import { Test } from '@nestjs/testing';
import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  it('is provided by PrismaModule', async () => {
    const moduleRef = await Test.createTestingModule({}).compile();
    const prisma = moduleRef.get(PrismaService);
    // a trivial query confirms the client is wired and DB reachable
    const result = await prisma.$queryRaw`SELECT 1 AS one`;
    expect((result as any)[0].one).toBe(1);
  });
});
```

Run: `pnpm --filter @zanweb/api test`
Expected: FAIL — `PrismaService` not a registered provider (module not imported).

- [ ] **Step 5: Wire `PrismaModule` into `app.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health.controller';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule],
  controllers: [HealthController],
})
export class AppModule {}
```

Run: `pnpm --filter @zanweb/api test`
Expected: PASS (DB must be up).

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/prisma apps/api/tsconfig.json apps/api/jest.config.ts apps/api/src/app.module.ts
git commit -m "feat(api): wire global PrismaService"
```

### Task 2.5: Seed roles and an administrator

**Files:**
- Create: `packages/prisma/seed.ts`
- Create: `apps/api/src/common/password.util.ts`

- [ ] **Step 1: Write `apps/api/src/common/password.util.ts`** (hash helper used by seed and auth)

```typescript
import * as bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
```

- [ ] **Step 2: Write `packages/prisma/seed.ts`**

```typescript
import { PrismaClient, UserRole } from './generated/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@zanajira.go.tz';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe!123';

  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: UserRole.Administrator, status: 'Active' },
    create: {
      email: adminEmail,
      name: 'System Administrator',
      passwordHash,
      role: UserRole.Administrator,
      status: 'Active',
    },
  });

  const departments = [
    { nameSw: 'Idara ya Utumishi', nameEn: 'Public Service Department' },
    { nameSw: 'Idara ya Utawala', nameEn: 'Administration Department' },
  ];
  for (const d of departments) {
    await prisma.department.upsert({
      where: { id: d.nameSw }, // placeholder; see note below
      update: {},
      create: { nameSw: d.nameSw, nameEn: d.nameEn },
    });
  }

  console.log('Seed complete. Admin id:', admin.id);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
```

> **Note:** `Department.nameSw` is not unique in the schema above; the `upsert where: { id }` pattern won't compile. Replace the department block with a find-first-or-create to avoid a unique constraint: query by `nameSw`, create only if none exists.

Corrected department block:

```typescript
for (const d of departments) {
  const existing = await prisma.department.findFirst({ where: { nameSw: d.nameSw } });
  if (!existing) {
    await prisma.department.create({ data: { nameSw: d.nameSw, nameEn: d.nameEn } });
  }
}
```

Use the corrected block in the final `seed.ts`.

- [ ] **Step 3: Run the seed**

Run: `pnpm --filter @zanweb/prisma prisma:seed`
Expected: `Seed complete. Admin id: <uuid>`; one `User` (Administrator) and two `Department` rows in the DB.

- [ ] **Step 4: Verify via psql**

Run: `psql "$DATABASE_URL" -c 'SELECT email, role, status FROM "User";'`
Expected: one row with `role=Administrator`. (Uses the native `psql` client against the host Postgres per `.env` `DATABASE_URL`.)

- [ ] **Step 5: Commit**

```bash
git add packages/prisma/seed.ts apps/api/src/common/password.util.ts
git commit -m "feat(prisma): seed administrator and departments"
```

---