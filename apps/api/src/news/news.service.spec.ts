import { Test } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { NewsService } from './news.service';
import { QUEUES } from '../queue/queue.constants';
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
  const versions = { snapshot: jest.fn().mockResolvedValue({}), history: jest.fn().mockResolvedValue([]) };
  const cache = { invalidate: jest.fn().mockResolvedValue(undefined), get: jest.fn().mockResolvedValue(null), set: jest.fn().mockResolvedValue(undefined) };
  const audit = { log: jest.fn().mockResolvedValue({}) };
  const docs = { listForOwner: jest.fn().mockResolvedValue([]), attachDocuments: jest.fn().mockResolvedValue({}) };
  const notificationsQueue = { add: jest.fn().mockResolvedValue({}) };
  let service: NewsService;
  const user = { id: 'u1', role: UserRole.Editor };

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
        { provide: getQueueToken(QUEUES.notifications), useValue: notificationsQueue },
      ],
    }).compile();
    service = moduleRef.get(NewsService);
  });

  it('creates a draft news post with a unique slug', async () => {
    prisma.newsPost.findUnique.mockResolvedValue(null);
    const res = await service.create({ titleSw: 'Habari Mpya', bodySw: 'body' } as any, user);
    expect(res.id).toBe('n1');
    expect(prisma.newsPost.create).toHaveBeenCalled();
  });

  it('submitForReview moves Draft -> InReview for Editor', async () => {
    prisma.newsPost.findUnique.mockResolvedValue({ id: 'n1', status: ContentStatus.Draft, authorId: 'u1' });
    prisma.newsPost.update.mockResolvedValue({ id: 'n1', status: ContentStatus.InReview });
    const res = await service.transition('n1', ContentStatus.InReview, user);
    expect(res.status).toBe(ContentStatus.InReview);
  });

  it('Editor cannot publish', async () => {
    prisma.newsPost.findUnique.mockResolvedValue({ id: 'n1', status: ContentStatus.InReview, authorId: 'u1' });
    await expect(service.transition('n1', ContentStatus.Published, user))
      .rejects.toThrow(ForbiddenException);
  });

  it('cannot transition Draft -> Published directly', async () => {
    prisma.newsPost.findUnique.mockResolvedValue({ id: 'n1', status: ContentStatus.Draft, authorId: 'u1' });
    await expect(service.transition('n1', ContentStatus.Published, { id: 'u1', role: UserRole.Administrator }))
      .rejects.toThrow(BadRequestException);
  });

  it('transition enqueues a submitted notification', async () => {
    prisma.newsPost.findUnique.mockResolvedValue({ id: 'n1', status: ContentStatus.Draft, authorId: 'u1' });
    prisma.newsPost.update.mockResolvedValue({ id: 'n1', status: ContentStatus.InReview });
    await service.transition('n1', ContentStatus.InReview, user);
    expect(notificationsQueue.add).toHaveBeenCalledWith('notify', {
      kind: 'submitted',
      entityType: 'NewsPost',
      entityId: 'n1',
      actorId: 'u1',
    });
  });

  it('listPublic returns cached result when present', async () => {
    cache.get.mockResolvedValueOnce({ items: [{ id: 'cached' }], total: 1, page: 1, pageSize: 10 });
    const res = await service.listPublic({ page: 1, pageSize: 10 });
    expect(res.items[0].id).toBe('cached');
    expect(prisma.newsPost.findMany).not.toHaveBeenCalled();
  });
});