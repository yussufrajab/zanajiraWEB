import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { Public } from '../auth/public.decorator';
import { UserRole } from '@zanweb/shared';

@Controller('analytics')
export class AnalyticsController {
  constructor(private analytics: AnalyticsService) {}

  @Public()
  @Post('page-view')
  pageView(@Body() body: { path: string; locale: string }) {
    return this.analytics.recordPageView(body.path, body.locale);
  }

  @Get('dashboard')
  @UseGuards(RolesGuard)
  @Roles(UserRole.Administrator)
  dashboard() {
    return this.analytics.dashboard();
  }
}
