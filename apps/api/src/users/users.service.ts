import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { hashPassword, validatePasswordStrength, WeakPasswordError } from '../common/password.util';
import { UserRole, UserStatus } from '@zanweb/shared';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: { name: string; email: string; password: string; role: UserRole }) {
    try { validatePasswordStrength(dto.password); }
    catch (e) { if (e instanceof WeakPasswordError) throw new BadRequestException(e.message); throw e; }

    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already in use');

    const passwordHash = await hashPassword(dto.password);
    return this.prisma.user.create({
      data: { name: dto.name, email: dto.email, passwordHash, role: dto.role, status: UserStatus.Active },
    });
  }

  list() {
    return this.prisma.user.findMany({ select: { id: true, name: true, email: true, role: true, status: true, createdAt: true } });
  }

  async update(id: string, dto: { name?: string; role?: UserRole; status?: UserStatus }) {
    await this.findOneOrThrow(id);
    return this.prisma.user.update({ where: { id }, data: dto });
  }

  async resetPassword(id: string, newPassword: string) {
    try { validatePasswordStrength(newPassword); }
    catch (e) { if (e instanceof WeakPasswordError) throw new BadRequestException(e.message); throw e; }
    const passwordHash = await hashPassword(newPassword);
    return this.prisma.user.update({ where: { id }, data: { passwordHash } });
  }

  private async findOneOrThrow(id: string) {
    const u = await this.prisma.user.findUnique({ where: { id } });
    if (!u) throw new NotFoundException('User not found');
    return u;
  }
}