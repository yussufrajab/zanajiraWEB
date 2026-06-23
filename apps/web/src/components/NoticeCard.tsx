import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Badge } from './Badge';

export function NoticeCard({
  locale, section, slug, title, date, status,
}: {
  locale: string; section: string; slug: string; title: string; date: string; status?: string;
}) {
  const t = useTranslations('Common');
  const statusVariant =
    status === 'Published' || status === 'Open' ? 'success' :
    status === 'Closed' ? 'danger' :
    status === 'Draft' ? 'muted' :
    status === 'InReview' ? 'warning' :
    status === 'Rejected' ? 'danger' : undefined;

  return (
    <article className="notice-card">
      <h3>
        <Link href={`/${locale}/${section}/${slug}`}>{title}</Link>
      </h3>
      <div className="meta">
        <time dateTime={date}>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          {new Date(date).toLocaleDateString(locale === 'sw' ? 'sw-TZ' : 'en-GB')}
        </time>
        {status && statusVariant && <Badge variant={statusVariant}>{status}</Badge>}
      </div>
    </article>
  );
}
