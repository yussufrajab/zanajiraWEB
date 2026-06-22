import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { PageViewInterceptor } from './page-view.interceptor';

@Module({
  controllers: [AnalyticsController],
  providers: [
    AnalyticsService,
    PageViewInterceptor,
    { provide: APP_INTERCEPTOR, useClass: PageViewInterceptor },
  ],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
