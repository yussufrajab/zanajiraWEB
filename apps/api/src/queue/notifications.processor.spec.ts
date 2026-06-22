import { NotificationsProcessor } from './notifications.processor';
import { MailService } from '../notifications/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';

describe('NotificationsProcessor', () => {
  const mail = { send: jest.fn().mockResolvedValue(undefined) };
  const prisma = {
    newsPost: { findUnique: jest.fn() },
    vacancy: { findUnique: jest.fn() },
    interviewNotice: { findUnique: jest.fn() },
    user: { findMany: jest.fn(), findUnique: jest.fn() },
    subscriber: { findMany: jest.fn() },
  } as unknown as PrismaService;

  const config = { get: jest.fn() } as unknown as ConfigService;

  let processor: NotificationsProcessor;

  beforeEach(() => {
    jest.clearAllMocks();
    processor = new NotificationsProcessor(mail as unknown as MailService, prisma, config);
  });

  const makeJob = (data: any) => ({ data } as Job);

  it('emails all active reviewers on submitted', async () => {
    prisma.newsPost.findUnique = jest.fn().mockResolvedValue({ id: 'n1', titleSw: 'Habari', authorId: 'u1' });
    prisma.user.findMany = jest.fn().mockResolvedValue([
      { email: 'r1@example.com' },
      { email: 'r2@example.com' },
    ]);

    await processor.process(makeJob({ kind: 'submitted', entityType: 'NewsPost', entityId: 'n1', actorId: 'u1' }));

    expect(mail.send).toHaveBeenCalledTimes(2);
    expect(mail.send).toHaveBeenCalledWith('r1@example.com', expect.stringContaining('Habari'), expect.any(String));
    expect(mail.send).toHaveBeenCalledWith('r2@example.com', expect.stringContaining('Habari'), expect.any(String));
  });

  it('emails the author on published', async () => {
    prisma.newsPost.findUnique = jest.fn().mockResolvedValue({ id: 'n1', titleSw: 'Habari', authorId: 'u1' });
    prisma.user.findUnique = jest.fn().mockResolvedValue({ email: 'editor@example.com' });

    await processor.process(makeJob({ kind: 'published', entityType: 'NewsPost', entityId: 'n1', actorId: 'u1' }));

    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 'u1' } });
    expect(mail.send).toHaveBeenCalledWith('editor@example.com', expect.stringContaining('published'), expect.any(String));
  });

  it('falls back to actorId when entity has no authorId', async () => {
    prisma.vacancy.findUnique = jest.fn().mockResolvedValue({ id: 'v1', title: 'Nafasi', authorId: null });
    prisma.user.findUnique = jest.fn().mockResolvedValue({ email: 'actor@example.com' });

    await processor.process(makeJob({ kind: 'approved', entityType: 'Vacancy', entityId: 'v1', actorId: 'u2' }));

    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 'u2' } });
    expect(mail.send).toHaveBeenCalledWith('actor@example.com', expect.stringContaining('approved'), expect.any(String));
  });

  it('does nothing when entity is not found', async () => {
    prisma.interviewNotice.findUnique = jest.fn().mockResolvedValue(null);

    await processor.process(makeJob({ kind: 'submitted', entityType: 'InterviewNotice', entityId: 'i1', actorId: 'u1' }));

    expect(mail.send).not.toHaveBeenCalled();
  });

  it('emails matching subscribers when a new vacancy is published and feature is enabled', async () => {
    (config.get as jest.Mock).mockReturnValue('true');
    prisma.vacancy.findUnique = jest.fn().mockResolvedValue({ id: 'v1', title: 'Nafasi za Kazi', mda: 'Wizara', authorId: 'u1' });
    prisma.subscriber.findMany = jest.fn().mockResolvedValue([
      { email: 'a@example.com', criteria: { mda: 'Wizara' } },
      { email: 'b@example.com', criteria: { keywords: ['kazi'] } },
      { email: 'c@example.com', criteria: { mda: 'Other' } },
    ]);

    await processor.process(makeJob({ kind: 'newVacancy', entityType: 'Vacancy', entityId: 'v1', actorId: 'u1' }));

    expect(mail.send).toHaveBeenCalledTimes(2);
    expect(mail.send).toHaveBeenCalledWith('a@example.com', expect.stringContaining('New vacancy'), expect.any(String));
    expect(mail.send).toHaveBeenCalledWith('b@example.com', expect.stringContaining('New vacancy'), expect.any(String));
  });

  it('skips subscriber emails when feature is disabled', async () => {
    (config.get as jest.Mock).mockReturnValue(undefined);
    prisma.vacancy.findUnique = jest.fn().mockResolvedValue({ id: 'v1', title: 'Nafasi', mda: 'Wizara', authorId: 'u1' });

    await processor.process(makeJob({ kind: 'newVacancy', entityType: 'Vacancy', entityId: 'v1', actorId: 'u1' }));

    expect(prisma.subscriber.findMany).not.toHaveBeenCalled();
    expect(mail.send).not.toHaveBeenCalled();
  });
});
