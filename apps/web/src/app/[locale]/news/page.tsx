import { api } from '../../../lib/api';
import { NoticeCard } from '../../../components/NoticeCard';
import { NewsFilters } from '../../../components/NewsFilters';
import { EmptyState } from '../../../components/EmptyState';
import { localizedField } from '../../../lib/i18n-content';

export const dynamic = 'force-dynamic';

type SearchParams = { q?: string; dateFrom?: string; dateTo?: string; page?: string };

export default async function NewsList({ params: { locale }, searchParams }: { params: { locale: string }; searchParams: SearchParams }) {
  const data = await api
    .newsList({ page: Number(searchParams.page ?? 1), q: searchParams.q, dateFrom: searchParams.dateFrom, dateTo: searchParams.dateTo })
    .catch(() => ({ items: [] as Awaited<ReturnType<typeof api.newsList>>['items'], total: 0, page: 1, pageSize: 10 }));
  const titleFor = (sw: string, en: string | null) => localizedField(sw, en, locale as 'sw' | 'en').text;
  const sw = locale === 'sw';
  return (
    <>
      <div className="page-header">
        <h1>{sw ? 'Habari' : 'News'}</h1>
        <p>{sw ? 'Soma habari na matangazo kutoka Tume ya Utumishi wa Umma.' : 'Read announcements and updates from the Civil Service Commission.'}</p>
      </div>
      <NewsFilters locale={locale} />
      {data.items.length === 0 ? (
        <EmptyState title={sw ? 'Hakuna habari' : 'No news found'} message={sw ? 'Jaribu chujio tofauti.' : 'Try a different filter.'} />
      ) : (
        <ul className="notice-list">
          {data.items.map((n) => (
            <li key={n.id}>
              <NoticeCard locale={locale} section="news" slug={n.slug} title={titleFor(n.titleSw, n.titleEn)} date={n.publishDate} status={n.status} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
