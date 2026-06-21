# Phase 3 — Auth & RBAC

> Part of the **CSC Zanzibar Public Website** implementation plan. See [`CSC-ZNZ-WEB-Implementation-Plan.md`](./CSC-ZNZ-WEB-Implementation-Plan.md) for the overview. Depends on [Phase 2](./phase-2-data-layer.md).
>
> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans`.

**Milestone:** Staff can log in with email + password (and TOTP for Administrators), receive a JWT, and every protected route enforces role-based access. All auth attempts and sensitive content actions are written to the audit log.

**Requirements covered:** REQ-USR-01 (RBAC roles), REQ-USR-02 (admin auth-only), REQ-USR-03 (admin manages users), REQ-USR-04 (password complexity + MFA for admins), REQ-USR-05 (auth audit log), plus the RBAC foundation for REQ-CMS-02/03.

### Task 3.1: `Roles` decorator and `RolesGuard`

**Files:**
- Create: `apps/api/src/auth/roles.decorator.ts`
- Create: `apps/api/src/auth/roles.guard.ts`

- [ ] **Step 1: Write `apps/api/src/auth/roles.decorator.ts`**

```typescript
import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@zanweb/shared';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
```

- [ ] **Step 2: Write the failing test `apps/api/src/auth/roles.guard.spec.ts`**

```typescript
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { UserRole } from '@zanweb/shared';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';

describe('RolesGuard', () => {
  const reflector = new Reflector();
  const guard = new RolesGuard(reflector);

  function ctx(user: any, roles: UserRole[]): ExecutionContext {
    const handler = { name: 'x' };
    reflector.getAllAndOverride = jest.fn().mockReturnValue(roles);
    return {
      getHandler: () => handler,
      getClass: () => class {},
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    } as unknown as ExecutionContext;
  }

  it('allows when no roles required', () => {
    expect(guard.canActivate(ctx({ role: UserRole.Editor }, []))).toBe(true);
  });

  it('denies unauthenticated when roles required', () => {
    expect(() => guard.canActivate(ctx(null, [UserRole.Editor]))).toThrow(UnauthorizedException);
  });

  it('allows matching role', () => {
    expect(guard.canActivate(ctx({ role: UserRole.Reviewer }, [UserRole.Reviewer, UserRole.Administrator]))).toBe(true);
  });

  it('forbids non-matching role', () => {
    expect(() => guard.canActivate(ctx({ role: UserRole.Editor }, [UserRole.Administrator]))).toThrow(ForbiddenException);
  });
});
```

Run: `pnpm --filter @zanweb/api test src/auth/roles.guard.spec.ts`
Expected: FAIL — `RolesGuard` not implemented.

- [ ] **Step 3: Implement `apps/api/src/auth/roles.guard.ts`**

```typescript
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@zanweb/shared';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest<{ user?: { role: UserRole } }>();
    const user = request.user;
    if (!user) throw new UnauthorizedException('Authentication required');
    if (!required.includes(user.role)) throw new ForbiddenException('Insufficient role');
    return true;
  }
}
```

Run: `pnpm --filter @zanweb/api test src/auth/roles.guard.spec.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/auth/roles.decorator.ts apps/api/src/auth/roles.guard.ts apps/api/src/auth/roles.guard.spec.ts
git commit -m "feat(auth): add Roles decorator and guard"
```

### Task 3.2: JWT strategy and auth service (login)

**Files:**
- Create: `apps/api/src/auth/dto/login.dto.ts`
- Create: `apps/api/src/auth/dto/auth-response.dto.ts`
- Create: `apps/api/src/auth/auth.service.ts`
- Create: `apps/api/src/auth/jwt.strategy.ts`
- Create: `apps/api/src/auth/auth.controller.ts`
- Create: `apps/api/src/auth/auth.module.ts`
- Create: `apps/api/src/audit/audit.service.ts`
- Create: `apps/api/src/audit/audit.module.ts`

- [ ] **Step 1: Write `apps/api/src/auth/dto/login.dto.ts`**

```typescript
import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';

export class LoginDto {
  @IsEmail() email: string;
  @IsString() @MinLength(8) @MaxLength(128) password: string;
  @IsString() @MinLength(6) @MaxLength(6) mfaCode?: string;
}
```

- [ ] **Step 2: Write `apps/api/src/auth/dto/auth-response.dto.ts`**

```typescript
import { UserRole, UserStatus } from '@zanweb/shared';

