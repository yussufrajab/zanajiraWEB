# Phase 1 — Foundation

> Part of the **CSC Zanzibar Public Website** implementation plan. See [`CSC-ZNZ-WEB-Implementation-Plan.md`](./CSC-ZNZ-WEB-Implementation-Plan.md) for the overview, file-structure map, and phase index.
>
> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Milestone:** A runnable monorepo with both apps booting, lint/typecheck/test commands wired, and a `manage.sh` script that starts/stops/statuses the native backing services (Postgres, Redis, MinIO, ClamAV). No Docker.

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
    "services:start": "./manage.sh start",
    "services:stop": "./manage.sh stop",
    "services:status": "./manage.sh status",
    "apps:start": "./manage.sh start-apps",
    "apps:stop": "./manage.sh stop-apps"
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

### Task 1.2: `manage.sh` service manager (native services, no Docker)

**Decision (user):** No Docker anywhere. The backing services (PostgreSQL, Redis, MinIO, ClamAV) are **pre-installed native services on the host**, started/stopped/restarted by a `manage.sh` script. The app processes (NestJS API, Next.js web) also run as native processes managed by the same script.

**Files:**
- Create: `/home/yusuf/zanWEB/manage.sh`
- Create: `/home/yusuf/zanWEB/infra/clamav/clamav.conf`
- Create: `/home/yusuf/zanWEB/infra/README.md`
- Remove: `/home/yusuf/zanWEB/docker-compose.yml` (was committed in error during the first attempt; `git rm` it)

- [ ] **Step 1: Remove the mistakenly-committed `docker-compose.yml`**

```bash
cd /home/yusuf/zanWEB
git rm -f docker-compose.yml
```

- [ ] **Step 2: Write `infra/clamav/clamav.conf`** (native clamd config; the host `clamav-daemon` service can use this)

```
# clamd configuration for CSC Zanzibar (native, no Docker)
LogFile /tmp/clamd.log
LogFileMaxSize 2M
LogTime yes
LogClean yes
TCPSocket 3310
TCPAddr 127.0.0.1
MaxThreads 12
ReadTimeout 180
CommandReadTimeout 30
StreamMaxLength 25M
```

(`StreamMaxLength 25M` matches the 25MB upload cap in the documents module.)

- [ ] **Step 3: Write `manage.sh`**

