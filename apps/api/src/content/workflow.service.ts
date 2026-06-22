import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { ContentStatus, UserRole, VacancyStatus } from '@zanweb/shared';

@Injectable()
export class WorkflowService {
  private transitions: Record<string, Record<string, UserRole[]>> = {
    Draft: { InReview: [UserRole.Editor, UserRole.Administrator] },
    InReview: {
      Published: [UserRole.Reviewer, UserRole.Administrator],
      Rejected: [UserRole.Reviewer, UserRole.Administrator],
      Draft: [UserRole.Editor, UserRole.Administrator],
    },
    Rejected: { Draft: [UserRole.Editor, UserRole.Administrator], InReview: [UserRole.Editor, UserRole.Administrator] },
    Published: { Archived: [UserRole.Administrator] },
    Archived: { Published: [UserRole.Administrator] },
  };

  canTransition(role: UserRole, from: ContentStatus, to: ContentStatus): boolean {
    const allowed = this.transitions[from]?.[to];
    return !!allowed && allowed.includes(role);
  }

  assertCanTransition(role: UserRole, from: ContentStatus, to: ContentStatus): void {
    if (from === to) return;
    if (!this.transitions[from]) throw new BadRequestException(`No transitions from ${from}`);
    const allowed = this.transitions[from][to];
    if (!allowed) throw new BadRequestException(`Invalid transition ${from} -> ${to}`);
    if (!allowed.includes(role)) throw new ForbiddenException(`Role ${role} cannot ${from} -> ${to}`);
  }

  vacancyToContent(v: VacancyStatus): ContentStatus {
    return v as unknown as ContentStatus;
  }
}