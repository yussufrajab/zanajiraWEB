import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const webBase = process.env.WEB_BASE_URL ?? 'http://localhost:3000';
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin'] }],
    sitemap: `${webBase}/sitemap.xml`,
  };
}