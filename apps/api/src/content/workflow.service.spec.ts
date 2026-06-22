import { WorkflowService } from './workflow.service';
import { ContentStatus, UserRole } from '@zanweb/shared';
import { BadRequestException, ForbiddenException } from '@nestjs/common';

describe('WorkflowService', () => {
  const w = new WorkflowService();

  it('Editor can move Draft -> InReview', () => {
    expect(w.canTransition(UserRole.Editor, ContentStatus.Draft, ContentStatus.InReview)).toBe(true);
  });
  it('Editor cannot Publish', () => {
    expect(() => w.assertCanTransition(UserRole.Editor, ContentStatus.InReview, ContentStatus.Published))
      .toThrow(ForbiddenException);
  });
  it('Reviewer can Publish from InReview', () => {
    expect(w.canTransition(UserRole.Reviewer, ContentStatus.InReview, ContentStatus.Published)).toBe(true);
  });
  it('Reviewer can Reject from InReview', () => {
    expect(w.canTransition(UserRole.Reviewer, ContentStatus.InReview, ContentStatus.Rejected)).toBe(true);
  });
  it('cannot jump Draft -> Published', () => {
    expect(() => w.assertCanTransition(UserRole.Administrator, ContentStatus.Draft, ContentStatus.Published))
      .toThrow(BadRequestException);
  });
});