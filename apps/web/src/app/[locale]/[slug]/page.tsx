import { CmsPage, cmsMetadata } from '../../../components/CmsPage';

export const dynamic = 'force-dynamic';

type Params = { locale: string; slug: string };

export async function generateMetadata({ params: { locale, slug } }: { params: Params }) {
  return cmsMetadata(locale, slug);
}

export default async function StaticPage({ params: { locale, slug } }: { params: Params }) {
  return <CmsPage locale={locale} slug={slug} />;
}