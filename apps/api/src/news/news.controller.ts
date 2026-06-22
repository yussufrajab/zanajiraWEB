import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { NewsService } from './news.service';
import { CreateNewsDto } from './dto/create-news.dto';
import { UpdateNewsDto } from './dto/update-news.dto';
import { ContentStatus, UserRole } from '@zanweb/shared';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { Public } from '../auth/public.decorator';

@Controller('news')
export class NewsController {
  constructor(private news: NewsService) {}

  @Public()
  @Get()
  list(
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '10',
    @Query('q') q?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('status') status?: ContentStatus,
    @Req() req?: any,
  ) {
    const user = req?.user;
    if (status && user && [UserRole.Editor, UserRole.Reviewer, UserRole.Administrator].includes(user.role)) {
      return this.news.listAdmin({ page: Number(page), pageSize: Number(pageSize), status });
    }
    return this.news.listPublic({ page: Number(page), pageSize: Number(pageSize), q, dateFrom, dateTo });
  }

  @Public()
  @Get('by-slug/:slug')
  bySlug(@Param('slug') slug: string) {
    return this.news.getBySlug(slug);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.Editor, UserRole.Administrator)
  create(@Body() dto: CreateNewsDto, @Req() req: any) {
    return this.news.create(dto, req.user);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.Editor, UserRole.Administrator)
  update(@Param('id') id: string, @Body() dto: UpdateNewsDto, @Req() req: any) {
    return this.news.update(id, dto, req.user);
  }

  @Post(':id/transition')
  @UseGuards(RolesGuard)
  @Roles(UserRole.Editor, UserRole.Reviewer, UserRole.Administrator)
  transition(@Param('id') id: string, @Body() body: { to: ContentStatus; comment?: string }, @Req() req: any) {
    return this.news.transition(id, body.to, req.user, body.comment);
  }

  @Get('by-id/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.Editor, UserRole.Reviewer, UserRole.Administrator)
  byId(@Param('id') id: string) {
    return this.news.findById(id);
  }

  @Get(':id/history')
  @UseGuards(RolesGuard)
  @Roles(UserRole.Editor, UserRole.Reviewer, UserRole.Administrator)
  history(@Param('id') id: string) {
    return this.news.history(id);
  }
}