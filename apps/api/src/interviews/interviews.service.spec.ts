import { Test } from '@nestjs/testing';
import { InterviewsService } from './interviews.service';
import { PrismaService } from '../prisma/prisma.service';
import { WorkflowService } from '../content/workflow.service';
import { ContentVersionService } from '../content/content-version.service';
import { CacheService } from '../cache/cache.service';
import { AuditService } from '../audit/audit.service';
import { DocumentsService } from '../documents/documents.service';
import { ContentStatus, InterviewType, UserRole } from '@zanweb/shared';
import { ForbiddenException } from '@nestjs/common';

describe('InterviewsService', () => {
  const prisma = {
    interviewNotice: {
      create: jest.fn().mockResolvedValue({ id: 'i1', slug: 's', status: ContentStatus.Draft }),
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
  const docs = { attachDocuments: jest.fn().mockResolvedValue({}) };
  let service: InterviewsService;
  const user = { id: 'u1', role: UserRole.Editor };

  beforeEach(async () => {
    prisma.interviewNotice.create.mockClear();
    const moduleRef = await Test.createTestingModule({
      providers: [
        InterviewsService,
        { provide: PrismaService, useValue: prisma },
        { provide: WorkflowService, useValue: workflow },
        { provide: ContentVersionService, useValue: versions },
        { provide: CacheService, useValue: cache },
        { provide: AuditService, useValue: audit },
        { provide: DocumentsService, useValue: docs },
      ],
    }).compile();
    service = moduleRef.get(InterviewsService);
  });

  it('creates a CallForInterview with wito- slug prefix', async () => {
    prisma.interviewNotice.findUnique.mockResolvedValue(null);
    await service.create({ title: 'Usaili', mda: 'Wizara', type: InterviewType.CallForInterview } as any, user);
    const arg = (prisma.interviewNotice.create as jest.Mock).mock.calls[0][0].data;
    expect(arg.slug.startsWith('wito-')).toBe(true);
  });

  it('creates an InterviewResult with matokeo- slug prefix', async () => {
    prisma.interviewNotice.findUnique.mockResolvedValue(null);
    await service.create({ title: 'Matokeo', mda: 'Wizara', type: InterviewType.InterviewResult } as any, user);
    const arg = (prisma.interviewNotice.create as jest.Mock).mock.calls[0][0].data;
    expect(arg.slug.startsWith('matokeo-')).toBe(true);
  });

  it('Editor cannot publish', async () => {
    prisma.interviewNotice.findUnique.mockResolvedValue({ id: 'i1', status: ContentStatus.InReview, authorId: 'u1' });
    await expect(service.transition('i1', ContentStatus.Published, user)).rejects.toThrow(ForbiddenException);
  });
});