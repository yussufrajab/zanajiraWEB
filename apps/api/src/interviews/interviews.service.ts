import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkflowService } from '../content/workflow.service';
import { ContentVersionService } from '../content/content-version.service';
import { CacheService } from '../cache/cache.service';
import { AuditService } from '../audit/audit.service';
import { DocumentsService } from '../documents/documents.service';
import { AuditAction, ContentStatus, InterviewType, UserRole } from '@zanweb/shared';
import { slugify, uniqueSlug } from '../common/slug.util';

@Injectable()
export class InterviewsService {
  constructor(
    private prisma: PrismaService,
    private workflow: WorkflowService,
    private versions: ContentVersionService,
    private cache: CacheService,
    private audit: AuditService,
    private docs: DocumentsService,
  ) {}

  async create(dto: any, user: { id: string; role: UserRole }) {
    const base = slugify(`${dto.type === InterviewType.InterviewResult ? 'matokeo' : 'wito'}-${dto.title}`);
    const slug = await uniqueSlug(base, (s) => this.prisma.interviewNotice.findUnique({ where: { slug: s } }).then(Boolean));
    const n = await this.prisma.interviewNotice.create({
      data: {
        slug, title: dto.title, mda: dto.mda, type: dto.type, departmentId: dto.departmentId ?? null,
        publishDate: dto.publishDate ? new Date(dto.publishDate) : new Date(),
        scheduledPublishAt: dto.scheduledPublishAt ? new Date(dto.scheduledPublishAt) : null,
        status: ContentStatus.Draft, authorId: user.id,
      },
    });
    if (dto.documentIds?.length) {
      await this.docs.attachDocuments('InterviewNotice', n.id, dto.documentIds);
    }
    await this.versions.snapshot({ entityType: 'InterviewNotice', entityId: n.id, data: n as any, authorId: user.id });
    await this.audit.log({ userId: user.id, action: AuditAction.Create, entityType: 'InterviewNotice', entityId: n.id });
    return n;
  }

  async update(id: string, dto: any, user: { id: string; role: UserRole }) {
    await this.findOneOrThrow(id);
    const { documentIds, ...rest } = dto;
    const updated = await this.prisma.interviewNotice.update({ where: { id }, data: rest });
    await this.versions.snapshot({ entityType: 'InterviewNotice', entityId: id, data: updated as any, authorId: user.id });
    await this.audit.log({ userId: user.id, action: AuditAction.Update, entityType: 'InterviewNotice', entityId: id });
    await this.cache.invalidate('interviews:');
    return updated;
  }

  async transition(id: string, to: ContentStatus, user: { id: string; role: UserRole }, comment?: string) {
    const n = await this.findOneOrThrow(id);
    this.workflow.assertCanTransition(user.role, n.status as unknown as ContentStatus, to);
    const updated = await this.prisma.interviewNotice.update({ where: { id }, data: { status: to, reviewerId: user.id } });
    await this.versions.snapshot({
      entityType: 'InterviewNotice',
      entityId: id,
      data: { status: to, comment: comment ?? null } as any,
      authorId: user.id,
    });
    const action = to === ContentStatus.Published ? AuditAction.Publish : to === ContentStatus.Rejected ? AuditAction.Reject : AuditAction.Update;
    await this.audit.log({ userId: user.id, action, entityType: 'InterviewNotice', entityId: id });
    await this.cache.invalidate('interviews:');
    return updated;
  }

  async listPublic(args: { page: number; pageSize: number; type?: InterviewType; mda?: string; q?: string }) {
    const cacheKey = `interviews:list:${JSON.stringify(args)}`;
    const cached = await this.cache.get<any>(cacheKey);
    if (cached) return cached;

    const where: any = { status: ContentStatus.Published };
    if (args.type) where.type = args.type;
    if (args.mda) where.mda = { contains: args.mda, mode: 'insensitive' };
    if (args.q) where.OR = [
      { title: { contains: args.q, mode: 'insensitive' } },
      { mda: { contains: args.q, mode: 'insensitive' } },
    ];
    const [items, total] = await Promise.all([
      this.prisma.interviewNotice.findMany({ where, orderBy: { publishDate: 'desc' }, skip: (args.page - 1) * args.pageSize, take: args.pageSize }),
      this.prisma.interviewNotice.count({ where }),
    ]);
    const result = { items, total, page: args.page, pageSize: args.pageSize };
    await this.cache.set(cacheKey, result, 300);
    return result;
  }

  async listAdmin(args: { page: number; pageSize: number; status: ContentStatus }) {
    const where: any = { status: args.status };
    const [items, total] = await Promise.all([
      this.prisma.interviewNotice.findMany({ where, orderBy: { publishDate: 'desc' }, skip: (args.page - 1) * args.pageSize, take: args.pageSize }),
      this.prisma.interviewNotice.count({ where }),
    ]);
    return { items, total, page: args.page, pageSize: args.pageSize };
  }

  async getBySlug(slug: string) {
    return this.prisma.interviewNotice.findUnique({ where: { slug } });
  }

  async findById(id: string) {
    return this.findOneOrThrow(id);
  }

  async history(id: string) {
    return this.versions.history('InterviewNotice', id);
  }

  private async findOneOrThrow(id: string) {
    const n = await this.prisma.interviewNotice.findUnique({ where: { id } });
    if (!n) throw new NotFoundException('Interview notice not found');
    return n;
  }
}