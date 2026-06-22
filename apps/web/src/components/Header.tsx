import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { LanguageSwitcher } from './LanguageSwitcher';

type NavKey =
  | 'news' | 'vacancies' | 'interviews' | 'about'
  | 'organization' | 'services' | 'contact' | 'externalLinks';

const LINKS: { href: string; key: NavKey }[] = [
  { href: '/news', key: 'news' },
  { href: '/vacancies', key: 'vacancies' },
  { href: '/interviews', key: 'interviews' },
  { href: '/about', key: 'about' },
  { href: '/organization', key: 'organization' },
  { href: '/services', key: 'services' },
  { href: '/contact', key: 'contact' },
  { href: '/external-links', key: 'externalLinks' },
];

export function Header({ locale }: { locale: string }) {
  const t = useTranslations('Nav');
  const site = useTranslations('Site');
  return (
    <header className="site-header">
      <Link href={`/${locale}`} className="brand">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/branding/coat-of-arms.svg" alt="" width={48} height={48} />
        <span>{site('name')}</span>
      </Link>
      <nav aria-label="Primary">
        <ul>
          {LINKS.map((l) => (
            <li key={l.href}>
              <Link href={`/${locale}${l.href}`}>{t(l.key)}</Link>
            </li>
          ))}
        </ul>
      </nav>
      <LanguageSwitcher />
    </header>
  );
}