# CSC Zanzibar Public Website — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the legacy WordPress site at `zanajira.go.tz` with a custom bilingual (Swahili/English) public website and content-management backend for the Civil Service Commission – Zanzibar, covering static pages, News, Vacancy Announcements, Call-for-Interview notices, a document repository, search, and a role-based editorial workflow.

**Architecture:** A pnpm monorepo with a Next.js app (SSR public site + admin UI shell) and a NestJS REST API, backed by PostgreSQL via Prisma, MinIO (S3-compatible) for documents/media, and Redis + BullMQ for caching and background jobs. The Next.js frontend renders server-side for SEO and calls the NestJS API; the API is the single source of business logic, RBAC, and the content workflow. Everything is containerized (Docker + Nginx) for deployment to a government data center or approved cloud.

**Tech Stack:** TypeScript, pnpm workspaces, Next.js (App Router, SSR/SSG), NestJS, PostgreSQL, Prisma, MinIO (S3 SDK), Redis + BullMQ, Jest (backend), Vitest/Playwright (frontend), Docker, Nginx, `next-intl` (i18n), ClamAV (malware scan), nodemailer (SMTP).

**Source SRS:** `CSC-ZNZ-SRS-WEB-001.md` (v1.0, 21 June 2026). Requirement IDs (e.g. `REQ-VAC-01`) are referenced in tasks for traceability.

---

## Plan Organization & How to Read It

This SRS spans multiple subsystems (frontend, API, storage, background jobs, migration). The work is split into **9 phases, each in its own file** in this `docs/` folder. Each phase produces working, testable software on its own and maps to a milestone commit. Implement phases in order — each depends on the previous.

### Phase index

| # | Phase | File | Milestone |
|---|---|---|---|
| 1 | Foundation | [phase-1-foundation.md](./phase-1-foundation.md) | Runnable monorepo, tooling, Docker dev stack |
| 2 | Data layer | [phase-2-data-layer.md](./phase-2-data-layer.md) | Prisma schema, migrations, seed |
| 3 | Auth & RBAC | [phase-3-auth-rbac.md](./phase-3-auth-rbac.md) | Staff login, JWT, roles, MFA, audit log |
| 4 | Documents | [phase-4-documents.md](./phase-4-documents.md) | MinIO upload/download, validation, malware scan |
| 5 | Content modules | [phase-5-content-modules.md](./phase-5-content-modules.md) | News, Vacancy, Interview CRUD + editorial workflow |
| 6 | Static pages & i18n | [phase-6-pages-i18n.md](./phase-6-pages-i18n.md) | Page entity, bilingual rendering, sitemap |
| 7 | Public frontend | [phase-7-public-frontend.md](./phase-7-public-frontend.md) | Next.js site, listings, search, SEO, branding |
| 8 | Admin frontend | [phase-8-admin-frontend.md](./phase-8-admin-frontend.md) | Admin UI, content forms, workflow UI |
| 9 | Operations | [phase-9-operations.md](./phase-9-operations.md) | Notifications, jobs, analytics, migration, deploy |

### Traceability (requirement → phase)

| Requirement block | Phase |
|---|---|
| REQ-PG-* (static pages) | 6, 7 |
| REQ-NEWS-* | 5, 7 |
| REQ-VAC-* | 5, 7 |
| REQ-INT-* | 5, 7 |
| REQ-DOC-* | 4 |
| REQ-SRCH-* | 5 (API), 7 (UI) |
| REQ-I18N-* | 6, 7 |
| REQ-CMS-* | 5, 8 |
| REQ-USR-* | 3, 8 |
| REQ-NTF-* | 9 |
| REQ-EXT-* | 7 |
| REQ-RPT-* | 9 |
| NFRs (§7) | spread (perf→5/7, security→3/4, a11y→7, SEO→7, i18n→6/7, etc.) |

### Conventions used throughout

- All paths are relative to the repo root `/home/yusuf/zanWEB`.
- Backend tests: Jest (`apps/api`). Frontend tests: Vitest unit + Playwright e2e (`apps/web`).
- TDD: write failing test → run (red) → implement → run (green) → commit.
- Commit messages follow Conventional Commits (`feat:`, `fix:`, `chore:`, `test:`, `docs:`).

---

## File Structure (locked decomposition)

