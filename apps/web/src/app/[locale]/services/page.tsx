import { getTranslations } from 'next-intl/server';
import DOMPurify from 'isomorphic-dompurify';

export const dynamic = 'force-dynamic';

type Props = { params: { locale: string } };

export async function generateMetadata({ params: { locale } }: Props) {
  const title = locale === 'sw' ? 'Huduma Zetu' : 'Our Services';
  return { title, alternates: { canonical: `/${locale}/services` } };
}

export default async function ServicesPage({ params: { locale } }: Props) {
  const t = await getTranslations({ locale, namespace: 'Nav' });
  const isEn = locale === 'en';

  const body = isEn
    ? `<p>The Civil Service Commission of Zanzibar provides the following services:</p>
<ol>
  <li>Administer, monitor and evaluate the Central Government recruitment process</li>
  <li>Approving Employment of Special Contracts</li>
  <li>Approving extension of service for employees</li>
  <li>Receiving, listening to, and analyzing all employee complaints and appeals</li>
  <li>Confirmation of service for employees after completing the probation period</li>
  <li>Dismissal or reinstatement of employees suspected to commit disciplinary offences</li>
  <li>Promotion of employees in accordance with the Scheme of Service</li>
  <li>Issuing leave without pay for civil servants</li>
  <li>Termination of service</li>
  <li>Prepare and issue circulars pertaining commission's activities</li>
  <li>Changing of cadre for employees</li>
</ol>`
    : `<p>Tume ya Utumishi wa Umma Zanzibar inatoa huduma zifuatazo:</p>
<ol>
  <li>Kusimamia, kufuatilia na kutathmini mchakato wa uajiri wa Serikali Kuu</li>
  <li>Kuidhinisha Ajira za Mkataba Maalum</li>
  <li>Kuidhinisha kuongeza muda wa huduma kwa watumishi</li>
  <li>Kupokea, kusikiliza, na kuchambua malalamiko yote ya watumishi na rufaa</li>
  <li>Uthibitisho wa huduma kwa watumishi baada ya kukamilisha muda wa majaribio</li>
  <li>Kufukuzwa au kurejeshwa kwa watumishi wanaotuhumiwa kufanya makosa ya kinidhamu</li>
  <li>Kupandishwa vyeo kwa watumishi kwa mujibu wa Mpango wa Utumishi</li>
  <li>Kutoa likizo bila malipo kwa watumishi wa umma</li>
  <li>Kusitisha huduma</li>
  <li>Kuandaa na kutoa mizunguko inayohusu shughuli za Tume</li>
  <li>Mabadiliko ya kada kwa watumishi</li>
</ol>`;

  return (
    <article className="cms-page fade-in">
      <h1>{t('services')}</h1>
      <div className="cms-body" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(body) }} />
    </article>
  );
}
