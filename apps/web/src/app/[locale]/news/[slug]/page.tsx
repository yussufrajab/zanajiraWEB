import { notFound } from 'next/navigation';
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
    <article>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <h1>
        {title.text}
        {!title.translated && <small> · {t('notTranslated')}</small>}
      </h1>
      <time dateTime={n.publishDate}>{new Date(n.publishDate).toLocaleDateString(locale === 'sw' ? 'sw-TZ' : 'en-GB')}</time>
      {n.coverImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={n.coverImageUrl} alt="" width={800} height={400} />
      )}
      <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(body.text ?? '') }} />
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