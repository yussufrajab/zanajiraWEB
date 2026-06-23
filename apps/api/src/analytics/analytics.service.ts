import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  recordPageView(path: string, locale: string) {
    return this.prisma.pageView.create({ data: { path, locale } });
  }

  recordDownload(documentId: string) {
    return this.prisma.documentDownload.create({ data: { documentId } });
  }

  async dashboard() {
    const [byMonth, byMdaRaw, topDocs] = await Promise.all([
      this.prisma.$queryRaw`
        SELECT to_char(date_trunc('month', "publishDate"), 'YYYY-MM') AS month,
               COUNT(*) AS count
        FROM (SELECT "publishDate" FROM "NewsPost" WHERE status='Published'
              UNION ALL SELECT "publishDate" FROM "Vacancy" WHERE status IN ('Published','Closed')
              UNION ALL SELECT "publishDate" FROM "InterviewNotice" WHERE status='Published') p
        GROUP BY 1 ORDER BY 1 DESC LIMIT 12` as unknown as { month: string; count: number }[],
      this.prisma.vacancy.groupBy({
        by: ['mda'],
        where: { status: { in: ['Published', 'Closed'] } },
        _count: true,
        orderBy: { _count: { mda: 'desc' } },
        take: 10,
      }) as unknown as { mda: string; _count: { mda: number } }[],
      this.prisma.document.findMany({
        orderBy: { downloadCount: 'desc' },
        take: 10,
        select: { id: true, filename: true, downloadCount: true },
      }),
    ]);

    const byMda = byMdaRaw.map((row) => ({ mda: row.mda, _count: row._count.mda }));

    return { byMonth, byMda, topDocs };
  }
}
