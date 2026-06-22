import { api } from '../../../lib/api';
import { NoticeCard } from '../../../components/NoticeCard';

export const dynamic = 'force-dynamic';

type SearchParams = { mda?: string; status?: string; page?: string };

export default async function VacancyList({ params: { locale }, searchParams }: { params: { locale: string }; searchParams: SearchParams }) {
  const data = await api
    .vacancyList({ page: Number(searchParams.page ?? 1), mda: searchParams.mda, status: searchParams.status })
    .catch(() => ({ items: [] as Awaited<ReturnType<typeof api.vacancyList>>['items'], total: 0, page: 1, pageSize: 10 }));
  const sw = locale === 'sw';
  return (
    <>
      <h1>{sw ? 'Tangazo la Nafasi za Kazi' : 'Vacancy Announcements'}</h1>
      <form method="get" className="filters" aria-label={sw ? 'Chuja nafasi za kazi' : 'Filter vacancies'}>
        <label>
          {sw ? 'Mamlaka' : 'MDA'}
          <input name="mda" defaultValue={searchParams.mda ?? ''} />
        </label>
        <label>
          {sw ? 'Hali' : 'Status'}
          <select name="status" defaultValue={searchParams.status ?? ''}>
            <option value="">{sw ? 'Zote' : 'All'}</option>
            <option value="Published">{sw ? 'Wazi' : 'Open'}</option>
            <option value="Closed">{sw ? 'Imefungwa' : 'Closed'}</option>
          </select>
        </label>
        <button type="submit">{sw ? 'Chuja' : 'Filter'}</button>
      </form>
      {data.items.length === 0 ? (
        <p>{sw ? 'Hakuna nafasi kwa sasa.' : 'No vacancies yet.'}</p>
      ) : (
        <ul className="notice-list">
          {data.items.map((v) => (
            <li key={v.id}>
              <NoticeCard locale={locale} section="vacancies" slug={v.slug} title={v.title} date={v.publishDate} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}