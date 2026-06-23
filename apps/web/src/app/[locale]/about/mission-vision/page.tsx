import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import DOMPurify from 'isomorphic-dompurify';

export const dynamic = 'force-dynamic';

type Props = { params: { locale: string } };

export async function generateMetadata({ params: { locale } }: Props) {
  const title = locale === 'sw' ? 'Dhamira na Maono' : 'Mission & Vision';
  return { title, alternates: { canonical: `/${locale}/about/mission-vision` } };
}

export default async function MissionVisionPage({ params: { locale } }: Props) {
  const t = await getTranslations({ locale, namespace: 'Nav' });
  const isEn = locale === 'en';

  const body = isEn
    ? `<div style="background: var(--color-surface-alt); padding: var(--space-6); border-radius: var(--radius-lg); margin-bottom: var(--space-6); border-left: 4px solid var(--color-accent);">
  <h3 style="margin-top: 0;">Mission</h3>
  <p style="font-size: var(--font-size-lg); font-style: italic; margin-bottom: 0;">"Addressing the rights of employees and provide opportunities to promote government performance."</p>
</div>

<div style="background: var(--color-surface-alt); padding: var(--space-6); border-radius: var(--radius-lg); border-left: 4px solid var(--color-accent);">
  <h3 style="margin-top: 0;">Vision</h3>
  <p style="font-size: var(--font-size-lg); font-style: italic; margin-bottom: 0;">"The existence of dedicated service that meets the values and qualities of the civil servants."</p>
</div>`
    : `<div style="background: var(--color-surface-alt); padding: var(--space-6); border-radius: var(--radius-lg); margin-bottom: var(--space-6); border-left: 4px solid var(--color-accent);">
  <h3 style="margin-top: 0;">Dhamira</h3>
  <p style="font-size: var(--font-size-lg); font-style: italic; margin-bottom: 0;">"Kushughulikia haki za watumishi na kutoa fursa za kuendeleza utendaji wa serikali."</p>
</div>

<div style="background: var(--color-surface-alt); padding: var(--space-6); border-radius: var(--radius-lg); border-left: 4px solid var(--color-accent);">
  <h3 style="margin-top: 0;">Maono</h3>
  <p style="font-size: var(--font-size-lg); font-style: italic; margin-bottom: 0;">"Kuwepo kwa huduma ya kujitolea inayokidhi maadili na sifa za watumishi wa umma."</p>
</div>`;

  return (
    <article className="cms-page fade-in">
      <p className="back-link">
        <Link href={`/${locale}/about`}>← {t('about')}</Link>
      </p>
      <h1>{isEn ? 'Mission & Vision' : 'Dhamira na Maono'}</h1>
      <div className="cms-body" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(body) }} />
    </article>
  );
}
