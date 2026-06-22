import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { IS_PUBLIC_KEY } from './public.decorator';
import { AuthService } from './auth.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private reflector: Reflector, private jwt: JwtService, private auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const req = context.switchToHttp().getRequest<{ headers: Record<string, string> }>();
    const header = req.headers.authorization;
    if (header?.startsWith('Bearer ')) {
      try {
        const payload = await this.jwt.verifyAsync(header.slice(7));
        const user = await this.auth.validatePayload({ sub: payload.sub, role: payload.role });
        if (user) {
          (req as any).user = user; // { id, email, name, role, status }
        }
      } catch {
        // ignore invalid token on public routes; non-public routes will fail below
      }
    }

    if (isPublic) return true;

    if (!(req as any).user) return false;
    return true;
  }
}