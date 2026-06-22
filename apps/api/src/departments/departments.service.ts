import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DepartmentsService {
  constructor(private prisma: PrismaService) {}

  list() {
    return this.prisma.department.findMany({
      select: { id: true, nameSw: true, nameEn: true },
      orderBy: { nameSw: 'asc' },
    });
  }
}
