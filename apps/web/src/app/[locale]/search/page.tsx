import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { api } from '../../../lib/api';
import { EmptyState } from '../../../components/EmptyState';

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
    <div className="search-hero">
      <div className="page-header">
        <h1>{t('searchResults')}</h1>
      </div>
      <form method="get" className="search-form" aria-label={t('search')}>
        <input
          name="q"
          defaultValue={searchParams.q ?? ''}
          placeholder={t('searchPlaceholder')}
          aria-label={t('search')}
          autoFocus
        />
        <button type="submit">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          {t('search')}
        </button>
      </form>

      {searchParams.q && results.length === 0 && (
        <div className="mt-4">
          <EmptyState title={t('noResults')} message={`"${searchParams.q}"`} />
        </div>
      )}

      <ul className="notice-list" style={{ maxWidth: 800, margin: '2rem auto 0' }}>
        {results.map((r) => {
          const sec = sectionFor(r.type);
          const href = sec ? `/${locale}/${sec}/${r.slug}` : `/${locale}/${r.slug}`;
          return (
            <li key={r.id}>
              <article className="notice-card">
                <h3>
                  <Link href={href}>{r.title}</Link>
                </h3>
              </article>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
