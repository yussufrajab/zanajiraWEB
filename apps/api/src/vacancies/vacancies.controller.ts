import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { VacanciesService } from './vacancies.service';
import { CreateVacancyDto } from './dto/create-vacancy.dto';
import { UpdateVacancyDto } from './dto/update-vacancy.dto';
import { UserRole, VacancyStatus } from '@zanweb/shared';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { Public } from '../auth/public.decorator';

@Controller('vacancies')
export class VacanciesController {
  constructor(private vacancies: VacanciesService) {}

  @Public()
  @Get()
  list(@Query() q: Record<string, string>) {
    return this.vacancies.listPublic({
      page: Number(q.page ?? 1), pageSize: Number(q.pageSize ?? 10),
      mda: q.mda, status: q.status as VacancyStatus | undefined, q: q.q,
    });
  }

  @Public()
  @Get('by-slug/:slug')
  bySlug(@Param('slug') slug: string) { return this.vacancies.getBySlug(slug); }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.Editor, UserRole.Administrator)
  create(@Body() dto: CreateVacancyDto, @Req() req: any) { return this.vacancies.create(dto, req.user); }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.Editor, UserRole.Administrator)
  update(@Param('id') id: string, @Body() dto: UpdateVacancyDto, @Req() req: any) { return this.vacancies.update(id, dto, req.user); }

  @Post(':id/transition')
  @UseGuards(RolesGuard)
  @Roles(UserRole.Editor, UserRole.Reviewer, UserRole.Administrator)
  transition(@Param('id') id: string, @Body() body: { to: VacancyStatus }, @Req() req: any) {
    return this.vacancies.transition(id, body.to, req.user);
  }

  @Get('by-id/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.Editor, UserRole.Reviewer, UserRole.Administrator)
  byId(@Param('id') id: string) { return this.vacancies.findById(id); }

  @Get(':id/history')
  @UseGuards(RolesGuard)
  @Roles(UserRole.Editor, UserRole.Reviewer, UserRole.Administrator)
  history(@Param('id') id: string) { return this.vacancies.history(id); }
}