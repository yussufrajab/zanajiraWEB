import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales } from '../../i18n';
import { Header } from '../../components/Header';
import { Footer } from '../../components/Footer';
import '../../styles/globals.css';

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }) {
  const t = await getTranslations({ locale, namespace: 'Site' });
  const name = t('name');
  const url = process.env.WEB_BASE_URL ?? 'http://localhost:3000';
  return {
    title: { default: name, template: `%s | ${name}` },
    description: 'Civil Service Commission – Zanzibar official website',
    metadataBase: new URL(url),
    alternates: { canonical: `/${locale}` },
    openGraph: {
      title: name,
      description: 'Civil Service Commission – Zanzibar official website',
      url: `${url}/${locale}`,
      siteName: name,
      locale: locale === 'sw' ? 'sw_TZ' : 'en_GB',
      type: 'website',
    },
  };
}

export default async function LocaleLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  if (!locales.includes(locale as never)) notFound();
  const messages = await getMessages();
  return (
    <NextIntlClientProvider messages={messages}>
      <Header locale={locale} />
      <main>{children}</main>
      <Footer />
    </NextIntlClientProvider>
  );
}