```
zanWEB/
├── package.json                    # pnpm workspace root, scripts
├── pnpm-workspace.yaml
├── .env.example
├── .gitignore
├── tsconfig.base.json
├── docker-compose.yml              # local dev: postgres, minio, redis, clamav
├── docker-compose.prod.yml
├── infra/
│   ├── nginx/
│   │   └── site.conf               # reverse proxy, TLS termination, routing
│   ├── api.Dockerfile
│   ├── web.Dockerfile
│   └── clamav/
│       └── clamav.conf
├── apps/
│   ├── api/                        # NestJS backend
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── jest.config.ts
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── health.controller.ts
│   │   │   ├── prisma/
│   │   │   │   ├── prisma.module.ts
│   │   │   │   └── prisma.service.ts
│   │   │   ├── auth/
│   │   │   │   ├── auth.module.ts
│   │   │   │   ├── auth.controller.ts
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── jwt.strategy.ts
│   │   │   │   ├── roles.guard.ts
│   │   │   │   ├── roles.decorator.ts
│   │   │   │   ├── mfa.service.ts
│   │   │   │   └── dto/...
│   │   │   ├── users/
│   │   │   │   ├── users.module.ts
│   │   │   │   ├── users.controller.ts
│   │   │   │   ├── users.service.ts
│   │   │   │   └── dto/...
│   │   │   ├── documents/
│   │   │   │   ├── documents.module.ts
│   │   │   │   ├── documents.controller.ts
│   │   │   │   ├── documents.service.ts
│   │   │   │   ├── storage.service.ts        # MinIO wrapper
│   │   │   │   ├── malware-scanner.service.ts # ClamAV
│   │   │   │   └── dto/...
│   │   │   ├── content/                # shared base for News/Vacancy/Interview
│   │   │   │   ├── content.module.ts
│   │   │   │   ├── workflow.service.ts # Draft→Review→Published state machine
│   │   │   │   ├── content-version.service.ts
│   │   │   │   └── dto/...
│   │   │   ├── news/
│   │   │   ├── vacancies/
│   │   │   ├── interviews/
│   │   │   ├── pages/                  # static Page CRUD
│   │   │   ├── departments/
│   │   │   ├── search/
│   │   │   ├── audit/
│   │   │   ├── cache/
│   │   │   │   └── cache.service.ts    # Redis wrapper
│   │   │   ├── queue/
│   │   │   │   ├── queue.module.ts
│   │   │   │   ├── notifications.processor.ts
│   │   │   │   ├── vacancy-expiry.processor.ts
│   │   │   │   └── pdf-thumbnail.processor.ts
│   │   │   ├── analytics/
│   │   │   └── common/
│   │   │       ├── filters/
│   │   │       ├── interceptors/
│   │   │       ├── decorators/
│   │   │       └── pagination.ts
│   │   └── test/
│   │       ├── jest-e2e-setup.ts
│   │       └── helpers/
│   └── web/                        # Next.js (public + admin)
│       ├── package.json
│       ├── next.config.ts
│       ├── tsconfig.json
│       ├── vitest.config.ts
│       ├── playwright.config.ts
│       ├── messages/               # next-intl translation JSON
│       │   ├── sw.json
│       │   └── en.json
│       ├── public/
│       │   └── branding/           # coat of arms, colors assets
│       └── src/
│           ├── i18n.ts
│           ├── middleware.ts
│           ├── app/
│           │   ├── [locale]/
│           │   │   ├── layout.tsx
│           │   │   ├── page.tsx              # Home
│           │   │   ├── about/...
│           │   │   ├── organization/...
│           │   │   ├── services/page.tsx
│           │   │   ├── contact/page.tsx
│           │   │   ├── news/
│           │   │   ├── vacancies/
│           │   │   ├── interviews/
│           │   │   ├── search/page.tsx
│           │   │   └── external-links/page.tsx
│           │   └── admin/
│           │       ├── layout.tsx
│           │       ├── login/page.tsx
│           │       ├── dashboard/page.tsx
│           │       ├── news/...
│           │       ├── vacancies/...
│           │       ├── interviews/...
│           │       ├── pages/...
│           │       └── users/...
│           ├── components/
│           ├── lib/
│           │   ├── api.ts            # typed API client
│           │   └── seo.ts
│           └── styles/
├── packages/
│   ├── prisma/
│   │   ├── package.json
│   │   ├── schema.prisma
│   │   ├── seed.ts
│   │   └── migrations/
│   └── shared/
│       ├── package.json
│       └── src/
│           ├── types.ts              # shared DTO/response types
│           ├── enums.ts              # ContentStatus, UserRole, etc.
│           └── index.ts
└── docs/
    ├── CSC-ZNZ-WEB-Implementation-Plan.md   # this index
    ├── phase-1-foundation.md
    ├── phase-2-data-layer.md
    ├── phase-3-auth-rbac.md
    ├── phase-4-documents.md
    ├── phase-5-content-modules.md
    ├── phase-6-pages-i18n.md
    ├── phase-7-public-frontend.md
    ├── phase-8-admin-frontend.md
    └── phase-9-operations.md
```

**Responsibility boundaries:** `packages/shared` holds enums and DTO types imported by both apps (single source of truth for wire shapes). `packages/prisma` owns the schema, migrations, seed, and exports the generated client. Each NestJS domain module (news, vacancies, interviews, pages, documents, users) is self-contained with its own controller/service/DTO. The Next.js `app/[locale]` tree is the public SSR site; `app/admin` is the staff UI. No business logic in the frontend — it only calls the API and renders.

---

## Execution Handoff

Once all phase files are in place, choose an execution mode:

1. **Subagent-Driven (recommended)** — dispatch a fresh subagent per task, review between tasks, fast iteration. Use `superpowers:subagent-driven-development`.
2. **Inline Execution** — execute tasks in this session with checkpoints for review. Use `superpowers:executing-plans`.

Start with [phase-1-foundation.md](./phase-1-foundation.md).

---

*End of plan index.*