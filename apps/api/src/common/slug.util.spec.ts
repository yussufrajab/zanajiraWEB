import { slugify } from './slug.util';

describe('slugify', () => {
  it('lowercases, trims, replaces non-alnum with hyphens, collapses hyphens', () => {
    expect(slugify('Tangazo la Nafasi za Kazi 2026!')).toBe('tangazo-la-nafasi-za-kazi-2026');
  });
  it('strips leading/trailing hyphens', () => {
    expect(slugify('  --Hello World--  ')).toBe('hello-world');
  });
});