import { Controller, Get } from '@nestjs/common';
import { DepartmentsService } from './departments.service';
import { Public } from '../auth/public.decorator';

@Controller('departments')
export class DepartmentsController {
  constructor(private departments: DepartmentsService) {}

  @Public()
  @Get()
  list() {
    return this.departments.list();
  }
}
