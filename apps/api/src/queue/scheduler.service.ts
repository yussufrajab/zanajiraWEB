import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUES } from './queue.constants';

@Injectable()
export class SchedulerService implements OnModuleInit {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(@InjectQueue(QUEUES.vacancyExpiry) private queue: Queue) {}

  async onModuleInit() {
    await this.queue.add('expire-check', {}, { repeat: { pattern: '5 0 * * *' } });
    this.logger.log('Scheduled vacancy expiry job for 00:05 daily');
  }
}
