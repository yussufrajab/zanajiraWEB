'use client';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';

export function LanguageSwitcher() {
  const locale = useLocale();
  const t = useTranslations('Lang');
  const router = useRouter();
  const pathname = usePathname();

  function toggle() {
    const next = locale === 'sw' ? 'en' : 'sw';
    const rest = pathname.replace(/^\/(sw|en)/, '');
    router.push(`/${next}${rest}`);
  }

  return (
    <button onClick={toggle} aria-label="Switch language" className="lang-switch">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
        <path d="M2 12h20" />
      </svg>
      {t('switch')}
    </button>
  );
}
