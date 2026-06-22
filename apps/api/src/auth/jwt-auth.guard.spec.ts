import { Test } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { JwtService, JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AuthService } from './auth.service';
import { ExecutionContext } from '@nestjs/common';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let jwt: JwtService;
  const auth = { validatePayload: jest.fn() };

  function ctx(headers: Record<string, string>, isPublic = false): ExecutionContext {
    return {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({ getRequest: () => ({ headers }) }),
    } as unknown as ExecutionContext & { __isPublic?: boolean };
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        JwtModule.register({ secret: 'test-secret' }),
      ],
      providers: [
        JwtAuthGuard,
        Reflector,
        { provide: AuthService, useValue: auth },
      ],
    }).compile();
    guard = moduleRef.get(JwtAuthGuard);
    jwt = moduleRef.get(JwtService);
  });

  it('returns true and sets req.user.id from a valid token for an active user', async () => {
    const token = await jwt.signAsync({ sub: 'user-123', role: 'Editor', email: 'a@x.go.tz' });
    auth.validatePayload.mockResolvedValue({ id: 'user-123', email: 'a@x.go.tz', name: 'A', role: 'Editor', status: 'Active' });
    const req: any = { headers: { authorization: `Bearer ${token}` } };
    const execCtx = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({ getRequest: () => req }),
    } as any;
    const ok = await guard.canActivate(execCtx);
    expect(ok).toBe(true);
    expect(req.user.id).toBe('user-123');
  });

  it('returns false when the user is not found / deactivated (validatePayload returns null)', async () => {
    const token = await jwt.signAsync({ sub: 'ghost', role: 'Editor', email: 'g@x.go.tz' });
    auth.validatePayload.mockResolvedValue(null);
    const req: any = { headers: { authorization: `Bearer ${token}` } };
    const execCtx = {
      getHandler: () => ({}), getClass: () => ({}),
      switchToHttp: () => ({ getRequest: () => req }),
    } as any;
    expect(await guard.canActivate(execCtx)).toBe(false);
  });

  it('returns false with no bearer token', async () => {
    const req: any = { headers: {} };
    const execCtx = {
      getHandler: () => ({}), getClass: () => ({}),
      switchToHttp: () => ({ getRequest: () => req }),
    } as any;
    expect(await guard.canActivate(execCtx)).toBe(false);
  });
});