import { Test } from '@nestjs/testing';
import { VacanciesService } from './vacancies.service';
import { PrismaService } from '../prisma/prisma.service';
import { WorkflowService } from '../content/workflow.service';
import { ContentVersionService } from '../content/content-version.service';
import { CacheService } from '../cache/cache.service';
import { AuditService } from '../audit/audit.service';
import { UserRole, VacancyStatus } from '@zanweb/shared';
import { ForbiddenException, BadRequestException } from '@nestjs/common';

describe('VacanciesService', () => {
  const prisma = {
    vacancy: {
      create: jest.fn().mockResolvedValue({ id: 'v1', slug: 's', status: VacancyStatus.Draft }),
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
  };
  const workflow = new WorkflowService();
  const versions = { snapshot: jest.fn().mockResolvedValue({}), history: jest.fn().mockResolvedValue([]) };
  const cache = { invalidate: jest.fn().mockResolvedValue(undefined), get: jest.fn().mockResolvedValue(null), set: jest.fn().mockResolvedValue(undefined) };
  const audit = { log: jest.fn().mockResolvedValue({}) };
  let service: VacanciesService;
  const user = { id: 'u1', role: UserRole.Editor };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        VacanciesService,
        { provide: PrismaService, useValue: prisma },
        { provide: WorkflowService, useValue: workflow },
        { provide: ContentVersionService, useValue: versions },
        { provide: CacheService, useValue: cache },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();
    service = moduleRef.get(VacanciesService);
  });

  it('creates a vacancy with a unique slug', async () => {
    prisma.vacancy.findUnique.mockResolvedValue(null);
    const res = await service.create({ title: 'Nafasi za Kazi', mda: 'Wizara', closingDate: '2026-12-31' } as any, user);
    expect(res.id).toBe('v1');
    expect(prisma.vacancy.create).toHaveBeenCalled();
  });

  it('Editor cannot publish (Draft->Published via transition)', async () => {
    prisma.vacancy.findUnique.mockResolvedValue({ id: 'v1', status: VacancyStatus.InReview, authorId: 'u1' });
    await expect(service.transition('v1', VacancyStatus.Published, user)).rejects.toThrow(ForbiddenException);
  });

  it('cannot jump Draft -> Published directly', async () => {
    prisma.vacancy.findUnique.mockResolvedValue({ id: 'v1', status: VacancyStatus.Draft, authorId: 'u1' });
    await expect(service.transition('v1', VacancyStatus.Published, { id: 'u1', role: UserRole.Administrator }))
      .rejects.toThrow(BadRequestException);
  });

  it('autoCloseExpired sets Published past closingDate to Closed', async () => {
    const now = new Date('2026-12-31');
    await service.autoCloseExpired(now);
    expect(prisma.vacancy.updateMany).toHaveBeenCalledWith({
      where: { status: VacancyStatus.Published, closingDate: { lt: now } },
      data: { status: VacancyStatus.Closed },
    });
  });
});