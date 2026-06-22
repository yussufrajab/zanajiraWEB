import { notFound } from 'next/navigation';
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
    <article>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <h1>{n.title}</h1>
      <p><strong>{sw ? 'Mamlaka' : 'MDA'}:</strong> {n.mda}</p>
      <time dateTime={n.publishDate}>{new Date(n.publishDate).toLocaleDateString(sw ? 'sw-TZ' : 'en-GB')}</time>
      {n.documents?.length > 0 && (
        <section>
          <h2>{t('documents')}</h2>
          <ul>
            {n.documents.map((d) => (
              <li key={d.id}>
                <a href={d.url}>{d.filename}</a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}