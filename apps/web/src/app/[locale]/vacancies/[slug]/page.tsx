import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { api } from '../../../../lib/api';

export const dynamic = 'force-dynamic';

type Params = { locale: string; slug: string };

export async function generateMetadata({ params: { slug } }: { params: Params }): Promise<Metadata> {
  try {
    const v = await api.vacancyBySlug(slug);
    return { title: v.title, alternates: { canonical: `/vacancies/${slug}` } };
  } catch {
    return {};
  }
}

export default async function VacancyDetail({ params: { locale, slug } }: { params: Params }) {
  let v;
  try {
    v = await api.vacancyBySlug(slug);
  } catch {
    notFound();
  }
  const t = await getTranslations({ locale, namespace: 'Common' });
  const sw = locale === 'sw';
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: v.title,
    hiringOrganization: v.mda,
    datePosted: v.publishDate,
    validThrough: v.closingDate,
    identifier: v.slug,
  };
  return (
    <article>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <h1>{v.title}</h1>
      <p><strong>{sw ? 'Mamlaka' : 'MDA'}:</strong> {v.mda}</p>
      <p>
        <strong>{t('closingDate')}:</strong>{' '}
        <time dateTime={v.closingDate}>{new Date(v.closingDate).toLocaleDateString(sw ? 'sw-TZ' : 'en-GB')}</time>
      </p>
      {v.applyUrl && (
        <p>
          <a className="apply" href={v.applyUrl} rel="noopener noreferrer">{t('applyHere')}</a>
        </p>
      )}
      {v.documents?.length > 0 && (
        <section>
          <h2>{t('documents')}</h2>
          <ul>
            {v.documents.map((d) => (
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