import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { api } from '../../../../lib/api';

export const dynamic = 'force-dynamic';

type Params = { locale: string; slug: string };

export async function generateMetadata({ params: { slug } }: { params: Params }): Promise<Metadata> {
  try {
    const n = await api.interviewBySlug(slug);
    return { title: n.title, alternates: { canonical: `/interviews/${slug}` } };
  } catch {
    return {};
  }
}

export default async function InterviewDetail({ params: { locale, slug } }: { params: Params }) {
  let n;
  try {
    n = await api.interviewBySlug(slug);
  } catch {
    notFound();
  }
  const t = await getTranslations({ locale, namespace: 'Common' });
  const sw = locale === 'sw';
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: n.title,
    datePublished: n.publishDate,
    url: `/${locale}/interviews/${slug}`,
  };
  return (
    <article className="cms-page fade-in">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Link href={`/${locale}/interviews`} className="back-link">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        {t('readMore')}
      </Link>

      <h1>{n.title}</h1>
      <div className="meta mb-6">
        <span><strong>{sw ? 'Mamlaka' : 'MDA'}:</strong> {n.mda}</span>
        <time dateTime={n.publishDate}>
          {t('publishedOn')}: {new Date(n.publishDate).toLocaleDateString(sw ? 'sw-TZ' : 'en-GB')}
        </time>
      </div>

      {n.documents?.length > 0 && (
        <section className="mt-4">
          <h2>{t('documents')}</h2>
          <ul className="notice-list">
            {n.documents.map((d) => (
              <li key={d.id}>
                <article className="notice-card">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
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
