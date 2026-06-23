import { api } from '../../../lib/api';
import { NoticeCard } from '../../../components/NoticeCard';
import { EmptyState } from '../../../components/EmptyState';

export const dynamic = 'force-dynamic';

type SearchParams = { mda?: string; status?: string; page?: string };

export default async function VacancyList({ params: { locale }, searchParams }: { params: { locale: string }; searchParams: SearchParams }) {
  const data = await api
    .vacancyList({ page: Number(searchParams.page ?? 1), mda: searchParams.mda, status: searchParams.status })
    .catch(() => ({ items: [] as Awaited<ReturnType<typeof api.vacancyList>>['items'], total: 0, page: 1, pageSize: 10 }));
  const sw = locale === 'sw';
  return (
    <>
      <div className="page-header">
        <h1>{sw ? 'Tangazo la Nafasi za Kazi' : 'Vacancy Announcements'}</h1>
        <p>{sw ? 'Fursa za ajira katika sekta ya uma Zanzibar.' : 'Public sector job opportunities in Zanzibar.'}</p>
      </div>
      <form method="get" className="filters" aria-label={sw ? 'Chuja nafasi za kazi' : 'Filter vacancies'}>
        <label>
          {sw ? 'Mamlaka' : 'MDA'}
          <input name="mda" defaultValue={searchParams.mda ?? ''} placeholder={sw ? 'Mamlaka...' : 'MDA...'} />
        </label>
        <label>
          {sw ? 'Hali' : 'Status'}
          <select name="status" defaultValue={searchParams.status ?? ''}>
            <option value="">{sw ? 'Zote' : 'All'}</option>
            <option value="Published">{sw ? 'Wazi' : 'Open'}</option>
            <option value="Closed">{sw ? 'Imefungwa' : 'Closed'}</option>
          </select>
        </label>
        <button type="submit">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          {sw ? 'Chuja' : 'Filter'}
        </button>
      </form>
      {data.items.length === 0 ? (
        <EmptyState title={sw ? 'Hakuna nafasi' : 'No vacancies found'} message={sw ? 'Jaribu chujio tofauti.' : 'Try a different filter.'} />
      ) : (
        <ul className="notice-list">
          {data.items.map((v) => (
            <li key={v.id}>
              <NoticeCard locale={locale} section="vacancies" slug={v.slug} title={v.title} date={v.publishDate} status={v.status} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
