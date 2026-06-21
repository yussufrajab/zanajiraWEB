# Phase 4 — Documents (Repository / Downloads)

> Part of the **CSC Zanzibar Public Website** implementation plan. See [`CSC-ZNZ-WEB-Implementation-Plan.md`](./CSC-ZNZ-WEB-Implementation-Plan.md) for the overview. Depends on [Phase 3](./phase-3-auth-rbac.md).
>
> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans`.

**Milestone:** Authenticated editors can upload PDF/DOCX/JPG/PNG files (size-limited), files are scanned by ClamAV before being committed to MinIO, and every document has a permanent, shareable download URL that increments a download counter. Public download endpoints require no auth but only serve documents belonging to published content.

**Requirements covered:** REQ-DOC-01 (permanent URLs), REQ-DOC-02 (type + size limits), REQ-DOC-03 (malware scan), REQ-DOC-04 (download counts), NFR 7.2 (file validation).

### Task 4.1: Storage service (MinIO wrapper)

**Files:**
- Create: `apps/api/src/documents/storage.service.ts`
- Create: `apps/api/src/documents/documents.module.ts`

- [ ] **Step 1: Write the failing test `apps/api/src/documents/storage.service.spec.ts`**

```typescript
import { StorageService } from './storage.service';

describe('StorageService.storageKey', () => {
  it('builds a key from ownerType, ownerId, filename', () => {
    const s = new StorageService({} as any, { get: () => 'http://localhost:9000/zanweb-documents' } as any);
    expect(s.buildKey('Vacancy', 'v1', 'tangazo.pdf')).toMatch(/^Vacancy\/v1\/[a-z0-9-]+-tangazo\.pdf$/);
  });
  it('builds a public URL from a key', () => {
    const s = new StorageService({} as any, { get: () => 'http://localhost:9000/zanweb-documents' } as any);
    expect(s.publicUrl('Vacancy/v1/tangazo.pdf')).toBe('http://localhost:9000/zanweb-documents/Vacancy/v1/tangazo.pdf');
  });
});
```

Run: `pnpm --filter @zanweb/api test src/documents/storage.service.spec.ts`
Expected: FAIL — `StorageService` missing.

- [ ] **Step 2: Implement `apps/api/src/documents/storage.service.ts`**

```typescript
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import { randomUUID } from 'crypto';

@Injectable()
export class StorageService implements OnModuleInit {
  private client: S3Client;
  private bucket: string;

  constructor(private config: ConfigService) {
    this.bucket = this.config.get<string>('S3_BUCKET')!;
    this.client = new S3Client({
      endpoint: this.config.get<string>('S3_ENDPOINT'),
      region: this.config.get<string>('S3_REGION') ?? 'us-east-1',
      forcePathStyle: true,
      credentials: {
        accessKeyId: this.config.get<string>('S3_ACCESS_KEY')!,
        secretAccessKey: this.config.get<string>('S3_SECRET_KEY')!,
      },
    });
  }

  onModuleInit() { /* client created eagerly above */ }

  buildKey(ownerType: string, ownerId: string, filename: string): string {
    const safe = filename.replace(/[^A-Za-z0-9.\-_]+/g, '-');
    return `${ownerType}/${ownerId}/${randomUUID()}-${safe}`;
  }

  async put(key: string, body: Buffer, mimeType: string): Promise<void> {
    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket, Key: key, Body: body, ContentType: mimeType,
    }));
  }

  async getStream(key: string): Promise<Readable> {
    const res = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    return res.Body as Readable;
  }

  publicUrl(key: string): string {
    const base = this.config.get<string>('S3_PUBLIC_BASE_URL')!;
    return `${base}/${key}`;
  }
}
```

- [ ] **Step 3: Run test**

Run: `pnpm --filter @zanweb/api test src/documents/storage.service.spec.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/documents/storage.service.ts apps/api/src/documents/storage.service.spec.ts
git commit -m "feat(documents): MinIO storage service with key/url helpers"
```

### Task 4.2: Malware scanner (ClamAV) — REQ-DOC-03

**Files:**
- Create: `apps/api/src/documents/malware-scanner.service.ts`

- [ ] **Step 1: Write the failing test `apps/api/src/documents/malware-scanner.service.spec.ts`**

```typescript
import { MalwareScannerService } from './malware-scanner.service';

