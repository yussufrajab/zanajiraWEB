import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';

@Global()
@Module({
  imports: [
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
  providers: [],
  exports: [BullModule],
})
export class QueueModule {}
