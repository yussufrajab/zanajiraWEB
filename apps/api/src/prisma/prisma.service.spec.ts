import { Test } from '@nestjs/testing';
import { PrismaModule } from './prisma.module';
import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  it('connects and can run a trivial query', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [PrismaModule] }).compile();
    const prisma = moduleRef.get(PrismaService);
    const result = await prisma.$queryRaw`SELECT 1 AS one`;
    expect((result as any)[0].one).toBe(1);
    await moduleRef.close();
  });
});