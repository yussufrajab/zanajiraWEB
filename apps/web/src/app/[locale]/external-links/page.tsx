import { useTranslations } from 'next-intl';
import { EmptyState } from '../../../components/EmptyState';

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

function LinkIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

function ExternalLinkCard({ href, title }: { href: string; title: string }) {
  return (
    <a href={href} rel="noopener noreferrer" className="card external-link-card">
      <div className="card-body">
        <div className="external-link-title">
          <LinkIcon />
          <span>{title}</span>
        </div>
        <span className="external-link-url">{href.replace(/^https?:\/\//, '')}</span>
      </div>
    </a>
  );
}

export default function ExternalLinks({ params: { locale } }: { params: { locale: string } }) {
  const t = useTranslations('External');
  const sw = locale === 'sw';
  return (
    <>
      <div className="page-header">
        <h1>{sw ? 'Viungo vya Nje' : 'External Links'}</h1>
        <p>{sw ? 'Rasilimali na mifumo inayohusiana na serikali.' : 'Related government systems and partner institutions.'}</p>
      </div>

      {SYSTEMS.length === 0 && PARTNERS.length === 0 ? (
        <EmptyState title={sw ? 'Hakuna viungo' : 'No links available'} />
      ) : (
        <>
          <section className="mb-6">
            <h2>{sw ? 'Mifumo inayohusiana' : 'Related systems'}</h2>
            <div className="external-links-grid">
              {SYSTEMS.map((s) => (
                <ExternalLinkCard key={s.key} href={s.href} title={t(s.key)} />
              ))}
            </div>
          </section>
          <section className="mb-6">
            <h2>{sw ? 'Taasisi washirika' : 'Partner institutions'}</h2>
            <div className="external-links-grid">
              {PARTNERS.map((p) => (
                <ExternalLinkCard key={p.key} href={p.href} title={t(p.key)} />
              ))}
            </div>
          </section>
        </>
      )}
    </>
  );
}
