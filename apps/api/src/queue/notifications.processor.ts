import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import { MailService } from '../notifications/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { QUEUES } from './queue.constants';

type NotificationKind = 'submitted' | 'approved' | 'rejected' | 'published' | 'newVacancy';

@Processor(QUEUES.notifications)
@Injectable()
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(private mail: MailService, private prisma: PrismaService, private config: ConfigService) {
    super();
  }

  async process(job: Job<{ kind: NotificationKind; entityType: string; entityId: string; actorId: string }>) {
    const { kind, entityType, entityId, actorId } = job.data;
    const entity = (await this.load(entityType, entityId)) as any;
    if (!entity) return;

    const title = this.titleOf(entity);

    if (kind === 'submitted') {
      const reviewers = await this.prisma.user.findMany({ where: { role: 'Reviewer', status: 'Active' } });
      for (const r of reviewers) {
        await this.mail.send(r.email, `Content submitted for review: ${title}`, `A ${entityType} (${entityId}) has been submitted and is waiting for review.`);
      }
    } else if (kind === 'newVacancy') {
      if (this.config.get<string>('ENABLE_SUBSCRIBER_NOTIFY') !== 'true') {
        this.logger.log(`subscriber notifications disabled; skipping newVacancy for ${entityId}`);
        return;
      }
      const vacancy = entity;
      const subscribers = await this.prisma.subscriber.findMany();
      const matching = subscribers.filter((s) => this.matchesCriteria(s.criteria, vacancy));
      for (const s of matching) {
        await this.mail.send(
          s.email,
          `New vacancy: ${title}`,
          `A new vacancy matching your criteria has been published:\n\n${title}\nMDA: ${vacancy.mda}\n\nVisit the vacancies page to apply.`,
        );
      }
    } else {
      const authorId = entity.authorId ?? actorId;
      const author = await this.prisma.user.findUnique({ where: { id: authorId } });
      if (author) {
        await this.mail.send(author.email, `Your content was ${kind}: ${title}`, `${entityType} ${entityId} is now ${kind}.`);
      }
    }

    this.logger.log(`notification ${kind} for ${entityType}:${entityId}`);
  }

  private async load(entityType: string, entityId: string) {
    switch (entityType) {
      case 'NewsPost':
        return this.prisma.newsPost.findUnique({ where: { id: entityId } });
      case 'Vacancy':
        return this.prisma.vacancy.findUnique({ where: { id: entityId } });
      case 'InterviewNotice':
        return this.prisma.interviewNotice.findUnique({ where: { id: entityId } });
      default:
        return null;
    }
  }

  private titleOf(entity: any): string {
    return entity.title ?? entity.titleSw ?? entity.titleEn ?? 'Untitled';
  }

  private matchesCriteria(criteria: any, vacancy: any): boolean {
    if (!criteria || Object.keys(criteria).length === 0) return true;
    if (criteria.mda && typeof criteria.mda === 'string') {
      const wanted = criteria.mda.toLowerCase();
      if (vacancy.mda?.toLowerCase().includes(wanted)) return true;
    }
    if (Array.isArray(criteria.keywords)) {
      const title = vacancy.title?.toLowerCase() ?? '';
      if (criteria.keywords.some((k: string) => title.includes(k.toLowerCase()))) return true;
    }
    return false;
  }
}
