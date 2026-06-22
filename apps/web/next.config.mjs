import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  images: { remotePatterns: [{ protocol: 'http', hostname: 'localhost' }] },
  // isomorphic-dompurify pulls in jsdom, whose internal default-stylesheet.css
  // resolves relative to its own location — webpack bundling breaks that path.
  // Keep it as a native Node import so jsdom loads correctly at runtime.
  experimental: {
    serverComponentsExternalPackages: ['isomorphic-dompurify'],
  },
};

export default withNextIntl(nextConfig);