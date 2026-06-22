import Link from 'next/link';
import { useTranslations } from 'next-intl';

export function NoticeCard({
  locale, section, slug, title, date,
}: {
  locale: string; section: string; slug: string; title: string; date: string;
}) {
  const t = useTranslations('Common');
  return (
    <article className="notice-card">
      <h3>
        <Link href={`/${locale}/${section}/${slug}`}>{title}</Link>
      </h3>
      <time dateTime={date}>
        {t('publishedOn')}: {new Date(date).toLocaleDateString(locale === 'sw' ? 'sw-TZ' : 'en-GB')}
      </time>
    </article>
  );
}