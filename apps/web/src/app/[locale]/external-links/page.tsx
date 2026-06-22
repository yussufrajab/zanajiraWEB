import { useTranslations } from 'next-intl';

type ExtKey =
  | 'zanajiraPortal' | 'nationalAjira' | 'eOffice' | 'hrms'
  | 'staffMail' | 'salaryClaim' | 'ikulu' | 'egaz' | 'zaeca' | 'zpsc' | 'ipa';

const SYSTEMS: { key: ExtKey; href: string }[] = [
  { key: 'zanajiraPortal', href: 'https://portal.zanajira.go.tz/home' },
  { key: 'nationalAjira', href: 'https://www.ajira.go.tz/' },
  { key: 'eOffice', href: 'https://eoffice.zanzibar.go.tz/' },
  { key: 'hrms', href: 'https://hrms.zanzibar.go.tz/' },
  { key: 'staffMail', href: 'https://mail.zanzibar.go.tz/' },
  { key: 'salaryClaim', href: 'https://salary.zanzibar.go.tz/' },
];

const PARTNERS: { key: ExtKey; href: string }[] = [
  { key: 'ikulu', href: 'https://ikulu.go.tz/' },
  { key: 'egaz', href: 'https://egaz.go.tz/' },
  { key: 'zaeca', href: 'https://zaeca.go.tz/' },
  { key: 'zpsc', href: 'https://zpsc.go.tz/' },
  { key: 'ipa', href: 'https://ipa.go.tz/' },
];

export default function ExternalLinks({ params: { locale } }: { params: { locale: string } }) {
  const t = useTranslations('External');
  const sw = locale === 'sw';
  return (
    <>
      <h1>{sw ? 'Viungo vya Nje' : 'External Links'}</h1>
      <section>
        <h2>{sw ? 'Mifumo inayohusiana' : 'Related systems'}</h2>
        <ul>
          {SYSTEMS.map((s) => (
            <li key={s.key}>
              <a href={s.href} rel="noopener noreferrer">{t(s.key)}</a>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2>{sw ? 'Taasisi washirika' : 'Partner institutions'}</h2>
        <ul>
          {PARTNERS.map((p) => (
            <li key={p.key}>
              <a href={p.href} rel="noopener noreferrer">{t(p.key)}</a>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}