export function localizedField(sw: string | null, en: string | null | undefined, locale: 'sw' | 'en') {
  if (locale === 'en' && en) return { text: en, translated: true as const };
  if (locale === 'en' && !en && sw) return { text: sw, translated: false as const };
  return { text: sw ?? '', translated: true as const };
}