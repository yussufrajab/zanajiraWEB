import { Test } from '@nestjs/testing';
import { SubscribersController } from './subscribers.controller';
import { SubscribersService } from './subscribers.service';

describe('SubscribersController', () => {
  const subscribers = {
    subscribe: jest.fn().mockResolvedValue({ id: 's1', email: 'a@example.com' }),
    list: jest.fn().mockResolvedValue([{ id: 's1', email: 'a@example.com' }]),
  };
  let controller: SubscribersController;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [SubscribersController],
      providers: [{ provide: SubscribersService, useValue: subscribers }],
    }).compile();
    controller = module.get(SubscribersController);
  });

  it('creates a public subscription', async () => {
    await controller.subscribe({ email: 'a@example.com', criteria: { mda: 'Wizara' } });
    expect(subscribers.subscribe).toHaveBeenCalledWith('a@example.com', { mda: 'Wizara' });
  });

  it('lists subscribers for admins', async () => {
    const res = await controller.list();
    expect(subscribers.list).toHaveBeenCalled();
    expect(res).toHaveLength(1);
  });
});
