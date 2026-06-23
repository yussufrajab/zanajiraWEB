import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

type Props = { params: { locale: string } };

export async function generateMetadata({ params: { locale } }: Props) {
  const title = locale === 'sw' ? 'Sehemu na Vitengo' : 'Units & Divisions';
  return { title, alternates: { canonical: `/${locale}/organization/unit-division` } };
}

export default async function UnitDivisionPage({ params: { locale } }: Props) {
  const t = await getTranslations({ locale, namespace: 'Nav' });
  const isEn = locale === 'en';

  return (
    <article className="cms-page fade-in">
      <p className="back-link">
        <Link href={`/${locale}/organization`}>← {t('organization')}</Link>
      </p>
      <h1>{isEn ? 'Units & Divisions' : 'Sehemu na Vitengo'}</h1>
      <p style={{ marginBottom: 'var(--space-6)' }}>
        {isEn
          ? 'The Commission is structured with the following sections and departmental divisions:'
          : 'Tume imepangwa kwa sehemu na vitengo vifuatavyo:'}
      </p>

      <h2 className="section-title">{isEn ? 'Sections' : 'Sehemu'}</h2>
      <div className="grid-2" style={{ marginBottom: 'var(--space-8)' }}>
        {['Accounting Section', 'Procurement', 'ICT', 'Public Relation', 'Internal Auditing', 'Law'].map((s, i) => (
          <div key={i} className="card">
            <div className="card-body">
              <h3 className="card-title" style={{ marginBottom: 0 }}>{s}</h3>
            </div>
          </div>
        ))}
      </div>

      <h2 className="section-title">{isEn ? 'Departments & Divisions' : 'Idara na Vitengo'}</h2>

      <div className="dept-division-list" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
          <div className="card-body">
            <h3 className="card-title">
              {isEn ? '1. Department of Human Resource, Administration and Planning' : '1. Idara ya Rasilimali Watu, Utawala na Mipango'}
            </h3>
            <ul>
              <li>{isEn ? 'Division of Human Resource and Administration' : 'Kitengo cha Rasilimali Watu na Utawala'}</li>
              <li>{isEn ? 'Division of Planning, Monitoring and Evaluation' : 'Kitengo cha Mipango, Ufuatiliaji na Tathmini'}</li>
            </ul>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
          <div className="card-body">
            <h3 className="card-title">
              {isEn ? '2. Department of Human Resource Management' : '2. Idara ya Usimamizi wa Rasilimali Watu'}
            </h3>
            <ul>
              <li>{isEn ? 'Division of Guideline Administration' : 'Kitengo cha Usimamizi wa Miongozo'}</li>
              <li>{isEn ? 'Division of Disciplinary Matter' : 'Kitengo cha Mambo ya Nidhamu'}</li>
            </ul>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <h3 className="card-title">
              {isEn ? '3. Department of Recruitment and Quality Control' : '3. Idara ya Uajiri na Udhibiti wa Ubora'}
            </h3>
            <ul>
              <li>{isEn ? 'Division of Job Advertisement and Statistics' : 'Kitengo cha Matangazo ya Kazi na Takwimu'}</li>
              <li>{isEn ? 'Division of Evaluation of Job Applicants' : 'Kitengo cha Tathmini ya Waombaji Kazi'}</li>
            </ul>
          </div>
        </div>
      </div>
    </article>
  );
}
