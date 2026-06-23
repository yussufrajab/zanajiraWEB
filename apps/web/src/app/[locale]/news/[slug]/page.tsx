import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import DOMPurify from 'isomorphic-dompurify';
import { api } from '../../../../lib/api';
import { localizedField } from '../../../../lib/i18n-content';

export const dynamic = 'force-dynamic';

type Params = { locale: string; slug: string };

export async function generateMetadata({ params: { locale, slug } }: { params: Params }): Promise<Metadata> {
  try {
    const n = await api.newsBySlug(slug);
    const title = localizedField(n.titleSw, n.titleEn, locale as 'sw' | 'en');
    const body = localizedField(n.bodySw, n.bodyEn, locale as 'sw' | 'en');
    return {
      title: title.text,
      description: (body.text ?? '').slice(0, 160),
      alternates: { canonical: `/${locale}/news/${slug}` },
      openGraph: { type: 'article', title: title.text, publishedTime: n.publishDate },
    };
  } catch {
    return {};
  }
}

export default async function NewsDetail({ params: { locale, slug } }: { params: Params }) {
  let n;
  try {
    n = await api.newsBySlug(slug);
  } catch {
    notFound();
  }
  const title = localizedField(n.titleSw, n.titleEn, locale as 'sw' | 'en');
  const body = localizedField(n.bodySw, n.bodyEn, locale as 'sw' | 'en');
  const t = await getTranslations({ locale, namespace: 'Common' });
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: title.text,
    datePublished: n.publishDate,
    url: `/${locale}/news/${slug}`,
  };
  return (
    <article className="cms-page fade-in">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Link href={`/${locale}/news`} className="back-link">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        {t('readMore')}
      </Link>
      <h1>
        {title.text}
        {!title.translated && <span className="text-muted"> · {t('notTranslated')}</span>}
      </h1>
      <div className="meta mb-6">
        <time dateTime={n.publishDate}>
          {t('publishedOn')}: {new Date(n.publishDate).toLocaleDateString(locale === 'sw' ? 'sw-TZ' : 'en-GB')}
        </time>
      </div>
      {n.coverImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={n.coverImageUrl} alt="" width={800} height={400} className="mb-6" style={{ width: '100%', borderRadius: 'var(--radius-lg)' }} />
      )}
      <div className="cms-body" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(body.text ?? '') }} />
      {n.documents?.length > 0 && (
        <section className="mt-4">
          <h2>{t('documents')}</h2>
          <ul className="notice-list">
            {n.documents.map((d) => (
              <li key={d.id}>
                <article className="notice-card">
                  <a href={d.url}>{d.filename}</a>
                </article>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
