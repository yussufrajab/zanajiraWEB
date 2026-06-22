import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SubscribersService {
  constructor(private prisma: PrismaService) {}

  async subscribe(email: string, criteria?: Record<string, any>) {
    return this.prisma.subscriber.upsert({
      where: { email },
      create: { email, criteria: criteria ?? {} },
      update: { criteria: criteria ?? {} },
    });
  }

  async list() {
    return this.prisma.subscriber.findMany({ orderBy: { createdAt: 'desc' } });
  }
}
