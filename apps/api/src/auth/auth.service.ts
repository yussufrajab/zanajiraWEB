import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { MfaService } from './mfa.service';
import { verifyPassword } from '../common/password.util';
import { AuditAction, UserRole, UserStatus } from '@zanweb/shared';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private mfa: MfaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async login(email: string, password: string, mfaCode?: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      await this.audit.log({ userId: null, action: AuditAction.AuthFailure, entityType: 'User', entityId: email });
      throw new UnauthorizedException('Invalid credentials');
    }
    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok || user.status !== UserStatus.Active) {
      await this.audit.log({ userId: user.id, action: AuditAction.AuthFailure, entityType: 'User', entityId: user.id });
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.mfaEnabled) {
      if (!mfaCode) {
        return { accessToken: '', mfaRequired: true, user: this.publicUser(user) };
      }
      if (!this.mfa.verify(mfaCode, user.mfaSecret!)) {
        await this.audit.log({ userId: user.id, action: AuditAction.AuthFailure, entityType: 'User', entityId: user.id });
        throw new UnauthorizedException('Invalid MFA code');
      }
    }

    const accessToken = await this.jwt.signAsync(
      { sub: user.id, role: user.role, email: user.email },
      { expiresIn: this.config.get<string>('JWT_EXPIRES_IN') ?? '8h' },
    );
    await this.audit.log({ userId: user.id, action: AuditAction.AuthSuccess, entityType: 'User', entityId: user.id });
    return { accessToken, mfaRequired: false, user: this.publicUser(user) };
  }

  async validatePayload(payload: { sub: string; role: UserRole }) {
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.status !== UserStatus.Active) return null;
    return { id: user.id, email: user.email, name: user.name, role: user.role, status: user.status };
  }

  private publicUser(u: any) {
    return { id: u.id, email: u.email, name: u.name, role: u.role as UserRole, status: u.status as UserStatus };
  }
}