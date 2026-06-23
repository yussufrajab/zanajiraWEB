'use client';

export function NewsFilters({ locale }: { locale: string }) {
  const sw = locale === 'sw';
  return (
    <form method="get" className="filters" aria-label={sw ? 'Chuja habari' : 'Filter news'}>
      <label>
        {sw ? 'Neno muhimu' : 'Keyword'}
        <input name="q" placeholder={sw ? 'Tafuta...' : 'Search...'} />
      </label>
      <label>
        {sw ? 'Kutoka' : 'From'}
        <input type="date" name="dateFrom" />
      </label>
      <label>
        {sw ? 'Hadi' : 'To'}
        <input type="date" name="dateTo" />
      </label>
      <button type="submit">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        {sw ? 'Chuja' : 'Filter'}
      </button>
    </form>
  );
}
