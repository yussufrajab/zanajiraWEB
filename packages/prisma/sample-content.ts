import { config } from 'dotenv';
import { PrismaClient, ContentStatus, VacancyStatus, InterviewType } from './generated/client';
import * as path from 'path';

config({ path: path.resolve(__dirname, '../../.env') });

const prisma = new PrismaClient();

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}

async function main() {
  const admin = await prisma.user.findFirst({ where: { role: 'Administrator' } });
  if (!admin) {
    console.error('No administrator user found. Run seed first.');
    process.exit(1);
  }

  const now = new Date();
  const oneWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const twoWeeks = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  const sampleNews = [
    {
      titleSw: 'Tume ya Utumishi Yazindua Mfumo Mpya wa Maombi ya Ajira',
      titleEn: 'Civil Service Commission Launches New Online Job Application System',
      bodySw: 'Tume ya Utumishi wa Umma Zanzibar imezindua mfumo mpya wa kidigitali unaorahisisha maombi ya ajira kwa wanaoomba kazi sekta ya uma. Mfumo huu unawezesha waombaji kufuatilia hali ya maombi yao na kupata taarifa muhimu kwa urahisi.',
      bodyEn: 'The Civil Service Commission of Zanzibar has launched a new digital system that simplifies job applications for candidates seeking employment in the public sector. Applicants can now track their application status and receive important updates easily.',
    },
    {
      titleSw: 'Ratiba ya Mafunzo ya Wafanyakazi wa Umma kwa Mwaka 2026',
      titleEn: 'Public Service Staff Training Calendar for 2026 Released',
      bodySw: 'Tume ya Utumishi wa Umma imetangaza ratiba ya mafunzo ya kuwajengea uwezo wafanyakazi wa uma kwa mwaka 2026. Mafunzo haya yanalenga kuimarisha utendaji kazi na kuongeza ufanisi katika utoaji wa huduma.',
      bodyEn: 'The Civil Service Commission has announced the staff capacity-building training calendar for 2026. The training aims to improve work performance and increase efficiency in service delivery across public institutions.',
    },
    {
      titleSw: 'Mkutano wa Tume ya Utumishi na Wadau wa Sekta ya Umma',
      titleEn: 'Civil Service Commission Holds Stakeholder Engagement Forum',
      bodySw: 'Tume ya Utumishi wa Umma imefanya mkutano na wadau mbalimbali wa sekta ya uma kujadili masuala yanayoathiri utendaji kazi na kutafuta njia bora za kuimarisha utawala bora.',
      bodyEn: 'The Civil Service Commission held a stakeholder engagement forum with various public sector actors to discuss issues affecting performance and explore better ways to strengthen good governance.',
    },
  ];

  const sampleVacancies = [
    {
      title: 'Public Service Officer – Human Resource Management',
      mda: 'Ministry of Health',
      closingDate: oneWeek,
    },
    {
      title: 'Senior Accountant',
      mda: 'Ministry of Finance',
      closingDate: twoWeeks,
    },
    {
      title: 'ICT Support Specialist',
      mda: 'Civil Service Commission',
      closingDate: oneWeek,
    },
  ];

  const sampleInterviews = [
    {
      title: 'Call for Interview – Public Service Officers Batch 1',
      mda: 'Ministry of Education',
      type: InterviewType.CallForInterview,
    },
    {
      title: 'Interview Results – Senior Accountants June 2026',
      mda: 'Ministry of Finance',
      type: InterviewType.InterviewResult,
    },
    {
      title: 'Call for Interview – ICT Support Specialists',
      mda: 'Civil Service Commission',
      type: InterviewType.CallForInterview,
    },
  ];

  const createdNews: string[] = [];
  for (const n of sampleNews) {
    const slug = `${slugify(n.titleEn ?? n.titleSw)}-${Math.random().toString(36).slice(2, 6)}`;
    const item = await prisma.newsPost.create({
      data: {
        slug,
        titleSw: n.titleSw,
        titleEn: n.titleEn,
        bodySw: n.bodySw,
        bodyEn: n.bodyEn,
        publishDate: now,
        status: ContentStatus.Published,
        authorId: admin.id,
      },
    });
    createdNews.push(item.id);
  }

  const createdVacancies: string[] = [];
  for (const v of sampleVacancies) {
    const slug = `${slugify(v.title)}-${Math.random().toString(36).slice(2, 6)}`;
    const item = await prisma.vacancy.create({
      data: {
        slug,
        title: v.title,
        mda: v.mda,
        closingDate: v.closingDate,
        publishDate: now,
        status: VacancyStatus.Published,
        authorId: admin.id,
      },
    });
    createdVacancies.push(item.id);
  }

  const createdInterviews: string[] = [];
  for (const i of sampleInterviews) {
    const slug = `${slugify(i.title)}-${Math.random().toString(36).slice(2, 6)}`;
    const item = await prisma.interviewNotice.create({
      data: {
        slug,
        title: i.title,
        mda: i.mda,
        type: i.type,
        publishDate: now,
        status: ContentStatus.Published,
        authorId: admin.id,
      },
    });
    createdInterviews.push(item.id);
  }

  console.log('Sample content created:');
  console.log(`  News posts: ${createdNews.length}`);
  console.log(`  Vacancies:  ${createdVacancies.length}`);
  console.log(`  Interviews: ${createdInterviews.length}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