export class AuthResponseDto {
  accessToken: string;
  mfaRequired: boolean;
  user: { id: string; email: string; name: string; role: UserRole; status: UserStatus };
}
```

- [ ] **Step 3: Write `apps/api/src/audit/audit.service.ts`**

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditAction } from '@zanweb/shared';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  log(args: {
    userId?: string | null;
    action: AuditAction;
    entityType: string;
    entityId: string;
    diff?: Record<string, unknown>;
  }) {
    return this.prisma.auditLog.create({
      data: {
        userId: args.userId ?? null,
        action: args.action,
        entityType: args.entityType,
        entityId: args.entityId,
        diff: (args.diff as any) ?? undefined,
      },
    });
  }
}
```

- [ ] **Step 4: Write `apps/api/src/audit/audit.module.ts`**

```typescript
import { Module, Global } from '@nestjs/common';
import { AuditService } from './audit.service';

@Global()
@Module({ providers: [AuditService], exports: [AuditService] })
export class AuditModule {}
```

- [ ] **Step 5: Write the failing test `apps/api/src/auth/auth.service.spec.ts`**

```typescript
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { MfaService } from './mfa.service';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

describe('AuthService.login', () => {
  let service: AuthService;
  const prisma = {
    user: { findUnique: jest.fn() },
  };
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
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'AuthFailure' }));
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
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'AuthSuccess' }));
  });

  it('requires MFA code when mfaEnabled', async () => {
    const hash = await bcrypt.hash('correct-pw-123', 12);
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', email: 'a@x.go.tz', passwordHash: hash, status: 'Active', mfaEnabled: true, role: 'Administrator', name: 'A' });
    const res = await service.login('a@x.go.tz', 'correct-pw-123');
    expect(res.mfaRequired).toBe(true);
    expect(res.accessToken).toBe('');
  });
});
```

Run: `pnpm --filter @zanweb/api test src/auth/auth.service.spec.ts`
Expected: FAIL — `AuthService`/`MfaService` missing.

- [ ] **Step 6: Implement `apps/api/src/auth/mfa.service.ts`** (TOTP using `otplib` — add `"otplib": "^12.0.1"` to `apps/api/package.json` deps and `"@types/otplib"` is bundled)

```typescript
import { Injectable } from '@nestjs/common';
import { authenticator } from 'otplib';

@Injectable()
export class MfaService {
  generateSecret(): string {
    return authenticator.generateSecret();
  }
  qrUri(email: string, secret: string): string {
    return authenticator.keyuri(email, 'CSC-ZNZ', secret);
  }
  verify(token: string, secret: string): boolean {
    return authenticator.verify({ token, secret });
  }
}
```

- [ ] **Step 7: Implement `apps/api/src/auth/auth.service.ts`**

```typescript
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
```

- [ ] **Step 8: Implement `apps/api/src/auth/jwt.strategy.ts`**

```typescript
import { Injectable, Strategy } from '../common/passport-imports'; // see note
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService, private auth: AuthService) {
    super({
      jwtFromRequest: (req: any) => req?.cookies?.accessToken ?? null,
      secretOrKey: config.get<string>('JWT_SECRET')!,
    });
  }
  async validate(payload: { sub: string; role: any }) {
    return this.auth.validatePayload(payload);
  }
}
```

> **Note:** `passport-jwt` exports `Strategy`. Use this concrete import at top of `jwt.strategy.ts` instead of the placeholder line:

```typescript
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService, private auth: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get<string>('JWT_SECRET')!,
    });
  }
  async validate(payload: { sub: string; role: any }) {
    return this.auth.validatePayload(payload);
  }
}
```

Use the concrete version above (delete the placeholder version).

- [ ] **Step 9: Implement `apps/api/src/auth/auth.controller.ts`**

```typescript
import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { LoginDto } from './dto/login.dto';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password, dto.mfaCode);
  }
}
```

- [ ] **Step 10: Implement `apps/api/src/auth/auth.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { MfaService } from './mfa.service';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (c: ConfigService) => ({ secret: c.get<string>('JWT_SECRET') }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, MfaService],
  exports: [AuthService],
})
export class AuthModule {}
```

