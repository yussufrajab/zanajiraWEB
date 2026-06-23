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
    <article className="cms-page fade-in">
      <h1>{t('address')}</h1>
      {body && body.text && <div className="cms-body mb-6" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(body.text) }} />}
      <div className="card mb-6">
        <div className="card-body">
          <dl className="contact-list">
            <div>
              <dt>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                {t('phone')}
              </dt>
              <dd>+255 24 223 0000</dd>
            </div>
            <div>
              <dt>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                {t('email')}
              </dt>
              <dd>
                <a href="mailto:info@zanajira.go.tz">info@zanajira.go.tz</a>
              </dd>
            </div>
          </dl>
        </div>
      </div>
      <iframe
        title={t('map')}
        src="https://www.openstreetmap.org/export/embed.html?bbox=39.19%2C-6.22%2C39.24%2C-6.18&layer=mapnik"
        width="100%"
        height="360"
        loading="lazy"
        style={{ border: 0, borderRadius: 'var(--radius-lg)' }}
      />
    </article>
  );
}
