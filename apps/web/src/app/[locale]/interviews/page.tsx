import { api } from '../../../lib/api';
import { NoticeCard } from '../../../components/NoticeCard';
import { EmptyState } from '../../../components/EmptyState';

export const dynamic = 'force-dynamic';

type SearchParams = { type?: string; page?: string };

export default async function InterviewList({ params: { locale }, searchParams }: { params: { locale: string }; searchParams: SearchParams }) {
  const data = await api
    .interviewList({ page: Number(searchParams.page ?? 1), type: searchParams.type })
    .catch(() => ({ items: [] as Awaited<ReturnType<typeof api.interviewList>>['items'], total: 0, page: 1, pageSize: 10 }));
  const sw = locale === 'sw';
  return (
    <>
      <div className="page-header">
        <h1>{sw ? 'Wito wa Usaili' : 'Call for Interviews'}</h1>
        <p>{sw ? 'Matokeo ya usaili na wito wa usaili wa umma.' : 'Public interview calls and interview results.'}</p>
      </div>
      <form method="get" className="filters" aria-label={sw ? 'Chuja wito wa usaili' : 'Filter interviews'}>
        <label>
          {sw ? 'Aina' : 'Type'}
          <select name="type" defaultValue={searchParams.type ?? ''}>
            <option value="">{sw ? 'Zote' : 'All'}</option>
            <option value="CallForInterview">{sw ? 'Wito wa Usaili' : 'Call for Interview'}</option>
            <option value="InterviewResult">{sw ? 'Matokeo ya Usaili' : 'Interview Results'}</option>
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
        <EmptyState title={sw ? 'Hakuna wito wa usaili' : 'No interviews found'} message={sw ? 'Jaribu chujio tofauti.' : 'Try a different filter.'} />
      ) : (
        <ul className="notice-list">
          {data.items.map((i) => (
            <li key={i.id}>
              <NoticeCard locale={locale} section="interviews" slug={i.slug} title={i.title} date={i.publishDate} status={i.status} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
