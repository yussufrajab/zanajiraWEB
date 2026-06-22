import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkflowService } from '../content/workflow.service';
import { ContentVersionService } from '../content/content-version.service';
import { CacheService } from '../cache/cache.service';
import { AuditService } from '../audit/audit.service';
import { DocumentsService } from '../documents/documents.service';
import { AuditAction, ContentStatus, UserRole } from '@zanweb/shared';
import { slugify, uniqueSlug } from '../common/slug.util';

@Injectable()
export class NewsService {
  constructor(
    private prisma: PrismaService,
    private workflow: WorkflowService,
    private versions: ContentVersionService,
    private cache: CacheService,
    private audit: AuditService,
    private docs: DocumentsService,
  ) {}

  async create(dto: any, user: { id: string; role: UserRole }) {
    const base = slugify(dto.titleSw);
    const slug = await uniqueSlug(base, (s) => this.prisma.newsPost.findUnique({ where: { slug: s } }).then(Boolean));
    const post = await this.prisma.newsPost.create({
      data: {
        slug,
        titleSw: dto.titleSw,
        titleEn: dto.titleEn ?? null,
        bodySw: dto.bodySw,
        bodyEn: dto.bodyEn ?? null,
        publishDate: dto.publishDate ? new Date(dto.publishDate) : new Date(),
        scheduledPublishAt: dto.scheduledPublishAt ? new Date(dto.scheduledPublishAt) : null,
        coverImageKey: dto.coverImageKey ?? null,
        status: ContentStatus.Draft,
        authorId: user.id,
      },
    });
    if (dto.documentIds?.length) {
      await this.docs.attachDocuments('NewsPost', post.id, dto.documentIds);
    }
    await this.versions.snapshot({ entityType: 'NewsPost', entityId: post.id, data: post as any, authorId: user.id });
    await this.audit.log({ userId: user.id, action: AuditAction.Create, entityType: 'NewsPost', entityId: post.id });
    return post;
  }

  async update(id: string, dto: any, user: { id: string; role: UserRole }) {
    await this.findOneOrThrow(id);
    const { documentIds, ...rest } = dto;
    const updated = await this.prisma.newsPost.update({
      where: { id },
      data: { ...rest, bodyEn: dto.bodyEn ?? null, titleEn: dto.titleEn ?? null },
    });
    await this.versions.snapshot({ entityType: 'NewsPost', entityId: id, data: updated as any, authorId: user.id });
    await this.audit.log({ userId: user.id, action: AuditAction.Update, entityType: 'NewsPost', entityId: id });
    await this.cache.invalidate('news:');
    return updated;
  }

  async transition(id: string, to: ContentStatus, user: { id: string; role: UserRole }) {
    const post = await this.findOneOrThrow(id);
    this.workflow.assertCanTransition(user.role, post.status as unknown as ContentStatus, to);
    const updated = await this.prisma.newsPost.update({ where: { id }, data: { status: to, reviewerId: user.id } });
    await this.versions.snapshot({ entityType: 'NewsPost', entityId: id, data: { status: to } as any, authorId: user.id });
    const action = to === ContentStatus.Published ? AuditAction.Publish : to === ContentStatus.Rejected ? AuditAction.Reject : AuditAction.Update;
    await this.audit.log({ userId: user.id, action, entityType: 'NewsPost', entityId: id });
    await this.cache.invalidate('news:');
    return updated;
  }

  async listPublic(args: { page: number; pageSize: number; dateFrom?: string; dateTo?: string; q?: string }) {
    const cacheKey = `news:list:${JSON.stringify(args)}`;
    const cached = await this.cache.get<any>(cacheKey);
    if (cached) return cached;

    const where: any = {
      status: ContentStatus.Published,
      publishDate: { lte: new Date() },
    };
    if (args.dateFrom || args.dateTo) {
      where.publishDate = { gte: args.dateFrom ? new Date(args.dateFrom) : undefined, lte: args.dateTo ? new Date(args.dateTo) : new Date() };
    }
    if (args.q) {
      where.OR = [
        { titleSw: { contains: args.q, mode: 'insensitive' } },
        { titleEn: { contains: args.q, mode: 'insensitive' } },
        { bodySw: { contains: args.q, mode: 'insensitive' } },
      ];
    }
    const [items, total] = await Promise.all([
      this.prisma.newsPost.findMany({ where, orderBy: { publishDate: 'desc' }, skip: (args.page - 1) * args.pageSize, take: args.pageSize }),
      this.prisma.newsPost.count({ where }),
    ]);
    const result = { items, total, page: args.page, pageSize: args.pageSize };
    await this.cache.set(cacheKey, result, 300);
    return result;
  }

  async getBySlug(slug: string) {
    return this.prisma.newsPost.findUnique({ where: { slug } });
  }

  async findById(id: string) {
    return this.findOneOrThrow(id);
  }

  async history(id: string) {
    return this.versions.history('NewsPost', id);
  }

  private async findOneOrThrow(id: string) {
    const post = await this.prisma.newsPost.findUnique({ where: { id } });
    if (!post) throw new NotFoundException('News post not found');
    return post;
  }
}