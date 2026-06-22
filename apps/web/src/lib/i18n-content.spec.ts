import { describe, it, expect } from 'vitest';
import { localizedField } from './i18n-content';

describe('localizedField', () => {
  it('returns English when present', () => {
    expect(localizedField('sw', 'en', 'en')).toEqual({ text: 'en', translated: true });
  });
  it('falls back to Swahili with not-translated flag', () => {
    expect(localizedField('sw', null, 'en')).toEqual({ text: 'sw', translated: false });
  });
  it('returns Swahili for sw locale', () => {
    expect(localizedField('sw', 'en', 'sw')).toEqual({ text: 'sw', translated: true });
  });
});