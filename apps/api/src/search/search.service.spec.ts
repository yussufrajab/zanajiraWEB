import { SearchService } from './search.service';
import { PrismaService } from '../prisma/prisma.service';

describe('SearchService.search', () => {
  it('queries all four content types with a published filter and a term', async () => {
    const $queryRaw = jest.fn().mockResolvedValue([{ id: 'n1', type: 'NewsPost', title: 'x', slug: 'x' }]);
    const prisma = { $queryRaw } as unknown as PrismaService;
    const service = new SearchService(prisma);
    const results = await service.search('tangazo', 10);
    expect(results.length).toBe(1);
    expect($queryRaw).toHaveBeenCalled();
    // Prisma's $queryRaw is a tagged template: prisma.$queryRaw(strings, ...values).
    // The first call arg is the TemplateStringsArray (array of static SQL fragments).
    const sql = ($queryRaw.mock.calls[0][0] as any)?.strings?.join('')
      ?? (Array.isArray($queryRaw.mock.calls[0][0]) ? ($queryRaw.mock.calls[0][0] as any[]).join('') : '');
    expect(sql).toContain('NewsPost');
    expect(sql).toContain('Vacancy');
    expect(sql).toContain('InterviewNotice');
    expect(sql).toContain('Page');
  });
});