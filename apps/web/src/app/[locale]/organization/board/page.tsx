import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

type Props = { params: { locale: string } };

export async function generateMetadata({ params: { locale } }: Props) {
  const title = locale === 'sw' ? 'Bodi' : 'Board';
  return { title, alternates: { canonical: `/${locale}/organization/board` } };
}

export default async function BoardPage({ params: { locale } }: Props) {
  const t = await getTranslations({ locale, namespace: 'Nav' });
  const isEn = locale === 'en';

  const members = [
    { name: 'Kombo Hassan Juma', role: isEn ? 'Chairperson' : 'Mwenyekiti' },
    { name: 'Juma Haji Juma', role: isEn ? 'Member' : 'Mjumbe' },
    { name: 'Yussuf Ali Salim', role: isEn ? 'Member' : 'Mjumbe' },
    { name: 'Salama Komb Ahmed', role: isEn ? 'Member' : 'Mjumbe' },
    { name: 'Maryam Abdalla Yussuf', role: isEn ? 'Member' : 'Mjumbe' },
    { name: 'Asha Ali Ameir', role: isEn ? 'Member' : 'Mjumbe' },
    { name: 'Zuhura Shamis Abdalla', role: isEn ? 'Member' : 'Mjumbe' },
  ];

  return (
    <article className="cms-page fade-in">
      <p className="back-link">
        <Link href={`/${locale}/organization`}>← {t('organization')}</Link>
      </p>
      <h1>{isEn ? 'Board Members' : 'Wajumbe wa Bodi'}</h1>
      <p style={{ marginBottom: 'var(--space-6)' }}>
        {isEn
          ? 'The Commission is led by a distinguished Board of members appointed by the President of Zanzibar and the Chairman of the Revolutionary Council.'
          : 'Tume inaongozwa na Bodi ya wajumbe mashuhuri walioteuliwa na Rais wa Zanzibar na Mwenyekiti wa Baraza la Mapinduzi.'}
      </p>

      <div className="board-table-wrapper">
        <table className="board-table">
          <thead>
            <tr>
              <th>#</th>
              <th>{isEn ? 'Name' : 'Jina'}</th>
              <th>{isEn ? 'Role' : 'Wadhifa'}</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m, i) => (
              <tr key={m.name}>
                <td>{i + 1}</td>
                <td><strong>{m.name}</strong></td>
                <td>{m.role}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}
