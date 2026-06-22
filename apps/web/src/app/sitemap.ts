import type { MetadataRoute } from 'next';
import { locales } from '../i18n';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const webBase = process.env.WEB_BASE_URL ?? 'http://localhost:3000';
  const staticSlugs = ['about', 'organization', 'services', 'contact'];
  const lastModified = new Date(2026, 5, 21); // fixed seed date; no Date.now() in build

  const entries: MetadataRoute.Sitemap = [];
  for (const slug of staticSlugs) {
    for (const locale of locales) {
      entries.push({ url: `${webBase}/${locale}/${slug}`, lastModified, changeFrequency: 'monthly', priority: 0.7 });
    }
  }
  // dynamic listings
  for (const section of ['news', 'vacancies', 'interviews']) {
    for (const locale of locales) {
      entries.push({ url: `${webBase}/${locale}/${section}`, lastModified, changeFrequency: 'daily', priority: 0.8 });
    }
  }
  return entries;
}