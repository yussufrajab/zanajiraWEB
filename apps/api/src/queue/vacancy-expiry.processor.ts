import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { VacanciesService } from '../vacancies/vacancies.service';
import { QUEUES } from './queue.constants';

@Processor(QUEUES.vacancyExpiry)
@Injectable()
export class VacancyExpiryProcessor extends WorkerHost {
  private readonly logger = new Logger(VacancyExpiryProcessor.name);

  constructor(private vacancies: VacanciesService) {
    super();
  }

  async process(_job: Job) {
    const result = await this.vacancies.autoCloseExpired();
    this.logger.log(`Auto-closed ${result.count} expired vacancies`);
  }
}
