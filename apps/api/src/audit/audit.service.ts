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