- [ ] **Step 11: Wire `AuthModule`, `AuditModule`, `APP_GUARD` (JwtAuthGuard) into `app.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { HealthController } from './health.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuditModule,
    AuthModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: JwtAuthGuard }],
})
export class AppModule {}
```

- [ ] **Step 12: Implement `apps/api/src/auth/jwt-auth.guard.ts`** (default-protect everything; mark public routes with `@Public()`)

```typescript
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { IS_PUBLIC_KEY, Public } from './public.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private reflector: Reflector, private jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<{ headers: Record<string, string> }>();
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) return false;
    try {
      const payload = await this.jwt.verifyAsync(header.slice(7));
      (req as any).user = payload;
      return true;
    } catch {
      return false;
    }
  }
}
```

- [ ] **Step 13: Write `apps/api/src/auth/public.decorator.ts`**

```typescript
import { SetMetadata } from '@nestjs/common';
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

Mark `HealthController` and `AuthController.login` with `@Public()`.

- [ ] **Step 14: Run tests**

Run: `pnpm --filter @zanweb/api test`
Expected: PASS.

- [ ] **Step 15: Commit**

```bash
git add apps/api/src/auth apps/api/src/audit apps/api/src/app.module.ts
git commit -m "feat(auth): JWT login, RBAC guard, MFA, audit logging"
```

### Task 3.3: Password complexity validator (REQ-USR-04)

**Files:**
- Create: `apps/api/src/auth/dto/create-user.dto.ts`
- Modify: `apps/api/src/common/password.util.ts` (add validator)

- [ ] **Step 1: Add `validatePasswordStrength` to `apps/api/src/common/password.util.ts`**

```typescript
export class WeakPasswordError extends Error {}

export function validatePasswordStrength(pw: string): void {
  if (pw.length < 10) throw new WeakPasswordError('At least 10 characters');
  if (!/[A-Z]/.test(pw)) throw new WeakPasswordError('Must contain an uppercase letter');
  if (!/[a-z]/.test(pw)) throw new WeakPasswordError('Must contain a lowercase letter');
  if (!/[0-9]/.test(pw)) throw new WeakPasswordError('Must contain a digit');
  if (!/[^A-Za-z0-9]/.test(pw)) throw new WeakPasswordError('Must contain a symbol');
}
```

- [ ] **Step 2: Write failing test `apps/api/src/common/password.util.spec.ts`**

```typescript
import { validatePasswordStrength, WeakPasswordError } from './password.util';

describe('validatePasswordStrength', () => {
  it('accepts a strong password', () => {
    expect(() => validatePasswordStrength('Str0ng!Pass')).not.toThrow();
  });
  it.each(['short1!', 'nouppercase1!', 'NOLOWER1!', 'NoDigits!!', 'NoSymbol12'])('rejects weak: %s', (pw) => {
    expect(() => validatePasswordStrength(pw)).toThrow(WeakPasswordError);
  });
});
```

Run: `pnpm --filter @zanweb/api test src/common/password.util.spec.ts`
Expected: PASS (logic written alongside; ensure red-first by writing test before adding the function in practice).

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/common/password.util.ts apps/api/src/common/password.util.spec.ts
git commit -m "feat(auth): enforce password complexity (REQ-USR-04)"
```

### Task 3.4: Users module — admin user management (REQ-USR-03)

**Files:**
- Create: `apps/api/src/users/dto/create-user.dto.ts`
- Create: `apps/api/src/users/dto/update-user.dto.ts`
- Create: `apps/api/src/users/users.service.ts`
- Create: `apps/api/src/users/users.controller.ts`
- Create: `apps/api/src/users/users.module.ts`

- [ ] **Step 1: Write `apps/api/src/users/dto/create-user.dto.ts`**

```typescript
import { IsEmail, IsEnum, IsString, MinLength, MaxLength } from 'class-validator';
import { UserRole } from '@zanweb/shared';

export class CreateUserDto {
  @IsString() @MinLength(2) @MaxLength(100) name: string;
  @IsEmail() email: string;
  @IsString() @MinLength(10) @MaxLength(128) password: string;
  @IsEnum(UserRole) role: UserRole;
}
```

