import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { InterviewsService } from './interviews.service';
import { CreateInterviewDto } from './dto/create-interview.dto';
import { UpdateInterviewDto } from './dto/update-interview.dto';
import { ContentStatus, InterviewType, UserRole } from '@zanweb/shared';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { Public } from '../auth/public.decorator';

@Controller('interviews')
export class InterviewsController {
  constructor(private interviews: InterviewsService) {}

  @Public()
  @Get()
  list(@Query() q: Record<string, string>) {
    return this.interviews.listPublic({
      page: Number(q.page ?? 1), pageSize: Number(q.pageSize ?? 10),
      type: q.type as InterviewType | undefined, mda: q.mda, q: q.q,
    });
  }

  @Public()
  @Get('by-slug/:slug')
  bySlug(@Param('slug') slug: string) { return this.interviews.getBySlug(slug); }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.Editor, UserRole.Administrator)
  create(@Body() dto: CreateInterviewDto, @Req() req: any) { return this.interviews.create(dto, req.user); }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.Editor, UserRole.Administrator)
  update(@Param('id') id: string, @Body() dto: UpdateInterviewDto, @Req() req: any) { return this.interviews.update(id, dto, req.user); }

  @Post(':id/transition')
  @UseGuards(RolesGuard)
  @Roles(UserRole.Editor, UserRole.Reviewer, UserRole.Administrator)
  transition(@Param('id') id: string, @Body() body: { to: ContentStatus }, @Req() req: any) {
    return this.interviews.transition(id, body.to, req.user);
  }

  @Get('by-id/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.Editor, UserRole.Reviewer, UserRole.Administrator)
  byId(@Param('id') id: string) { return this.interviews.findById(id); }

  @Get(':id/history')
  @UseGuards(RolesGuard)
  @Roles(UserRole.Editor, UserRole.Reviewer, UserRole.Administrator)
  history(@Param('id') id: string) { return this.interviews.history(id); }
}