export function NewsFilters({ locale }: { locale: string }) {
  const sw = locale === 'sw';
  return (
    <form method="get" className="filters" aria-label={sw ? 'Chuja habari' : 'Filter news'}>
      <label>
        {sw ? 'Neno muhimu' : 'Keyword'}
        <input name="q" />
      </label>
      <label>
        {sw ? 'Kutoka' : 'From'}
        <input type="date" name="dateFrom" />
      </label>
      <label>
        {sw ? 'Hadi' : 'To'}
        <input type="date" name="dateTo" />
      </label>
      <button type="submit">{sw ? 'Chuja' : 'Filter'}</button>
    </form>
  );
}