- [ ] **Step 2: Write `apps/api/src/users/dto/update-user.dto.ts`**

```typescript
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { UserRole, UserStatus } from '@zanweb/shared';

export class UpdateUserDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsEnum(UserRole) role?: UserRole;
  @IsOptional() @IsEnum(UserStatus) status?: UserStatus;
}
```

- [ ] **Step 3: Write failing test `apps/api/src/users/users.service.spec.ts`**

```typescript
import { Test } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConflictException } from '@nestjs/common';
import { UserRole } from '@zanweb/shared';

describe('UsersService.create', () => {
  const prisma = { user: { findUnique: jest.fn(), create: jest.fn() } };
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
  });

  it('throws ConflictException on duplicate email', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'existing' });
    await expect(service.create({ name: 'Ed', email: 'ed@x.go.tz', password: 'Str0ng!Pass', role: UserRole.Editor }))
      .rejects.toThrow(ConflictException);
  });
});
```

Run: `pnpm --filter @zanweb/api test src/users/users.service.spec.ts`
Expected: FAIL — `UsersService` missing.

- [ ] **Step 4: Implement `apps/api/src/users/users.service.ts`**

```typescript
import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { hashPassword, validatePasswordStrength, WeakPasswordError, BadRequestException } from '../common/password.util';
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
```

> **Note:** `BadRequestException` is from `@nestjs/common` — add it to the import from `../common/password.util` is wrong; instead import it from `@nestjs/common` in the service. Correct the import line to:

```typescript
import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { hashPassword, validatePasswordStrength, WeakPasswordError } from '../common/password.util';
import { UserRole, UserStatus } from '@zanweb/shared';
```

Use the corrected import (remove `BadRequestException` from the `password.util` import).

- [ ] **Step 5: Implement `apps/api/src/users/users.controller.ts`**

```typescript
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
```

- [ ] **Step 6: Implement `apps/api/src/users/users.module.ts`**

```typescript
import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

@Module({ controllers: [UsersController], providers: [UsersService], exports: [UsersService] })
export class UsersModule {}
```

- [ ] **Step 7: Wire `UsersModule` into `app.module.ts`**

Add `UsersModule` to `imports`.

- [ ] **Step 8: Run tests**

Run: `pnpm --filter @zanweb/api test`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add apps/api/src/users apps/api/src/app.module.ts
git commit -m "feat(users): admin user CRUD with role assignment (REQ-USR-03)"
```

### Task 3.5: MFA enrollment endpoint for Administrators (REQ-USR-04)

**Files:**
- Create: `apps/api/src/auth/dto/enroll-mfa.dto.ts`
- Modify: `apps/api/src/auth/auth.controller.ts`

- [ ] **Step 1: Add to `auth.controller.ts`** an enroll/enable pair:

```typescript
@Get('mfa/enroll')
@Roles(UserRole.Administrator)
@UseGuards(RolesGuard)
enrollMfa(@Req() req: any) {
  const secret = this.mfa.generateSecret();
  return { secret, qrUri: this.mfa.qrUri(req.user.email, secret) };
}

@Post('mfa/enable')
@Roles(UserRole.Administrator)
@UseGuards(RolesGuard)
async enableMfa(@Req() req: any, @Body() body: EnableMfaDto) {
  if (!this.mfa.verify(body.code, body.secret)) throw new UnauthorizedException('Invalid code');
  await this.prisma.user.update({ where: { id: req.user.id }, data: { mfaEnabled: true, mfaSecret: body.secret } });
  return { enabled: true };
}
```

Inject `MfaService` and `PrismaService` into `AuthController`, import `EnableMfaDto`, `Roles`, `RolesGuard`, `UserRole`, `UnauthorizedException`, `Req`.

- [ ] **Step 2: Write `apps/api/src/auth/dto/enable-mfa.dto.ts`**

```typescript
import { IsString, MinLength, MaxLength } from 'class-validator';
export class EnableMfaDto {
  @IsString() @MinLength(16) secret: string;
  @IsString() @MinLength(6) @MaxLength(6) code: string;
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/auth
git commit -m "feat(auth): MFA enrollment for administrators (REQ-USR-04)"
```

---