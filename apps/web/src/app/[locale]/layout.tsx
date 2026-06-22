import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales } from '../../i18n';
import { Header } from '../../components/Header';
import { Footer } from '../../components/Footer';
import '../../styles/globals.css';

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }) {
  const t = await getTranslations({ locale, namespace: 'Site' });
  return {
    title: { default: t('name'), template: `%s | ${t('name')}` },
    description: 'Civil Service Commission – Zanzibar official website',
    metadataBase: new URL(process.env.WEB_BASE_URL ?? 'http://localhost:3000'),
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
    <html lang={locale}>
      <body>
        <NextIntlClientProvider messages={messages}>
          <Header locale={locale} />
          <main>{children}</main>
          <Footer />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}