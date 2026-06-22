import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { api } from '../../../lib/api';

export const dynamic = 'force-dynamic';

type SearchParams = { q?: string };

export default async function SearchPage({ params: { locale }, searchParams }: { params: { locale: string }; searchParams: SearchParams }) {
  const t = await getTranslations({ locale, namespace: 'Common' });
  let results: { id: string; type: string; slug: string; title: string }[] = [];
  if (searchParams.q) {
    results = await api.search(searchParams.q).catch(() => []);
  }
  const sectionFor = (type: string) =>
    type === 'NewsPost' ? 'news' : type === 'Vacancy' ? 'vacancies' : type === 'InterviewNotice' ? 'interviews' : null;
  return (
    <>
      <h1>{t('searchResults')}</h1>
      <form method="get" aria-label={t('search')}>
        <input name="q" defaultValue={searchParams.q ?? ''} placeholder={t('searchPlaceholder')} aria-label={t('search')} />
        <button type="submit">{t('search')}</button>
      </form>
      {searchParams.q && results.length === 0 && <p>{t('noResults')}</p>}
      <ul className="notice-list">
        {results.map((r) => {
          const sec = sectionFor(r.type);
          const href = sec ? `/${locale}/${sec}/${r.slug}` : `/${locale}/${r.slug}`;
          return (
            <li key={r.id}>
              <Link href={href}>{r.title}</Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}