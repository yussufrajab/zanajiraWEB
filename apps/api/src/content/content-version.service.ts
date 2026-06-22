import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ContentVersionService {
  constructor(private prisma: PrismaService) {}

  async snapshot(args: { entityType: string; entityId: string; data: Record<string, unknown>; authorId?: string }) {
    return this.prisma.contentVersion.create({
      data: {
        entityType: args.entityType,
        entityId: args.entityId,
        snapshot: args.data as any,
        authorId: args.authorId ?? null,
      },
    });
  }

  history(entityType: string, entityId: string) {
    return this.prisma.contentVersion.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: 'desc' },
    });
  }
}