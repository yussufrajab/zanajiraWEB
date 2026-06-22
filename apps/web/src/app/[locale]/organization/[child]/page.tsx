import { CmsPage, cmsMetadata } from '../../../../components/CmsPage';

export const dynamic = 'force-dynamic';

type Params = { locale: string; child: string };

export async function generateMetadata({ params: { locale, child } }: { params: Params }) {
  return cmsMetadata(locale, `organization/${child}`);
}

export default async function OrganizationChild({ params: { locale, child } }: { params: Params }) {
  return <CmsPage locale={locale} slug={`organization/${child}`} />;
}