describe('MalwareScannerService', () => {
  it('returns clean=true when scanner reports no virus', async () => {
    const scanner = new MalwareScannerService({} as any);
    (scanner as any).client = { isInfected: jest.fn().cb ? null : null };
    // simulate clamscan-style callback API
    (scanner as any).client = {
      isInfected: (_name: string, cb: (err: any, file: string, isInfected: boolean) => void) =>
        cb(null, 'x', false),
    };
    await expect(scanner.scanStream(Buffer.from('clean'))).resolves.toEqual({ clean: true });
  });

  it('returns clean=false when infected', async () => {
    const scanner = new MalwareScannerService({} as any);
    (scanner as any).client = {
      isInfected: (_name: string, cb: (err: any, file: string, isInfected: boolean) => void) =>
        cb(null, 'x', true),
    };
    await expect(scanner.scanStream(Buffer.from('bad'))).resolves.toEqual({ clean: false });
  });
});
```

Run: `pnpm --filter @zanweb/api test src/documents/malware-scanner.service.spec.ts`
Expected: FAIL.

- [ ] **Step 2: Implement `apps/api/src/documents/malware-scanner.service.ts`** (`clamscan` package)

```typescript
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as tmp from 'tmp';
import { createWriteStream } from 'fs';
import { promisify } from 'util';

const clamscanLib = require('clamscan');

export interface ScanResult { clean: boolean; }

@Injectable()
export class MalwareScannerService implements OnModuleInit {
  private readonly logger = new Logger(MalwareScannerService.name);
  private client: any;

  constructor(private config: ConfigService) {}

  async onModuleInit() {
    try {
      this.client = await clamscanLib.init({
        clamdscan: {
          host: this.config.get<string>('CLAMAV_HOST') ?? 'localhost',
          port: Number(this.config.get<string>('CLAMAV_PORT') ?? 3310),
        },
      });
    } catch (e) {
      this.logger.warn('ClamAV unavailable; uploads will be rejected in production. ' + (e as Error).message);
    }
  }

  scanStream(data: Buffer): Promise<ScanResult> {
    return new Promise((resolve, reject) => {
      if (!this.client) return resolve({ clean: false }); // fail-closed if scanner down
      tmp.file(async (err, path, _fd, cleanup) => {
        if (err) return reject(err);
        const ws = createWriteStream(path);
        ws.end(data);
        ws.on('finish', () => {
          this.client.isInfected(path, (e: any, _file: string, isInfected: boolean) => {
            cleanup();
            if (e) return reject(e);
            resolve({ clean: !isInfected });
          });
        });
      });
    });
  }
}
```

> Add deps `"tmp": "^0.2.3"` and `"@types/tmp": "^0.2.6"` to `apps/api/package.json`.

- [ ] **Step 3: Run test**

Run: `pnpm --filter @zanweb/api test src/documents/malware-scanner.service.spec.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/documents/malware-scanner.service.ts apps/api/src/documents/malware-scanner.service.spec.ts apps/api/package.json
git commit -m "feat(documents): ClamAV malware scanning (REQ-DOC-03)"
```

### Task 4.3: Documents service — upload + validation (REQ-DOC-01, REQ-DOC-02)

**Files:**
- Create: `apps/api/src/documents/documents.service.ts`
- Create: `apps/api/src/documents/documents.controller.ts`
- Modify: `apps/api/src/documents/documents.module.ts`

- [ ] **Step 1: Write the failing test `apps/api/src/documents/documents.service.spec.ts`**

```typescript
import { Test } from '@nestjs/testing';
import { DocumentsService } from './documents.service';
import { StorageService } from './storage.service';
import { MalwareScannerService } from './malware-scanner.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';