```bash
#!/usr/bin/env bash
# manage.sh — start/stop/restart/status for CSC Zanzibar native services + apps.
# No Docker. Backing services are pre-installed on the host.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

# Load .env if present (do not fail if missing — only apps need it)
if [[ -f .env ]]; then set -a; . ./.env; set +a; fi

PID_DIR="${ROOT_DIR}/.run"
mkdir -p "$PID_DIR"
LOG_DIR="${ROOT_DIR}/.run/logs"
mkdir -p "$LOG_DIR"

API_PORT="${API_PORT:-4000}"
WEB_PORT="${WEB_PORT:-3000}"
MINIO_DATA="${MINIO_DATA:-${ROOT_DIR}/.run/minio-data}"
MINIO_PORT="${MINIO_PORT:-9000}"
MINIO_CONSOLE_PORT="${MINIO_CONSOLE_PORT:-9001}"

# ---------- helpers ----------
c_red() { printf '\033[31m%s\033[0m' "$1"; }
c_grn() { printf '\033[32m%s\033[0m' "$1"; }
c_ylw() { printf '\033[33m%s\033[0m' "$1"; }

pid_alive() { local p; p="${1:-}"; [[ -n "$p" ]] && kill -0 "$p" 2>/dev/null; }

start_bg() { # <name> <pidfile> <logfile> <command...>
  local name="$1" pidfile="$2" logfile="$3"; shift 3
  if pid_alive "$(cat "$pidfile" 2>/dev/null || true)"; then
    echo "$(c_ylw "$name already running")"; return 0
  fi
  echo "Starting $name ..."
  nohup "$@" >>"$logfile" 2>&1 &
  echo $! > "$pidfile"
  sleep 0.3
  if pid_alive "$(cat "$pidfile")"; then echo "$(c_grn "$name started (pid $(cat "$pidfile"))")";
  else echo "$(c_red "$name failed to start — see $logfile")"; return 1; fi
}

stop_bg() { # <name> <pidfile>
  local name="$1" pidfile="$2" p
  p="$(cat "$pidfile" 2>/dev/null || true)"
  if pid_alive "$p"; then
    kill "$p" 2>/dev/null || true
    for _ in {1..10}; do pid_alive "$p" || break; sleep 0.3; done
    pid_alive "$p" && kill -9 "$p" 2>/dev/null || true
    echo "$(c_grn "$name stopped")"
  else
    echo "$(c_ylw "$name not running")"
  fi
  rm -f "$pidfile"
}

# ---------- native backing services (pre-installed) ----------
svc_start() { # <name> <start-cmd...>
  local name="$1"; shift
  if command -v systemctl >/dev/null 2>&1 && systemctl list-unit-files 2>/dev/null | grep -q "^$name\.service"; then
    sudo -n systemctl start "$name" 2>/dev/null || systemctl start "$name" 2>/dev/null || "$@"
  else
    "$@"
  fi
}
svc_stop() { # <name> <stop-cmd...>
  local name="$1"; shift
  if command -v systemctl >/dev/null 2>&1 && systemctl list-unit-files 2>/dev/null | grep -q "^$name\.service"; then
    sudo -n systemctl stop "$name" 2>/dev/null || systemctl stop "$name" 2>/dev/null || "$@"
  else
    "$@"
  fi
}
svc_status() { # <name>
  if command -v systemctl >/dev/null 2>&1 && systemctl list-unit-files 2>/dev/null | grep -q "^$1\.service"; then
    systemctl is-active "$1" 2>/dev/null || echo "inactive"
  else echo "unknown (no systemd unit)"; fi
}

postgres_start() {
  svc_start postgresql pg_ctlcluster 16 main start 2>/dev/null || \
    (command -v pg_ctlcluster >/dev/null && pg_ctlcluster 16 main start) || \
    (command -v service >/dev/null && service postgresql start)
}
postgres_stop()  {
  svc_stop postgresql pg_ctlcluster 16 main stop 2>/dev/null || \
    (command -v pg_ctlcluster >/dev/null && pg_ctlcluster 16 main stop) || \
    (command -v service >/dev/null && service postgresql stop)
}
redis_start()   { svc_start redis-server redis-server --daemonize yes; }
redis_stop()    { svc_stop redis-server redis-cli shutdown nosave 2>/dev/null || true; }
clamav_start()  { svc_start clamav-daemon clamd --config-file="$ROOT_DIR/infra/clamav/clamav.conf" 2>/dev/null || true; }
clamav_stop()   { svc_stop clamav-daemon pkill -TERM -x clamd 2>/dev/null || true; }

minio_start() {
  mkdir -p "$MINIO_DATA"
  start_bg minio "$PID_DIR/minio.pid" "$LOG_DIR/minio.log" \
    minio server "$MINIO_DATA" --address ":${MINIO_PORT}" --console-address ":${MINIO_CONSOLE_PORT}"
}
minio_stop()  { stop_bg minio "$PID_DIR/minio.pid"; }

# ensure the documents bucket exists once minio is up
minio_ensure_bucket() {
  command -v mc >/dev/null 2>&1 || return 0
  mc alias set local "http://127.0.0.1:${MINIO_PORT}" "${S3_ACCESS_KEY:-minioadmin}" "${S3_SECRET_KEY:-minioadmin}" >/dev/null 2>&1 || true
  mc mb "local/${S3_BUCKET:-zanweb-documents}" --ignore-existing >/dev/null 2>&1 || true
}

# ---------- apps ----------
api_start() {
  start_bg api "$PID_DIR/api.pid" "$LOG_DIR/api.log" \
    node "$ROOT_DIR/apps/api/dist/main.js"
}
api_stop()  { stop_bg api "$PID_DIR/api.pid"; }
web_start() {
  start_bg web "$PID_DIR/web.pid" "$LOG_DIR/web.log" \
    node "$ROOT_DIR/apps/web/server.js"
}
web_stop()  { stop_bg web "$PID_DIR/web.pid"; }

# ---------- commands ----------
SERVICES=(postgres redis minio clamav)
APPS=(api web)

cmd_start() {
  postgres_start; redis_start; minio_start; clamav_start
  minio_ensure_bucket
}
cmd_stop()  { web_stop; api_stop; clamav_stop; minio_stop; redis_stop; postgres_stop; }
cmd_restart(){ cmd_stop; sleep 1; cmd_start; }
cmd_start_apps(){ api_start; web_start; }
cmd_stop_apps(){ web_stop; api_stop; }

cmd_status() {
  for s in "${SERVICES[@]}"; do printf '%-10s %s\n' "$s" "$(svc_status "$s")"; done
  for a in "${APPS[@]}"; do
    local p; p="$(cat "$PID_DIR/$a.pid" 2>/dev/null || true)"
    if pid_alive "$p"; then printf '%-10s %s\n' "$a" "running (pid $p)"; else printf '%-10s %s\n' "$a" "stopped"; fi
  done
}

usage() {
  cat <<EOF
Usage: ./manage.sh <command>
Commands:
  start          start backing services (postgres, redis, minio, clamav) + ensure bucket
  stop           stop everything (apps first, then services)
  restart        stop then start
  start-apps     start api + web (after deps are up and built)
  stop-apps      stop api + web
  status         show status of services + apps
EOF
}

case "${1:-}" in
  start) cmd_start ;;
  stop) cmd_stop ;;
  restart) cmd_restart ;;
  start-apps) cmd_start_apps ;;
  stop-apps) cmd_stop_apps ;;
  status) cmd_status ;;
  *) usage; exit 1 ;;
esac
```

