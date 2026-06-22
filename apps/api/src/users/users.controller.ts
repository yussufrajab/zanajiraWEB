import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UserRole } from '@zanweb/shared';

@Controller('users')
@UseGuards(RolesGuard)
@Roles(UserRole.Administrator)
export class UsersController {
  constructor(private users: UsersService) {}

  @Get() list() { return this.users.list(); }

  @Post() create(@Body() dto: CreateUserDto) { return this.users.create(dto); }

  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateUserDto) { return this.users.update(id, dto); }

  @Post(':id/reset-password')
  resetPassword(@Param('id') id: string, @Body() body: { password: string }) {
    return this.users.resetPassword(id, body.password);
  }
}