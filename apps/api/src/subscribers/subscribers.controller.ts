import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { SubscribersService } from './subscribers.service';
import { CreateSubscriberDto } from './dto/create-subscriber.dto';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { Public } from '../auth/public.decorator';
import { UserRole } from '@zanweb/shared';

@Controller('subscribers')
export class SubscribersController {
  constructor(private subscribers: SubscribersService) {}

  @Public()
  @Post()
  subscribe(@Body() dto: CreateSubscriberDto) {
    return this.subscribers.subscribe(dto.email, dto.criteria);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.Administrator)
  list() {
    return this.subscribers.list();
  }
}
