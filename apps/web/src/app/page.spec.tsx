import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import Home from './[locale]/page';
import swMessages from '../../messages/sw.json';
import enMessages from '../../messages/en.json';

const messagesByLocale = { sw: swMessages, en: enMessages } as const;

function renderWithIntl(ui: React.ReactNode, locale: 'sw' | 'en' = 'sw') {
  return render(
    <NextIntlClientProvider locale={locale} messages={messagesByLocale[locale]}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe('Home page', () => {
  it('renders the site title heading in Swahili', () => {
    renderWithIntl(<Home />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('Tume ya Utumishi');
  });
});