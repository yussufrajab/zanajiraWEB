import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction, UserRole } from '@zanweb/shared';

@Injectable()
export class PagesService {
  constructor(private prisma: PrismaService, private cache: CacheService, private audit: AuditService) {}

  async upsert(dto: any, user: { id: string; role: UserRole }) {
    const page = await this.prisma.page.upsert({
      where: { slug: dto.slug },
      update: { titleSw: dto.titleSw, titleEn: dto.titleEn ?? null, bodySw: dto.bodySw, bodyEn: dto.bodyEn ?? null, parentId: dto.parentId ?? null },
      create: { slug: dto.slug, titleSw: dto.titleSw, titleEn: dto.titleEn ?? null, bodySw: dto.bodySw, bodyEn: dto.bodyEn ?? null, parentId: dto.parentId ?? null },
    });
    await this.audit.log({ userId: user.id, action: AuditAction.Update, entityType: 'Page', entityId: page.id });
    await this.cache.invalidate('pages:');
    return page;
  }

  async getBySlug(slug: string) {
    const cached = await this.cache.get<any>(`pages:slug:${slug}`);
    if (cached) return cached;
    const page = await this.prisma.page.findUnique({ where: { slug } });
    if (!page) throw new NotFoundException('Page not found');
    await this.cache.set(`pages:slug:${slug}`, page, 600);
    return page;
  }

  list() { return this.prisma.page.findMany({ orderBy: { slug: 'asc' } }); }

  tree() {
    return this.prisma.page.findMany({ where: { parentId: null }, include: { children: true }, orderBy: { slug: 'asc' } });
  }
}