import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import DOMPurify from 'isomorphic-dompurify';
import { api } from '../lib/api';
import { localizedField } from '../lib/i18n-content';

export async function CmsPage({ locale, slug }: { locale: string; slug: string }) {
  let page;
  try {
    page = await api.pageBySlug(slug);
  } catch {
    notFound();
  }
  const title = localizedField(page.titleSw, page.titleEn, locale as 'sw' | 'en');
  const body = localizedField(page.bodySw, page.bodyEn, locale as 'sw' | 'en');
  const t = await getTranslations({ locale, namespace: 'Common' });
  return (
    <article className="cms-page fade-in">
      <h1>
        {title.text}
        {!title.translated && <span className="text-muted"> · {t('notTranslated')}</span>}
      </h1>
      <div className="cms-body" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(body.text || '') }} />
    </article>
  );
}

export async function cmsMetadata(locale: string, slug: string) {
  try {
    const page = await api.pageBySlug(slug);
    const { text } = localizedField(page.titleSw, page.titleEn, locale as 'sw' | 'en');
    return { title: text, alternates: { canonical: `/${locale}/${slug}` } };
  } catch {
    return {};
  }
}
