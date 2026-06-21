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
    (reflector as any).getAllAndOverride = jest.fn().mockReturnValue(roles);
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