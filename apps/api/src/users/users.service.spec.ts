import { Test } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConflictException, BadRequestException } from '@nestjs/common';
import { UserRole } from '@zanweb/shared';

describe('UsersService', () => {
  const prisma = { user: { findUnique: jest.fn(), create: jest.fn(), findMany: jest.fn(), update: jest.fn(), findUniqueOrThrow: jest.fn() } };
  let service: UsersService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(UsersService);
  });

  it('creates a user when email is free', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({ id: 'u1' });
    const res = await service.create({ name: 'Ed', email: 'ed@x.go.tz', password: 'Str0ng!Pass', role: UserRole.Editor });
    expect(res.id).toBe('u1');
    expect(prisma.user.create).toHaveBeenCalled();
  });

  it('throws ConflictException on duplicate email', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'existing' });
    await expect(service.create({ name: 'Ed', email: 'ed@x.go.tz', password: 'Str0ng!Pass', role: UserRole.Editor }))
      .rejects.toThrow(ConflictException);
  });

  it('throws BadRequestException on weak password', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(service.create({ name: 'Ed', email: 'ed@x.go.tz', password: 'weak', role: UserRole.Editor }))
      .rejects.toThrow(BadRequestException);
  });
});