import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

type Props = { params: { locale: string } };

export async function generateMetadata({ params: { locale } }: Props) {
  const title = locale === 'sw' ? 'Chati ya Shirika' : 'Organization Chart';
  return { title, alternates: { canonical: `/${locale}/organization/chart` } };
}

export default async function ChartPage({ params: { locale } }: Props) {
  const t = await getTranslations({ locale, namespace: 'Nav' });
  const isEn = locale === 'en';

  const levels = isEn
    ? [
        { title: 'Board of Commissioners', items: ['Chairperson', 'Vice Chairperson', 'Commissioners'] },
        { title: 'Commission Secretary', items: ['Chief Executive Officer'] },
        { title: 'Departments', items: ['Human Resource, Administration & Planning', 'Human Resource Management', 'Recruitment & Quality Control'] },
        { title: 'Divisions', items: ['HR & Administration', 'Planning, Monitoring & Evaluation', 'Guideline Administration', 'Disciplinary Matters', 'Job Advertisement & Statistics', 'Evaluation of Job Applicants'] },
        { title: 'Sections', items: ['Accounting', 'Procurement', 'ICT', 'Public Relations', 'Internal Audit', 'Legal'] },
      ]
    : [
        { title: 'Bodi ya Wakamishna', items: ['Mwenyekiti', 'Makamu Mwenyekiti', 'Wakamishna'] },
        { title: 'Katibu wa Tume', items: ['Afisa Mtendaji Mkuu'] },
        { title: 'Idara', items: ['Rasilimali Watu, Utawala na Mipango', 'Usimamizi wa Rasilimali Watu', 'Uajiri na Udhibiti wa Ubora'] },
        { title: 'Vitengo', items: ['Rasilimali Watu na Utawala', 'Mipango, Ufuatiliaji na Tathmini', 'Usimamizi wa Miongozo', 'Mambo ya Nidhamu', 'Matangazo ya Kazi na Takwimu', 'Tathmini ya Waombaji Kazi'] },
        { title: 'Sehemu', items: ['Uhasibu', 'Ununuzi', 'TEHAMA', 'Mahusiano ya Umma', 'Ukaguzi wa Ndani', 'Sheria'] },
      ];

  return (
    <article className="cms-page fade-in">
      <p className="back-link">
        <Link href={`/${locale}/organization`}>← {t('organization')}</Link>
      </p>
      <h1>{isEn ? 'Organization Chart' : 'Chati ya Shirika'}</h1>
      <p style={{ marginBottom: 'var(--space-6)' }}>
        {isEn
          ? 'The organizational structure of the Civil Service Commission – Zanzibar'
          : 'Muundo wa shirika la Tume ya Utumishi wa Umma – Zanzibar'}
      </p>

      <div className="org-chart">
        {levels.map((level, i) => (
          <div key={i} className="org-level">
            <div className="org-level-header">{level.title}</div>
            <div className="org-items">
              {level.items.map((item, j) => (
                <div key={j} className={`org-item ${i === 0 ? 'org-item-top' : ''} ${i === 1 ? 'org-item-ceo' : ''}`}>
                  {item}
                </div>
              ))}
            </div>
            {i < levels.length - 1 && <div className="org-connector" />}
          </div>
        ))}
      </div>
    </article>
  );
}
