import { useTranslations } from 'next-intl';

const LINKS: { key: 'zanajiraPortal' | 'nationalAjira' | 'eOffice' | 'hrms' | 'staffMail' | 'salaryClaim'; href: string }[] = [
  { key: 'zanajiraPortal', href: 'https://portal.zanajira.go.tz/home' },
  { key: 'nationalAjira', href: 'https://www.ajira.go.tz/' },
  { key: 'eOffice', href: 'https://eoffice.zanzibar.go.tz/' },
  { key: 'hrms', href: 'https://hrms.zanzibar.go.tz/' },
  { key: 'staffMail', href: 'https://mail.zanzibar.go.tz/' },
  { key: 'salaryClaim', href: 'https://salary.zanzibar.go.tz/' },
];

export function Footer() {
  const t = useTranslations('External');
  return (
    <footer className="site-footer">
      <ul>
        {LINKS.map((l) => (
          <li key={l.key}>
            <a href={l.href} rel="noopener noreferrer">{t(l.key)}</a>
          </li>
        ))}
      </ul>
    </footer>
  );
}