describe('DocumentsService.validateUpload', () => {
  let service: DocumentsService;
  const storage = { buildKey: jest.fn(), put: jest.fn(), publicUrl: jest.fn().mockReturnValue('u') };
  const scanner = { scanStream: jest.fn().mockResolvedValue({ clean: true }) };
  const prisma = { document: { create: jest.fn().mockResolvedValue({ id: 'd1' }) } };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        DocumentsService,
        { provide: StorageService, useValue: storage },
        { provide: MalwareScannerService, useValue: scanner },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = moduleRef.get(DocumentsService);
  });

  it('rejects disallowed mime type', async () => {
    await expect(service.upload({ buffer: Buffer.from('x'), mimetype: 'application/zip', originalname: 'a.zip', size: 10 } as any, 'Vacancy', 'v1'))
      .rejects.toThrow(BadRequestException);
  });

  it('rejects oversized file', async () => {
    await expect(service.upload({ buffer: Buffer.from('x'), mimetype: 'application/pdf', originalname: 'a.pdf', size: 26 * 1024 * 1024 } as any, 'Vacancy', 'v1'))
      .rejects.toThrow(BadRequestException);
  });

  it('rejects when scanner flags file', async () => {
    scanner.scanStream.mockResolvedValueOnce({ clean: false });
    await expect(service.upload({ buffer: Buffer.from('x'), mimetype: 'application/pdf', originalname: 'a.pdf', size: 10 } as any, 'Vacancy', 'v1'))
      .rejects.toThrow(BadRequestException);
  });

  it('stores and records a clean PDF', async () => {
    const doc = await service.upload({ buffer: Buffer.from('pdf'), mimetype: 'application/pdf', originalname: 'a.pdf', size: 3 } as any, 'Vacancy', 'v1');
    expect(doc.id).toBe('d1');
    expect(storage.put).toHaveBeenCalled();
    expect(prisma.document.create).toHaveBeenCalled();
  });
});
```

Run: `pnpm --filter @zanweb/api test src/documents/documents.service.spec.ts`
Expected: FAIL.

- [ ] **Step 2: Implement `apps/api/src/documents/documents.service.ts`**

```typescript
import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from './storage.service';
import { MalwareScannerService } from './malware-scanner.service';

const ALLOWED_MIME = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png'];
const MAX_SIZE = 25 * 1024 * 1024; // 25 MB

@Injectable()
export class DocumentsService {
  constructor(
    private storage: StorageService,
    private scanner: MalwareScannerService,
    private prisma: PrismaService,
  ) {}

  async upload(file: { buffer: Buffer; mimetype: string; originalname: string; size: number }, ownerType: string, ownerId: string) {
    if (!ALLOWED_MIME.includes(file.mimetype)) throw new BadRequestException('File type not allowed');
    if (file.size > MAX_SIZE) throw new BadRequestException('File exceeds 25MB limit');

    const { clean } = await this.scanner.scanStream(file.buffer);
    if (!clean) throw new BadRequestException('File failed malware scan');

    const key = this.storage.buildKey(ownerType, ownerId, file.originalname);
    await this.storage.put(key, file.buffer, file.mimetype);

    return this.prisma.document.create({
      data: {
        filename: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        storageKey: key,
        ownerType,
        ownerId,
        scannedClean: true,
      },
    });
  }

  async getByKey(storageKey: string) {
    return this.prisma.document.findUnique({ where: { storageKey } });
  }

  async registerDownload(documentId: string) {
    await this.prisma.document.update({ where: { id: documentId }, data: { downloadCount: { increment: 1 } } });
    await this.prisma.documentDownload.create({ data: { documentId } });
  }

  async listForOwner(ownerType: string, ownerId: string) {
    return this.prisma.document.findMany({ where: { ownerType, ownerId } });
  }
}
```

- [ ] **Step 3: Implement `apps/api/src/documents/documents.controller.ts`** (upload multipart + public download)

```typescript
import { Controller, Get, Param, Post, Res, StreamableFile, UploadedFile, UseGuards, UseInterceptors, BadRequestException, Header } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentsService } from './documents.service';
import { StorageService } from './storage.service';
import { Response } from 'express';
import { Readable } from 'stream';

@Controller('documents')
export class DocumentsController {
  constructor(private docs: DocumentsService, private storage: StorageService) {}

  @Post('upload/:ownerType/:ownerId')
  @UseGuards() // authenticated by default APP_GUARD
  @UseInterceptors(FileInterceptor('file'))
  upload(@UploadedFile() file: Express.Multer.File, @Param('ownerType') ownerType: string, @Param('ownerId') ownerId: string) {
    if (!file) throw new BadRequestException('No file uploaded');
    return this.docs.upload(file, ownerType, ownerId);
  }

