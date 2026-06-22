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
      {t('switch')}
    </button>
  );
}