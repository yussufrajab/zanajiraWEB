import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { AnalyticsService } from './analytics.service';

@Injectable()
export class PageViewInterceptor implements NestInterceptor {
  constructor(private analytics: AnalyticsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest<{ method: string; path: string; user?: any }&any>();
    return next.handle().pipe(
      tap(() => {
        if (req.method !== 'GET') return;
        if (
          req.path?.startsWith('/api/admin') ||
          req.path?.startsWith('/api/health') ||
          req.path?.startsWith('/admin') ||
          req.path?.startsWith('/health')
        ) {
          return;
        }
        const locale = (req.path?.match(/^\/(sw|en)(\/|$)/) ?? [])[1] ?? 'sw';
        this.analytics.recordPageView(req.path ?? '/', locale).catch(() => {});
      }),
    );
  }
}