  @Get('download/:id')
  @Header('Content-Disposition', 'attachment')
  async download(@Param('id') id: string, @Res({ passthrough: true }) res: Response): Promise<StreamableFile> {
    const doc = await this.docs.getByKey(id); // id used as storageKey alias? see note
    return new StreamableFile(await this.storage.getStream(doc.storageKey));
  }
}
```

> **Note:** the download route above uses `id` but calls `getByKey`. Make them consistent: implement `getById(id)` in the service and use it. Replace `this.docs.getByKey(id)` with `this.docs.getById(id)`. Add to `DocumentsService`:

```typescript
async getById(id: string) {
  return this.prisma.document.findUnique({ where: { id } });
}
```

Also add a memory Multer config so files are buffered (not disk-stored), passing to `FileInterceptor`:

```typescript
@UseInterceptors(FileInterceptor('file', { limits: { fileSize: 25 * 1024 * 1024 }, storage: undefined }))
```

Install `"multer": "^1.4.5-lts.1"` and `"@types/multer": "^1.4.11"`.

- [ ] **Step 4: Write `apps/api/src/documents/documents.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { StorageService } from './storage.service';
import { MalwareScannerService } from './malware-scanner.service';

@Module({
  controllers: [DocumentsController],
  providers: [DocumentsService, StorageService, MalwareScannerService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
```

- [ ] **Step 5: Wire `DocumentsModule` into `app.module.ts`** and run tests

Run: `pnpm --filter @zanweb/api test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/documents apps/api/src/app.module.ts apps/api/package.json
git commit -m "feat(documents): upload with validation + scan + download (REQ-DOC-01/02/03)"
```

### Task 4.4: Download count increment (REQ-DOC-04)

- [ ] **Step 1: Update the download route to register a download before streaming**

Replace the `download` method body:

```typescript
async download(@Param('id') id: string, @Res({ passthrough: true }) res: Response): Promise<StreamableFile> {
  const doc = await this.docs.getById(id);
  if (!doc) throw new NotFoundException('Document not found');
  await this.docs.registerDownload(id);
  res.setHeader('Content-Disposition', `attachment; filename="${doc.filename}"`);
  res.setHeader('Content-Type', doc.mimeType);
  return new StreamableFile(await this.storage.getStream(doc.storageKey));
}
```

Add `NotFoundException` to the imports from `@nestjs/common`. Mark the download route `@Public()` so job-seekers can fetch documents without a token, but only documents attached to *published* content should be downloadable — enforce in `getById` by joining to owner and checking status. For Phase 4 keep it simple; Phase 5 adds an ownership/status check when content modules attach documents.

- [ ] **Step 2: Write an integration check test `apps/api/src/documents/documents.service.download.spec.ts`**

```typescript
// verifies downloadCount increments and a DocumentDownload row is created
import { Test } from '@nestjs/testing';
import { DocumentsService } from './documents.service';
import { StorageService } from './storage.service';
import { MalwareScannerService } from './malware-scanner.service';
import { PrismaService } from '../prisma/prisma.service';

describe('DocumentsService.registerDownload', () => {
  it('increments count and logs a download', async () => {
    const prisma = {
      document: { update: jest.fn().mockResolvedValue({}) },
      documentDownload: { create: jest.fn().mockResolvedValue({}) },
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        DocumentsService,
        { provide: StorageService, useValue: {} },
        { provide: MalwareScannerService, useValue: {} },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    const service = moduleRef.get(DocumentsService);
    await service.registerDownload('d1');
    expect(prisma.document.update).toHaveBeenCalledWith({ where: { id: 'd1' }, data: { downloadCount: { increment: 1 } } });
    expect(prisma.documentDownload.create).toHaveBeenCalledWith({ data: { documentId: 'd1' } });
  });
});
```

Run: `pnpm --filter @zanweb/api test`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/documents
git commit -m "feat(documents): track download counts (REQ-DOC-04)"
```

### Task 4.5: Permanent URL surface (REQ-DOC-01)

- [ ] **Step 1: Add a `GET /api/documents/:id` public metadata endpoint** returning the permanent URL:

```typescript
@Get(':id')
@Public()
async meta(@Param('id') id: string) {
  const doc = await this.docs.getById(id);
  if (!doc) throw new NotFoundException('Document not found');
  return {
    id: doc.id,
    filename: doc.filename,
    mimeType: doc.mimeType,
    sizeBytes: doc.sizeBytes,
    downloadCount: doc.downloadCount,
    url: this.storage.publicUrl(doc.storageKey),
  };
}
```

Add `@Public()` and `NotFoundException`. This matches the `DocumentResponse` shape in `packages/shared`.

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/documents/documents.controller.ts
git commit -m "feat(documents): permanent public document metadata + URL (REQ-DOC-01)"
```

---