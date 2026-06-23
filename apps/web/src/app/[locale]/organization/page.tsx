import { getTranslations } from 'next-intl/server';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

type Props = { params: { locale: string } };

export async function generateMetadata({ params: { locale } }: Props) {
  return {
    title: locale === 'sw' ? 'Muundo wa Shirika' : 'Organization Structure',
    alternates: { canonical: `/${locale}/organization` },
  };
}

export default async function OrganizationPage({ params: { locale } }: Props) {
  const t = await getTranslations({ locale, namespace: 'Nav' });
  const isEn = locale === 'en';

  const links = [
    {
      href: `/organization/board`,
      title: t('organizationSub_board'),
      desc: isEn ? 'Meet the Commission board members' : 'Wajumbe wa Bodi ya Tume',
    },
    {
      href: `/organization/department`,
      title: t('organizationSub_department'),
      desc: isEn ? 'Three departments and their responsibilities' : 'Idara tatu na majukumu yao',
    },
    {
      href: `/organization/unit-division`,
      title: t('organizationSub_unitDivision'),
      desc: isEn ? 'Sections, departments and divisions structure' : 'Sehemu, idara na vitengo',
    },
    {
      href: `/organization/chart`,
      title: t('organizationSub_chart'),
      desc: isEn ? 'Organizational hierarchy chart' : 'Chati ya muundo wa shirika',
    },
  ];

  return (
    <article className="cms-page fade-in">
      <h1>{t('organization')}</h1>
      <p style={{ marginBottom: 'var(--space-6)' }}>
        {isEn
          ? 'The Civil Service Commission of Zanzibar is organized into the following structure:'
          : 'Tume ya Utumishi wa Umma Zanzibar imepangwa katika muundo ufuatao:'}
      </p>

      <div className="grid-2" style={{ marginBottom: 'var(--space-6)' }}>
        {links.map((link) => (
          <Link key={link.href} href={`/${locale}${link.href}`} className="card external-link-card">
            <div className="card-body">
              <h3 className="card-title">{link.title}</h3>
              <p style={{ marginBottom: 0, color: 'var(--color-text-muted)' }}>{link.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </article>
  );
}
