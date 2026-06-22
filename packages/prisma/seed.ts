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

  const defaultPages = [
    { slug: 'about', titleSw: 'Kuhutu Sisi', titleEn: 'About Us', bodySw: '', bodyEn: '' },
    { slug: 'about/introduction', titleSw: 'Utangulizi', titleEn: 'Introduction', bodySw: '', bodyEn: '', parentSlug: 'about' },
    { slug: 'about/mission-vision', titleSw: 'Dhamira na Maono', titleEn: 'Mission & Vision', bodySw: '', bodyEn: '', parentSlug: 'about' },
    { slug: 'about/core-functions', titleSw: 'Kazi Kuu', titleEn: 'Core Functions', bodySw: '', bodyEn: '', parentSlug: 'about' },
    { slug: 'organization', titleSw: 'Muundo wa Shirika', titleEn: 'Organization Structure', bodySw: '', bodyEn: '' },
    { slug: 'organization/board', titleSw: 'Bodi', titleEn: 'Board', bodySw: '', bodyEn: '', parentSlug: 'organization' },
    { slug: 'organization/department', titleSw: 'Idara', titleEn: 'Department', bodySw: '', bodyEn: '', parentSlug: 'organization' },
    { slug: 'organization/unit-division', titleSw: 'Kitengo & Tawi', titleEn: 'Unit & Division', bodySw: '', bodyEn: '', parentSlug: 'organization' },
    { slug: 'organization/chart', titleSw: 'Chatu ya Shirika', titleEn: 'Organization Chart', bodySw: '', bodyEn: '', parentSlug: 'organization' },
    { slug: 'services', titleSw: 'Huduma Zetu', titleEn: 'Our Services', bodySw: '', bodyEn: '' },
    { slug: 'contact', titleSw: 'Wasiliana Nasi', titleEn: 'Contact Us', bodySw: '', bodyEn: '' },
  ];

  for (const p of defaultPages) {
    let parentId: string | null = null;
    if (p.parentSlug) {
      const parent = await prisma.page.findUnique({ where: { slug: p.parentSlug } });
      parentId = parent?.id ?? null;
    }
    await prisma.page.upsert({
      where: { slug: p.slug },
      update: {},
      create: { slug: p.slug, titleSw: p.titleSw, titleEn: p.titleEn, bodySw: p.bodySw, bodyEn: p.bodyEn, parentId },
    });
  }
  console.log('Default pages seeded.');

  console.log('Seed complete. Admin id:', admin.id);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());