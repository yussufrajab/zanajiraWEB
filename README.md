# CSC Zanzibar Web (zanweb)

Official website of the **Civil Service Commission of Zanzibar** (Tume ya Utumishi wa Umma – Zanzibar). A bilingual (English / Kiswahili) web application for publishing public sector job vacancies, interview calls, news, and general commission information.

## Features

- **Bilingual content** — full English / Kiswahili support with server-side i18n via `next-intl`
- **Vacancy announcements** — browse and filter open/closed public sector job postings
- **Call for interviews** — publish interview invitations and results
- **News & announcements** — categorized news with date-range and keyword filters
- **Admin dashboard** — role-based content management (Editor, Reviewer, Administrator)
- **Document management** — upload/download vacancy documents with ClamAV virus scanning
- **User management** — admin user creation with invite tokens and MFA support
- **Search** — full-text search across news, vacancies, and interviews
- **CMS pages** — dynamic pages (About, Services, Organization Structure, etc.)
- **Photo slideshow** — image carousel on the homepage
- **External links** — quick-access portal for ZanAjira, HRMS, Staff Email, and other government systems

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | [Next.js 14](https://nextjs.org/) (App Router), [React 18](https://react.dev/), [TypeScript](https://www.typescriptlang.org/) |
| **i18n** | [next-intl](https://next-intl-docs.vercel.app/) — server-side internationalization |
| **Backend** | [NestJS 10](https://nestjs.com/) — modular Node.js API framework |
| **ORM** | [Prisma](https://www.prisma.io/) with PostgreSQL |
| **Database** | PostgreSQL 16 |
| **Cache / Queue** | Redis 7 (via [BullMQ](https://docs.bullmq.io/) for background jobs) |
| **Auth** | Passport (JWT), bcrypt, OTP (MFA via otplib) |
| **File storage** | MinIO (S3-compatible) for document uploads, ClamAV for malware scanning |
| **Email** | Nodemailer (SMTP) |
| **PDF** | pdf2pic — thumbnail generation for uploaded documents |
| **API docs** | Swagger / OpenAPI via `@nestjs/swagger` |
| **Package manager** | [pnpm](https://pnpm.io/) workspaces (monorepo) |
| **Testing** | Jest (API unit/e2e), Vitest + Playwright (web) |
| **Font** | [Inter](https://rsms.me/inter/) via `next/font/google` |
| **Infrastructure** | Bare-metal / VM (no Docker), Nginx reverse proxy, Systemd service units |

## Project Structure

```
zanweb/
├── apps/
│   ├── api/                    # NestJS backend (port 4000)
│   │   └── src/
│   │       ├── auth/           # JWT auth, MFA, RBAC guards
│   │       ├── content/        # News, vacancies, interviews, pages
│   │       ├── documents/      # File upload/download, virus scan
│   │       ├── users/          # User CRUD & invite tokens
│   │       ├── analytics/      # Basic request analytics
│   │       ├── search/         # Full-text search across types
│   │       ├── notifications/  # Email notifications via BullMQ
│   │       └── prisma/         # Prisma client module
│   └── web/                    # Next.js frontend (port 3000)
│       └── src/
│           ├── app/
│           │   ├── [locale]/   # Public pages (news, vacancies, interviews, etc.)
│           │   └── admin/      # Admin dashboard pages
│           ├── components/
│           │   ├── admin/      # Admin form components
│           │   ├── Header.tsx
│           │   ├── Footer.tsx
│           │   ├── PhotoSlideshow.tsx
│           │   └── ...
│           ├── lib/            # API client, i18n helpers
│           ├── messages/       # en.json, sw.json translation files
│           └── styles/         # globals.css, admin.css
├── packages/
│   ├── prisma/                 # Prisma schema, migrations, seed
│   └── shared/                 # Shared TypeScript types & enums
├── infra/                      # Deployment infrastructure
│   ├── nginx/site.conf         # Nginx reverse proxy config
│   ├── systemd/                # Systemd service units (api, web)
│   ├── clamav/                 # ClamAV daemon config
│   ├── deploy.sh               # Production deployment script
│   ├── backup.sh               # Database + S3 backups
│   └── restore.sh              # Restore from backup
├── manage.sh                   # Dev/prod service management script
└── pics/                       # Source photos for homepage slideshow
```

## Prerequisites

- **Node.js** >= 20.10.0
- **pnpm** 9.x (`npm install -g pnpm@9`)
- **PostgreSQL** 16 (running locally)
- **Redis** 7 (running locally)
- **MinIO** server (or S3-compatible storage)

### Optional for production

- **ClamAV** (`clamav-daemon`) — virus scanning for uploaded documents
- **Nginx** — reverse proxy
- **Systemd** — daemon management

## Getting Started

### 1. Clone and install dependencies

```bash
git clone https://github.com/yussufrajab/zanajiraWEB.git
cd zanajiraWEB
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your local database, Redis, MinIO credentials
```

### 3. Set up the database

```bash
pnpm prisma:migrate
pnpm prisma:seed    # Seeds initial admin user + sample content
```

### 4. Start backing services

```bash
./manage.sh start   # Starts PostgreSQL, Redis, MinIO (assumes they're installed)
```

Or start them directly if you manage them separately:
```bash
sudo systemctl start postgresql redis-server minio
```

### 5. Run database migrations

```bash
pnpm prisma:migrate
```

### 6. Start development servers

```bash
# Terminal 1 — API (NestJS, port 4000)
pnpm dev:api

# Terminal 2 — Web (Next.js, port 3000)
pnpm dev:web
```

Or use the all-in-one command:

```bash
pnpm dev
```

Visit **http://localhost:3000** (frontend) and **http://localhost:4000/api/docs** (Swagger API docs).

### 7. Create an admin user

After seeding, log in at `/admin/login` with the seeded admin credentials (check `seed.ts` for default credentials).

## Available Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start both API and web in dev mode |
| `pnpm dev:api` | Start API server only |
| `pnpm dev:web` | Start web frontend only |
| `pnpm build` | Build all packages and apps |
| `pnpm test` | Run all tests |
| `pnpm lint` | Run ESLint across all apps |
| `pnpm prisma:migrate` | Run database migrations |
| `pnpm prisma:seed` | Seed database with sample data |
| `pnpm services:start` | Start backing services via manage.sh |
| `pnpm apps:start` | Start built API + web for production |

## API

The NestJS API runs on port **4000** by default. Swagger documentation is available at:

```
http://localhost:4000/api/docs
```

Key endpoints:
- `GET /api/news` — list news with optional filters
- `GET /api/vacancies` — list vacancies with optional filters
- `GET /api/interviews` — list interview calls/results
- `POST /api/auth/login` — admin authentication
- `GET /api/search?q=` — full-text search

## Deployment

See `infra/README.md` for production deployment instructions. The project uses a bare-metal approach with:

- Systemd service units for API and web
- Nginx reverse proxy with static asset caching
- Native PostgreSQL, Redis, and MinIO services
- Automated backups via `infra/backup.sh`

```bash
# Deploy production build
./infra/deploy.sh
```

## License

© 2026 Civil Service Commission – Zanzibar. All rights reserved.
