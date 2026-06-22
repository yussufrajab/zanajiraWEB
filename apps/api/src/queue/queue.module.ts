import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { VacanciesModule } from '../vacancies/vacancies.module';
import { NotificationsProcessor } from './notifications.processor';
import { VacancyExpiryProcessor } from './vacancy-expiry.processor';
import { SchedulerService } from './scheduler.service';

@Global()
@Module({
  imports: [
    VacanciesModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (c: ConfigService) => ({ connection: { url: c.get<string>('REDIS_URL') } }),
    }),
    BullModule.registerQueue(
      { name: 'notifications' },
      { name: 'vacancy-expiry' },
      { name: 'pdf-thumbnail' },
    ),
  ],
  providers: [NotificationsProcessor, VacancyExpiryProcessor, SchedulerService],
  exports: [BullModule],
})
export class QueueModule {}
