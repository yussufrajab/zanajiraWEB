import { Body, Controller, Get, Param, Put, Req, UseGuards } from '@nestjs/common';
import { PagesService } from './pages.service';
import { UpsertPageDto } from './dto/upsert-page.dto';
import { UserRole } from '@zanweb/shared';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { Public } from '../auth/public.decorator';

@Controller('pages')
export class PagesController {
  constructor(private pages: PagesService) {}

  @Public()
  @Get('tree')
  tree() { return this.pages.tree(); }

  @Public()
  @Get('by-slug/:slug')
  bySlug(@Param('slug') slug: string) { return this.pages.getBySlug(slug); }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.Administrator)
  list() { return this.pages.list(); }

  @Put()
  @UseGuards(RolesGuard)
  @Roles(UserRole.Administrator)
  upsert(@Body() dto: UpsertPageDto, @Req() req: any) { return this.pages.upsert(dto, req.user); }
}