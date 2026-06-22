import { getTranslations } from 'next-intl/server';
import DOMPurify from 'isomorphic-dompurify';
import { api } from '../../../lib/api';
import { localizedField } from '../../../lib/i18n-content';

export const dynamic = 'force-dynamic';

export default async function Contact({ params: { locale } }: { params: { locale: string } }) {
  const t = await getTranslations({ locale, namespace: 'Contact' });
  const page = await api.pageBySlug('contact').catch(() => null);
  const body = page ? localizedField(page.bodySw, page.bodyEn, locale as 'sw' | 'en') : null;
  return (
    <article>
      <h1>{t('address')}</h1>
      {body && body.text && <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(body.text) }} />}
      <dl>
        <dt>{t('phone')}</dt>
        <dd>+255 24 223 0000</dd>
        <dt>{t('email')}</dt>
        <dd><a href="mailto:info@zanajira.go.tz">info@zanajira.go.tz</a></dd>
      </dl>
      <iframe
        title={t('map')}
        src="https://www.openstreetmap.org/export/embed.html?bbox=39.19%2C-6.22%2C39.24%2C-6.18&layer=mapnik"
        width="100%"
        height="320"
        loading="lazy"
      />
    </article>
  );
}