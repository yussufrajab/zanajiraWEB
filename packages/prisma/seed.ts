import { config } from 'dotenv';
import { PrismaClient, UserRole } from './generated/client';
import * as bcrypt from 'bcrypt';
import * as path from 'path';

// Load the repo-root .env (DATABASE_URL) so the seed works regardless of cwd.
// Resolve relative to this file so the path is stable no matter the cwd.
config({ path: path.resolve(__dirname, '../../.env') });

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@zanajira.go.tz';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe!123';

  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: UserRole.Administrator, status: 'Active' },
    create: {
      email: adminEmail,
      name: 'System Administrator',
      passwordHash,
      role: UserRole.Administrator,
      status: 'Active',
    },
  });

  const departments = [
    { nameSw: 'Idara ya Utumishi', nameEn: 'Public Service Department' },
    { nameSw: 'Idara ya Utawala', nameEn: 'Administration Department' },
  ];
  for (const d of departments) {
    const existing = await prisma.department.findFirst({ where: { nameSw: d.nameSw } });
    if (!existing) {
      await prisma.department.create({ data: { nameSw: d.nameSw, nameEn: d.nameEn } });
    }
  }

  console.log('Seed complete. Admin id:', admin.id);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());