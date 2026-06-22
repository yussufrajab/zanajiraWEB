import { useTranslations } from 'next-intl';
import { api } from '../../lib/api';
import { NoticeCard } from '../../components/NoticeCard';

export const dynamic = 'force-dynamic';

export default async function Home({ params: { locale } }: { params: { locale: string } }) {
  const t = useTranslations('Home');
  // SSR fetch of latest news + vacancies; degrade gracefully if the API is unreachable.
  const [news, vacancies] = await Promise.all([
    api.newsList({ page: 1 }).catch(() => ({ items: [] as Awaited<ReturnType<typeof api.newsList>>['items'], total: 0, page: 1, pageSize: 10 })),
    api.vacancyList({ page: 1 }).catch(() => ({ items: [] as Awaited<ReturnType<typeof api.vacancyList>>['items'], total: 0, page: 1, pageSize: 10 })),
  ]);
  const titleFor = (sw: string, en: string | null) => (locale === 'en' && en ? en : sw);
  return (
    <>
      <h1>{t('title')}</h1>
      <p>{t('welcome')}</p>
      <section aria-labelledby="news-h">
        <h2 id="news-h">{t('latestNews')}</h2>
        <ul className="notice-list">
          {news.items.slice(0, 5).map((n) => (
            <li key={n.id}>
              <NoticeCard locale={locale} section="news" slug={n.slug} title={titleFor(n.titleSw, n.titleEn)} date={n.publishDate} />
            </li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="vac-h">
        <h2 id="vac-h">{t('latestVacancies')}</h2>
        <ul className="notice-list">
          {vacancies.items.slice(0, 5).map((v) => (
            <li key={v.id}>
              <NoticeCard locale={locale} section="vacancies" slug={v.slug} title={v.title} date={v.publishDate} />
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}