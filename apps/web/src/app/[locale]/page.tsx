import { getTranslations } from 'next-intl/server';
import { api } from '../../lib/api';
import { NoticeCard } from '../../components/NoticeCard';
import { EmptyState } from '../../components/EmptyState';
import { PhotoSlideshow } from '../../components/PhotoSlideshow';

export const dynamic = 'force-dynamic';

export default async function Home({ params: { locale } }: { params: { locale: string } }) {
  const t = await getTranslations({ locale, namespace: 'Home' });
  const [news, vacancies, interviews] = await Promise.all([
    api.newsList({ page: 1 }).catch(() => ({ items: [] as Awaited<ReturnType<typeof api.newsList>>['items'], total: 0, page: 1, pageSize: 10 })),
    api.vacancyList({ page: 1 }).catch(() => ({ items: [] as Awaited<ReturnType<typeof api.vacancyList>>['items'], total: 0, page: 1, pageSize: 10 })),
    api.interviewList({ page: 1 }).catch(() => ({ items: [] as Awaited<ReturnType<typeof api.interviewList>>['items'], total: 0, page: 1, pageSize: 10 })),
  ]);
  const titleFor = (sw: string, en: string | null) => (locale === 'en' && en ? en : sw);
  return (
    <>
      <section className="hero">
        <div className="container">
          <h1>{t('title')}</h1>
          <p>{t('welcome')}</p>
        </div>
      </section>

      <PhotoSlideshow />

      <div className="page-content">
        <div className="container">
          <div className="grid-3 stagger-children">
            <section aria-label={t('latestNews')}>
              <div className="section-title">
                <h2 style={{ marginBottom: 0 }}>{t('latestNews')}</h2>
              </div>
              {news.items.length === 0 ? (
                <EmptyState title={locale === 'sw' ? 'Hakuna habari kwa sasa' : 'No news yet'} />
              ) : (
                <ul className="notice-list">
                  {news.items.slice(0, 5).map((n) => (
                    <li key={n.id}>
                      <NoticeCard
                        locale={locale}
                        section="news"
                        slug={n.slug}
                        title={titleFor(n.titleSw, n.titleEn)}
                        date={n.publishDate}
                        status={n.status}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section aria-label={t('latestVacancies')}>
              <div className="section-title">
                <h2 style={{ marginBottom: 0 }}>{t('latestVacancies')}</h2>
              </div>
              {vacancies.items.length === 0 ? (
                <EmptyState title={locale === 'sw' ? 'Hakuna nafasi kwa sasa' : 'No vacancies yet'} />
              ) : (
                <ul className="notice-list">
                  {vacancies.items.slice(0, 5).map((v) => (
                    <li key={v.id}>
                      <NoticeCard
                        locale={locale}
                        section="vacancies"
                        slug={v.slug}
                        title={v.title}
                        date={v.publishDate}
                        status={v.status === 'Published' ? (locale === 'sw' ? 'Open' : 'Open') : v.status}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section aria-label={t('latestInterviews')}>
              <div className="section-title">
                <h2 style={{ marginBottom: 0 }}>{t('latestInterviews')}</h2>
              </div>
              {interviews.items.length === 0 ? (
                <EmptyState title={locale === 'sw' ? 'Hakuna wito wa usaili kwa sasa' : 'No interviews yet'} />
              ) : (
                <ul className="notice-list">
                  {interviews.items.slice(0, 5).map((i) => (
                    <li key={i.id}>
                      <NoticeCard
                        locale={locale}
                        section="interviews"
                        slug={i.slug}
                        title={i.title}
                        date={i.publishDate}
                        status={i.status}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
