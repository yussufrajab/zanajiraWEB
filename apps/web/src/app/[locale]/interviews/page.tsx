import { api } from '../../../lib/api';
import { NoticeCard } from '../../../components/NoticeCard';

export const dynamic = 'force-dynamic';

type SearchParams = { type?: string; page?: string };

export default async function InterviewList({ params: { locale }, searchParams }: { params: { locale: string }; searchParams: SearchParams }) {
  const data = await api
    .interviewList({ page: Number(searchParams.page ?? 1), type: searchParams.type })
    .catch(() => ({ items: [] as Awaited<ReturnType<typeof api.interviewList>>['items'], total: 0, page: 1, pageSize: 10 }));
  const sw = locale === 'sw';
  return (
    <>
      <h1>{sw ? 'Wito wa Usaili' : 'Call for Interviews'}</h1>
      <form method="get" className="filters" aria-label={sw ? 'Chuja wito wa usaili' : 'Filter interviews'}>
        <label>
          {sw ? 'Aina' : 'Type'}
          <select name="type" defaultValue={searchParams.type ?? ''}>
            <option value="">{sw ? 'Zote' : 'All'}</option>
            <option value="CallForInterview">{sw ? 'Wito wa Usaili' : 'Call for Interview'}</option>
            <option value="InterviewResult">{sw ? 'Matokeo ya Usaili' : 'Interview Results'}</option>
          </select>
        </label>
        <button type="submit">{sw ? 'Chuja' : 'Filter'}</button>
      </form>
      {data.items.length === 0 ? (
        <p>{sw ? 'Hakuna wito wa usaili kwa sasa.' : 'No interviews yet.'}</p>
      ) : (
        <ul className="notice-list">
          {data.items.map((i) => (
            <li key={i.id}>
              <NoticeCard locale={locale} section="interviews" slug={i.slug} title={i.title} date={i.publishDate} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}