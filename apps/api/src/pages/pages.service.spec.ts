import { Test } from '@nestjs/testing';
import { PagesService } from './pages.service';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { AuditService } from '../audit/audit.service';
import { UserRole } from '@zanweb/shared';

describe('PagesService', () => {
  const prisma = {
    page: {
      upsert: jest.fn().mockResolvedValue({ id: 'p1', slug: 'about' }),
      findUnique: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
    },
  };
  const cache = { invalidate: jest.fn().mockResolvedValue({}), get: jest.fn().mockResolvedValue(null), set: jest.fn() };
  const audit = { log: jest.fn().mockResolvedValue({}) };
  let service: PagesService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        PagesService,
        { provide: PrismaService, useValue: prisma },
        { provide: CacheService, useValue: cache },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();
    service = moduleRef.get(PagesService);
  });

  it('upserts a page by slug', async () => {
    const res = await service.upsert({ slug: 'about', titleSw: 'Kuhutu', bodySw: 'body' }, { id: 'u1', role: UserRole.Administrator });
    expect(res.id).toBe('p1');
    expect(prisma.page.upsert).toHaveBeenCalled();
    expect(cache.invalidate).toHaveBeenCalledWith('pages:');
  });

  it('getBySlug returns cached if present', async () => {
    cache.get.mockResolvedValueOnce({ id: 'cached' });
    const res = await service.getBySlug('about');
    expect(res).toEqual({ id: 'cached' });
  });
});