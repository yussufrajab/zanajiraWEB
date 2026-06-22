import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { MfaService } from './mfa.service';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { ContentStatus, UserRole, UserStatus, AuditAction, VacancyStatus, InterviewType } from '@zanweb/shared';

describe('AuthService.login', () => {
  let service: AuthService;
  const prisma = { user: { findUnique: jest.fn() } };
  const audit = { log: jest.fn().mockResolvedValue({}) };
  const mfa = { verify: jest.fn() };
  const jwt = { signAsync: jest.fn().mockResolvedValue('token') };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
        { provide: MfaService, useValue: mfa },
        { provide: JwtService, useValue: jwt },
        { provide: ConfigService, useValue: { get: () => '8h' } },
      ],
    }).compile();
    service = moduleRef.get(AuthService);
  });

  it('throws on unknown email', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(service.login('nope@x.go.tz', 'password')).rejects.toThrow(UnauthorizedException);
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: AuditAction.AuthFailure }));
  });

  it('throws on wrong password', async () => {
    const hash = await bcrypt.hash('correct-pw-123', 12);
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', email: 'a@x.go.tz', passwordHash: hash, status: 'Active', mfaEnabled: false, role: 'Editor', name: 'A' });
    await expect(service.login('a@x.go.tz', 'wrong-pw-999')).rejects.toThrow(UnauthorizedException);
  });

  it('returns token on valid credentials (non-MFA)', async () => {
    const hash = await bcrypt.hash('correct-pw-123', 12);
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', email: 'a@x.go.tz', passwordHash: hash, status: 'Active', mfaEnabled: false, role: 'Editor', name: 'A' });
    const res = await service.login('a@x.go.tz', 'correct-pw-123');
    expect(res.mfaRequired).toBe(false);
    expect(res.accessToken).toBe('token');
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: AuditAction.AuthSuccess }));
  });

  it('requires MFA code when mfaEnabled', async () => {
    const hash = await bcrypt.hash('correct-pw-123', 12);
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', email: 'a@x.go.tz', passwordHash: hash, status: 'Active', mfaEnabled: true, role: 'Administrator', name: 'A', mfaSecret: 'S3CR3T' });
    const res = await service.login('a@x.go.tz', 'correct-pw-123');
    expect(res.mfaRequired).toBe(true);
    expect(res.accessToken).toBe('');
  });
});