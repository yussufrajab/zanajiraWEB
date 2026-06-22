import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SearchService {
  constructor(private prisma: PrismaService) {}

  async search(term: string, limit = 20): Promise<Array<{ id: string; type: string; slug: string; title: string | null; date: Date | null }>> {
    const rows = await this.prisma.$queryRaw`
      (SELECT id, 'NewsPost' AS type, slug, "titleSw" AS title, "publishDate" AS date FROM "NewsPost"
        WHERE status = 'Published' AND (to_tsvector('simple', coalesce("titleSw",'') || ' ' || coalesce("bodySw",'')) @@ plainto_tsquery('simple', ${term})))
      UNION ALL
      (SELECT id, 'Vacancy' AS type, slug, title, "publishDate" AS date FROM "Vacancy"
        WHERE status IN ('Published','Closed') AND (to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(mda,'')) @@ plainto_tsquery('simple', ${term})))
      UNION ALL
      (SELECT id, 'InterviewNotice' AS type, slug, title, "publishDate" AS date FROM "InterviewNotice"
        WHERE status = 'Published' AND (to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(mda,'')) @@ plainto_tsquery('simple', ${term})))
      UNION ALL
      (SELECT id, 'Page' AS type, slug, "titleSw" AS title, "updatedAt" AS date FROM "Page"
        WHERE (to_tsvector('simple', coalesce("titleSw",'') || ' ' || coalesce("bodySw",'')) @@ plainto_tsquery('simple', ${term})))
      ORDER BY date DESC NULLS LAST
      LIMIT ${limit};
    `;
    return rows as Array<{ id: string; type: string; slug: string; title: string | null; date: Date | null }>;
  }
}