import { Test } from '@nestjs/testing';
import { AnalyticsService } from './analytics.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AnalyticsService', () => {
  const prisma = {
    pageView: { create: jest.fn().mockResolvedValue({ id: 'pv1' }) },
    documentDownload: { create: jest.fn().mockResolvedValue({ id: 'dd1' }) },
    $queryRaw: jest.fn().mockResolvedValue([{ month: '2026-06', count: 5 }]),
    vacancy: { groupBy: jest.fn().mockResolvedValue([{ mda: 'Wizara', _count: 3 }]) },
    document: { findMany: jest.fn().mockResolvedValue([{ id: 'd1', filename: 'a.pdf', downloadCount: 10 }]) },
  };
  let service: AnalyticsService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [AnalyticsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(AnalyticsService);
  });

  it('records a page view', async () => {
    await service.recordPageView('/en/news', 'en');
    expect(prisma.pageView.create).toHaveBeenCalledWith({ data: { path: '/en/news', locale: 'en' } });
  });

  it('records a document download', async () => {
    await service.recordDownload('d1');
    expect(prisma.documentDownload.create).toHaveBeenCalledWith({ data: { documentId: 'd1' } });
  });

  it('returns dashboard summary', async () => {
    const res = await service.dashboard();
    expect(res.byMonth).toEqual([{ month: '2026-06', count: 5 }]);
    expect(res.byMda).toEqual([{ mda: 'Wizara', _count: 3 }]);
    expect(res.topDocs).toEqual([{ id: 'd1', filename: 'a.pdf', downloadCount: 10 }]);
  });
});
