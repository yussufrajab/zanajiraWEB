import { api } from '../../../lib/api';
import { NoticeCard } from '../../../components/NoticeCard';
import { NewsFilters } from '../../../components/NewsFilters';
import { localizedField } from '../../../lib/i18n-content';

export const dynamic = 'force-dynamic';

type SearchParams = { q?: string; dateFrom?: string; dateTo?: string; page?: string };

export default async function NewsList({ params: { locale }, searchParams }: { params: { locale: string }; searchParams: SearchParams }) {
  const data = await api
    .newsList({ page: Number(searchParams.page ?? 1), q: searchParams.q, dateFrom: searchParams.dateFrom, dateTo: searchParams.dateTo })
    .catch(() => ({ items: [] as Awaited<ReturnType<typeof api.newsList>>['items'], total: 0, page: 1, pageSize: 10 }));
  const titleFor = (sw: string, en: string | null) => localizedField(sw, en, locale as 'sw' | 'en').text;
  return (
    <>
      <h1>{locale === 'sw' ? 'Habari' : 'News'}</h1>
      <NewsFilters locale={locale} />
      {data.items.length === 0 ? (
        <p>{locale === 'sw' ? 'Hakuna habari kwa sasa.' : 'No news yet.'}</p>
      ) : (
        <ul className="notice-list">
          {data.items.map((n) => (
            <li key={n.id}>
              <NoticeCard locale={locale} section="news" slug={n.slug} title={titleFor(n.titleSw, n.titleEn)} date={n.publishDate} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}