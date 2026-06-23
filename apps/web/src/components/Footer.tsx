import { useTranslations } from 'next-intl';

const EXTERNAL_LINKS: { key: 'zanajiraPortal' | 'nationalAjira' | 'eOffice' | 'hrms' | 'staffMail' | 'salaryClaim'; href: string }[] = [
  { key: 'zanajiraPortal', href: 'https://portal.zanajira.go.tz/home' },
  { key: 'nationalAjira', href: 'https://www.ajira.go.tz/' },
  { key: 'eOffice', href: 'https://eoffice.zanzibar.go.tz/' },
  { key: 'hrms', href: 'https://hrms.zanzibar.go.tz/' },
  { key: 'staffMail', href: 'https://mail.zanzibar.go.tz/' },
  { key: 'salaryClaim', href: 'https://salary.zanzibar.go.tz/' },
];

const GOVERNMENT_LINKS: { key: 'ikulu' | 'egaz' | 'zaeca' | 'zpsc' | 'ipa'; href: string }[] = [
  { key: 'ikulu', href: 'https://ikulu.go.tz/' },
  { key: 'egaz', href: 'https://egaz.go.tz/' },
  { key: 'zaeca', href: 'https://zaeca.go.tz/' },
  { key: 'zpsc', href: 'https://zpsc.go.tz/' },
  { key: 'ipa', href: 'https://ipa.go.tz/' },
];

export function Footer() {
  const t = useTranslations('External');
  const contact = useTranslations('Contact');
  const site = useTranslations('Site');
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-section">
            <div className="footer-brand">
              <img src="/branding/logo.png" alt=""  />
              <strong>{site('name')}</strong>
            </div>
            <p>
              {contact('address')}: P.O. Box 251, Zanzibar
            </p>
            <p>
              {contact('phone')}: +255 24 223 2058
            </p>
            <p>
              {contact('email')}: info@zanajira.go.tz
            </p>
          </div>

          <div className="footer-section">
            <h4>Quick Links</h4>
            <ul>
              {EXTERNAL_LINKS.map((l) => (
                <li key={l.key}>
                  <a href={l.href} rel="noopener noreferrer">{t(l.key)}</a>
                </li>
              ))}
            </ul>
          </div>

          <div className="footer-section">
            <h4>Government Links</h4>
            <ul>
              {GOVERNMENT_LINKS.map((l) => (
                <li key={l.key}>
                  <a href={l.href} rel="noopener noreferrer">{t(l.key)}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          © {year} {site('name')}. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
