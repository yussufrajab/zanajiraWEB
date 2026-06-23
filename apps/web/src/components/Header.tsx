'use client';

import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useCallback, useRef, useEffect } from 'react';
import { LanguageSwitcher } from './LanguageSwitcher';

type NavKey =
  | 'news' | 'vacancies' | 'interviews' | 'about'
  | 'organization' | 'services' | 'contact' | 'externalLinks';

interface NavLink {
  href: string;
  key: NavKey;
  icon?: string;
  children?: { href: string; subKey: string }[];
}

const LINKS: NavLink[] = [
  { href: '/news', key: 'news' },
  { href: '/vacancies', key: 'vacancies' },
  { href: '/interviews', key: 'interviews' },
  {
    href: '/about',
    key: 'about',
    children: [
      { href: '/about/introduction', subKey: 'aboutSub_introduction' },
      { href: '/about/mission-vision', subKey: 'aboutSub_missionVision' },
      { href: '/about/core-functions', subKey: 'aboutSub_coreFunctions' },
    ],
  },
  {
    href: '/organization',
    key: 'organization',
    children: [
      { href: '/organization/board', subKey: 'organizationSub_board' },
      { href: '/organization/department', subKey: 'organizationSub_department' },
      { href: '/organization/unit-division', subKey: 'organizationSub_unitDivision' },
      { href: '/organization/chart', subKey: 'organizationSub_chart' },
    ],
  },
  { href: '/services', key: 'services' },
  { href: '/contact', key: 'contact' },
];

function isActive(href: string, pathname: string): boolean {
  if (href === '/') return pathname === '/' || pathname === '';
  return pathname === href || pathname.startsWith(href + '/');
}

function MenuIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function ChevronDown({ open }: { open?: boolean }) {
  return (
    <svg
      width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true"
      className={`nav-chevron ${open ? 'nav-chevron-open' : ''}`}
    >
      <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

export function Header({ locale }: { locale: string }) {
  const t = useTranslations('Nav');
  const pathname = usePathname();
  const currentLocale = useLocale();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedDropdown, setExpandedDropdown] = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleDropdownEnter = useCallback((href: string) => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    setOpenDropdown(href);
  }, []);

  const handleDropdownLeave = useCallback(() => {
    closeTimer.current = setTimeout(() => {
      setOpenDropdown(null);
    }, 200);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
    setExpandedDropdown(null);
  }, [pathname]);

  useEffect(() => {
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  const localePath = (href: string) => `/${currentLocale}${href}`;
  const stripLocale = (p: string) => {
    const parts = p.split('/');
    return '/' + parts.slice(2).join('/');
  };

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link href={`/${locale}`} className="brand" aria-label="Home">
          <img src="/branding/logo.png" alt="" />
        </Link>

        <nav className="desktop-nav" aria-label="Primary navigation">
          <ul>
            {LINKS.map((l) => {
              const href = localePath(l.href);
              const active = isActive(stripLocale(pathname), l.href);
              const expanded = openDropdown === l.href;
              return (
                <li
                  key={l.href}
                  className={`nav-item${l.children ? ' nav-has-dropdown' : ''}${active ? ' nav-active' : ''}`}
                  onMouseEnter={() => l.children && handleDropdownEnter(l.href)}
                  onMouseLeave={handleDropdownLeave}
                >
                  <Link
                    href={href}
                    className={`nav-link${active ? ' nav-link-active' : ''}`}
                    aria-current={active ? 'page' : undefined}
                  >
                    <span>{t(l.key)}</span>
                    {l.children && <ChevronDown open={expanded} />}
                  </Link>
                  {l.children && (
                    <div
                      className={`nav-dropdown${expanded ? ' nav-dropdown-open' : ''}`}
                      onMouseEnter={() => handleDropdownEnter(l.href)}
                      onMouseLeave={handleDropdownLeave}
                    >
                      <div className="nav-dropdown-inner">
                        {l.children.map((child, ci) => (
                          <Link
                            key={child.href}
                            href={localePath(child.href)}
                            className={`nav-dropdown-link${isActive(stripLocale(pathname), child.href) ? ' nav-dropdown-link-active' : ''}`}
                          >
                            <span className="nav-dropdown-dot" />
                            <span>{t(child.subKey as any)}</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="header-actions">
          <Link href={`/${locale}/search`} className="header-search-btn" aria-label={t('search')}>
            <SearchIcon />
          </Link>
          <LanguageSwitcher />
          <button
            className="menu-toggle"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((o) => !o)}
          >
            {mobileOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>

      {/* Overlay for mobile */}
      {mobileOpen && (
        <div className="mobile-overlay" onClick={() => setMobileOpen(false)} />
      )}

      <nav className={`mobile-nav${mobileOpen ? ' open' : ''}`} aria-label="Mobile navigation">
        <ul>
          {LINKS.map((l) => {
            const href = localePath(l.href);
            const active = isActive(stripLocale(pathname), l.href);
            const expanded = expandedDropdown === l.href;
            return (
              <li key={l.href} className={`mobile-nav-li${l.children ? ' mobile-has-children' : ''}${active ? ' mobile-active' : ''}`}>
                <Link
                  href={href}
                  className="mobile-nav-link"
                  onClick={() => { if (!l.children) setMobileOpen(false); }}
                  aria-current={active ? 'page' : undefined}
                >
                  {t(l.key)}
                  {l.children && (
                    <button
                      className={`mobile-expand-btn${expanded ? ' mobile-expand-btn-open' : ''}`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setExpandedDropdown(expanded ? null : l.href);
                      }}
                      aria-label={expanded ? 'Collapse sub-menu' : 'Expand sub-menu'}
                      aria-expanded={expanded}
                    >
                      <ChevronDown open={expanded} />
                    </button>
                  )}
                </Link>
                {l.children && (
                  <ul className={`mobile-subnav${expanded ? ' open' : ''}`}>
                    {l.children.map((child) => (
                      <li key={child.href}>
                        <Link
                          href={localePath(child.href)}
                          className={`mobile-subnav-link${isActive(stripLocale(pathname), child.href) ? ' mobile-subnav-active' : ''}`}
                          onClick={() => setMobileOpen(false)}
                        >
                          {t(child.subKey as any)}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>

        <div className="mobile-nav-footer">
          <Link href={`/${locale}/external-links`} className="mobile-nav-link" onClick={() => setMobileOpen(false)}>
            {t('externalLinks')}
          </Link>
        </div>
      </nav>
    </header>
  );
}
