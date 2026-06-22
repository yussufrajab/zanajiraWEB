import { Test } from '@nestjs/testing';
import { SubscribersService } from './subscribers.service';
import { PrismaService } from '../prisma/prisma.service';

describe('SubscribersService', () => {
  const prisma = {
    subscriber: {
      upsert: jest.fn().mockResolvedValue({ id: 's1', email: 'a@example.com', criteria: {} }),
      findMany: jest.fn().mockResolvedValue([{ id: 's1', email: 'a@example.com' }]),
    },
  };
  let service: SubscribersService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [SubscribersService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(SubscribersService);
  });

  it('upserts a subscriber with criteria', async () => {
    const res = await service.subscribe('a@example.com', { mda: 'Wizara' });
    expect(prisma.subscriber.upsert).toHaveBeenCalledWith({
      where: { email: 'a@example.com' },
      create: { email: 'a@example.com', criteria: { mda: 'Wizara' } },
      update: { criteria: { mda: 'Wizara' } },
    });
    expect(res.email).toBe('a@example.com');
  });

  it('lists all subscribers', async () => {
    const res = await service.list();
    expect(prisma.subscriber.findMany).toHaveBeenCalledWith({ orderBy: { createdAt: 'desc' } });
    expect(res).toHaveLength(1);
  });
});
