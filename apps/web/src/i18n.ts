import { getRequestConfig } from 'next-intl/server';

export const locales = ['sw', 'en'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'sw'; // REQ-I18N-03

export default getRequestConfig(async ({ locale }) => {
  return {
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});