Make it executable: `chmod +x manage.sh`.

> **Notes for the implementer:**
> - This script intentionally degrades gracefully when a service isn't installed or systemd isn't present — it never hard-fails the whole `start` on one missing native service, because dev boxes vary. Each service function tries systemd → direct cluster/binary command → `service`.
> - `.run/` (pidfiles + logs + minio data) is build/runtime state. Add `.run/` to `.gitignore` (append a line) so it is never committed.
> - `start-apps` assumes `apps/api/dist/main.js` and `apps/web/server.js` exist (built in later phases). In Phase 1 these don't exist yet — `start-apps` will log a failure, which is expected. Only `start`/`stop`/`status` for the backing services are exercised in Phase 1.
> - `sudo -n` is tried first (non-interactive) for systemd so the script can run unattended; it falls back to the direct command otherwise.

- [ ] **Step 4: Append `.run/` to `.gitignore`**

Add this line to `.gitignore` (create a `# runtime` section if you like):

```gitignore
# runtime (manage.sh pidfiles, logs, minio data)
.run/
```

- [ ] **Step 5: Fix the already-committed `package.json` scripts** (Task 1.1 committed `docker:up`/`docker:down`, which must be removed since there is no Docker). Replace those two lines in `package.json` `scripts` with:

```json
    "services:start": "./manage.sh start",
    "services:stop": "./manage.sh stop",
    "services:status": "./manage.sh status",
    "apps:start": "./manage.sh start-apps",
    "apps:stop": "./manage.sh stop-apps"
```

Verify the JSON still parses: `node -e "JSON.parse(require('fs').readFileSync('package.json','utf8'))"`.

- [ ] **Step 6: Write `infra/README.md`** documenting the no-Docker model

```markdown
# Infrastructure (no Docker)

Per project decision, this project does **not** use Docker. Backing services run
as **pre-installed native services** on the host, managed by `../manage.sh`.

## Required host packages
Install these on the host before running `./manage.sh start`:
- PostgreSQL 16 (cluster `main`, user/db per `.env` `DATABASE_URL`)
- Redis 7
- MinIO server + `mc` client
- ClamAV (`clamav-daemon`, uses `infra/clamav/clamav.conf`)

## Usage
- `./manage.sh start`   — start backing services + ensure the documents bucket
- `./manage.sh start-apps` — start API + web (after `pnpm build`)
- `./manage.sh stop`    — stop everything
- `./manage.sh status`  — show service + app status

## Production
Bare-metal / VM with Nginx installed on the host (see `infra/nginx/site.conf`).
Optional systemd units live in `infra/systemd/`. Backups via `infra/backup.sh`
(native `pg_dump` + `mc mirror`).
```

- [ ] **Step 7: Verify the script syntax (does NOT require services installed)**

Run: `bash -n manage.sh && ./manage.sh status`
Expected: `bash -n` passes (no syntax errors); `./manage.sh status` prints a status table (services may show `inactive`/`unknown` and apps `stopped` — that is fine; the point is the script runs without error).

- [ ] **Step 8: Commit**

```bash
git add manage.sh infra/clamav/clamav.conf infra/README.md .gitignore package.json
git commit -m "chore: replace docker stack with manage.sh native service manager"
```

End commit messages with:
Co-Authored-By: Claude <noreply@anthropic.com>

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