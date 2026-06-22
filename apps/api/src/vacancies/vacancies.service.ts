import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkflowService } from '../content/workflow.service';
import { ContentVersionService } from '../content/content-version.service';
import { CacheService } from '../cache/cache.service';
import { AuditService } from '../audit/audit.service';
import { DocumentsService } from '../documents/documents.service';
import { AuditAction, ContentStatus, UserRole, VacancyStatus } from '@zanweb/shared';
import { slugify, uniqueSlug } from '../common/slug.util';

@Injectable()
export class VacanciesService {
  constructor(
    private prisma: PrismaService,
    private workflow: WorkflowService,
    private versions: ContentVersionService,
    private cache: CacheService,
    private audit: AuditService,
    private docs: DocumentsService,
  ) {}

  async create(dto: any, user: { id: string; role: UserRole }) {
    const base = slugify(dto.title);
    const slug = await uniqueSlug(base, (s) => this.prisma.vacancy.findUnique({ where: { slug: s } }).then(Boolean));
    const v = await this.prisma.vacancy.create({
      data: {
        slug, title: dto.title, mda: dto.mda, departmentId: dto.departmentId ?? null,
        publishDate: dto.publishDate ? new Date(dto.publishDate) : new Date(),
        closingDate: new Date(dto.closingDate),
        scheduledPublishAt: dto.scheduledPublishAt ? new Date(dto.scheduledPublishAt) : null,
        applyUrl: dto.applyUrl ?? null, status: VacancyStatus.Draft, authorId: user.id,
      },
    });
    if (dto.documentIds?.length) {
      await this.docs.attachDocuments('Vacancy', v.id, dto.documentIds);
    }
    await this.versions.snapshot({ entityType: 'Vacancy', entityId: v.id, data: v as any, authorId: user.id });
    await this.audit.log({ userId: user.id, action: AuditAction.Create, entityType: 'Vacancy', entityId: v.id });
    return v;
  }

  async update(id: string, dto: any, user: { id: string; role: UserRole }) {
    await this.findOneOrThrow(id);
    const { documentIds, ...rest } = dto;
    const updated = await this.prisma.vacancy.update({
      where: { id },
      data: { ...rest, closingDate: dto.closingDate ? new Date(dto.closingDate) : undefined },
    });
    await this.versions.snapshot({ entityType: 'Vacancy', entityId: id, data: updated as any, authorId: user.id });
    await this.audit.log({ userId: user.id, action: AuditAction.Update, entityType: 'Vacancy', entityId: id });
    await this.cache.invalidate('vacancies:');
    return updated;
  }

  async transition(id: string, to: VacancyStatus, user: { id: string; role: UserRole }, comment?: string) {
    const v = await this.findOneOrThrow(id);
    this.workflow.assertCanTransition(user.role, v.status as unknown as ContentStatus, to as unknown as ContentStatus);
    const updated = await this.prisma.vacancy.update({ where: { id }, data: { status: to, reviewerId: user.id } });
    await this.versions.snapshot({
      entityType: 'Vacancy',
      entityId: id,
      data: { status: to, comment: comment ?? null } as any,
      authorId: user.id,
    });
    const action = to === VacancyStatus.Published ? AuditAction.Publish : to === VacancyStatus.Archived ? AuditAction.Delete : AuditAction.Update;
    await this.audit.log({ userId: user.id, action, entityType: 'Vacancy', entityId: id });
    await this.cache.invalidate('vacancies:');
    return updated;
  }

  async listPublic(args: { page: number; pageSize: number; mda?: string; status?: VacancyStatus; q?: string }) {
    const cacheKey = `vacancies:list:${JSON.stringify(args)}`;
    const cached = await this.cache.get<any>(cacheKey);
    if (cached) return cached;

    const where: any = {
      status: args.status ?? { in: [VacancyStatus.Published, VacancyStatus.Closed] },
    };
    if (args.mda) where.mda = { contains: args.mda, mode: 'insensitive' };
    if (args.q) where.OR = [
      { title: { contains: args.q, mode: 'insensitive' } },
      { mda: { contains: args.q, mode: 'insensitive' } },
    ];
    const [items, total] = await Promise.all([
      this.prisma.vacancy.findMany({ where, orderBy: { publishDate: 'desc' }, skip: (args.page - 1) * args.pageSize, take: args.pageSize }),
      this.prisma.vacancy.count({ where }),
    ]);
    const result = { items, total, page: args.page, pageSize: args.pageSize };
    await this.cache.set(cacheKey, result, 300);
    return result;
  }

  async listAdmin(args: { page: number; pageSize: number; status: VacancyStatus }) {
    const where: any = { status: args.status };
    const [items, total] = await Promise.all([
      this.prisma.vacancy.findMany({ where, orderBy: { publishDate: 'desc' }, skip: (args.page - 1) * args.pageSize, take: args.pageSize }),
      this.prisma.vacancy.count({ where }),
    ]);
    return { items, total, page: args.page, pageSize: args.pageSize };
  }

  async getBySlug(slug: string) {
    return this.prisma.vacancy.findUnique({ where: { slug } });
  }

  async findById(id: string) {
    return this.findOneOrThrow(id);
  }

  async history(id: string) {
    return this.versions.history('Vacancy', id);
  }

  async autoCloseExpired(now = new Date()) {
    return this.prisma.vacancy.updateMany({
      where: { status: VacancyStatus.Published, closingDate: { lt: now } },
      data: { status: VacancyStatus.Closed },
    });
  }

  private async findOneOrThrow(id: string) {
    const v = await this.prisma.vacancy.findUnique({ where: { id } });
    if (!v) throw new NotFoundException('Vacancy not found');
    return v;
  }
}