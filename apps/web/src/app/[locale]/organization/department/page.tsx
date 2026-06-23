import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import DOMPurify from 'isomorphic-dompurify';

export const dynamic = 'force-dynamic';

type Props = { params: { locale: string } };

export async function generateMetadata({ params: { locale } }: Props) {
  const title = locale === 'sw' ? 'Idara' : 'Departments';
  return { title, alternates: { canonical: `/${locale}/organization/department` } };
}

export default async function DepartmentPage({ params: { locale } }: Props) {
  const t = await getTranslations({ locale, namespace: 'Nav' });
  const isEn = locale === 'en';

  const departments = [
    {
      title: isEn ? 'Department of Human Resources Administration and Planning' : 'Idara ya Utawala wa Rasilimali Watu na Mipango',
      responsibilities: isEn
        ? [
            'Providing Administration and Operational Services of the Commission',
            'Addressing Human Resources issues such as Training, Performance contract, Service Delivery Contracts, Salaries and other Personnel entitlements',
            'Coordinating the preparation, implementation, monitoring and evaluation of the Commission\'s work plan',
            'Provide guidance and expertise during planning, implementation indicators (Key Performance Indicators) as well as information on the implementation of the Commission\'s functions',
            'Prepare and administer a system for the collection of information and generation the Commission\'s implementation reports',
            'To collect information, analyze, and identify the various issues to be included in the Commission\'s statistics',
            'Develop a monitoring system for such information and provide expert advice in its implementation',
            'Managing and assessing the implementation of various projects, programs and development programs',
            'Prepare quarterly, half and annual implementation reports and submits them to the Commission Secretary',
            'Undertake other related duties as assigned by the Commission\'s Secretary from time to time',
          ]
        : [
            'Kutoa Huduma za Utawala na Uendeshaji wa Tume',
            'Kushughulikia masuala ya Rasilimali Watu kama vile Mafunzo, Mkataba wa Utendaji, Mkataba wa Utoaji Huduma, Mishahara na haki nyingine za watumishi',
            'Kuratibu maandalizi, utekelezaji, ufuatiliaji na tathmini ya mpango kazi wa Tume',
            'Kutoa mwongozo na utaalamu wakati wa kupanga, viashiria vya utekelezaji (Viashiria Muhimu vya Utendaji) pamoja na taarifa juu ya utekelezaji wa majukumu ya Tume',
            'Kuandaa na kuendesha mfumo wa ukusanyaji wa taarifa na kuzalisha ripoti za utekelezaji wa Tume',
            'Kukusanya taarifa, kuchambua, na kutambua masuala mbalimbali yatakayojumuishwa katika takwimu za Tume',
            'Kuendeleza mfumo wa ufuatiliaji wa taarifa hizo na kutoa ushauri wa kitaalamu katika utekelezaji wake',
            'Kusimamia na kutathmini utekelezaji wa miradi na programu mbalimbali za maendeleo',
            'Kuandaa ripoti za utekelezaji za robo mwaka, nusu mwaka na mwaka na kuziwasilisha kwa Katibu wa Tume',
            'Kutekeleza majukumu mengine kama yatakavyoainishwa na Katibu wa Tume mara kwa mara',
          ],
    },
    {
      title: isEn ? 'Department of Human Resource Management' : 'Idara ya Usimamizi wa Rasilimali Watu',
      responsibilities: isEn
        ? [
            'Coordinating, advising and recommending to the Commission extension of service for Employees who reach the compulsory retirement age',
            'Receiving, listening, and analyzing all employee complaints and appeals submitted to the Commission',
            'Prepare and recommend to the Commission the confirmation of service for the employees after completing the probation period',
            'Prepare and recommend the dismissal or reinstatement of employees suspected to commit disciplinary offences',
            'Coordinating the implementation of the Promotion Guidelines in accordance with the Scheme of Service',
            'Reviewing and recommending to the Public Service Commission the Scheme of Services of the Ministries for approval',
            'Consider and recommend to the Commission leave without pay for civil servants',
            'Recommend to the Commission termination of service upon employees attaining the age of voluntary retirement, compulsory retirement and under Medical Board Recommendation',
            'To prepare and issue circulars pertaining commission\'s activities',
            'Coordinating and recommending changing of cadre for employees',
            'To perform other activities/functions consistent with Department or as assigned by the Commission\'s Secretary',
            'Prepare quarterly, half and annual implementation reports and submit them to the Commission Secretary',
          ]
        : [
            'Kuratibu, kushauri na kupendekeza kwa Tume kuongeza muda wa huduma kwa Watumishi wanaofikia umri wa kustaafu kwa lazima',
            'Kupokea, kusikiliza, na kuchambua malalamiko yote ya watumishi na rufaa zinazowasilishwa kwa Tume',
            'Kuandaa na kupendekeza kwa Tume uthibitisho wa huduma kwa watumishi baada ya kukamilisha muda wa majaribio',
            'Kuandaa na kupendekeza kufukuzwa au kurejeshwa kwa watumishi wanaotuhumiwa kufanya makosa ya kinidhamu',
            'Kuratibu utekelezaji wa Mwongozo wa Kupandishwa Vyeo kwa mujibu wa Mpango wa Utumishi',
            'Kupitia na kupendekeza kwa Tume ya Utumishi wa Umma Mpango wa Utumishi wa Wizara kwa idhini',
            'Kuzingatia na kupendekeza kwa Tume likizo bila malipo kwa watumishi wa umma',
            'Kupendekeza kwa Tume kusitisha huduma kwa watumishi wanaofikia umri wa kustaafu kwa hiari, kustaafu kwa lazima na kwa pendekezo la Bodi ya Tiba',
            'Kuandaa na kutoa mizunguko inayohusu shughuli za Tume',
            'Kuratibu na kupendekeza mabadiliko ya kada kwa watumishi',
            'Kutekeleza shughuli/kazi nyingine zinazolingana na Idara au kama atakavyoagizwa na Katibu wa Tume',
            'Kuandaa ripoti za utekelezaji za robo mwaka, nusu mwaka na mwaka na kuziwasilisha kwa Katibu wa Tume',
          ],
    },
    {
      title: isEn ? 'Department of Recruitment and Quality Control' : 'Idara ya Uajiri na Udhibiti wa Ubora',
      responsibilities: isEn
        ? [
            'Receiving recruitment permits from the Head Office of The Public Service and advertising to the public',
            'To conduct and supervising the recruitment of new employees in Central Government',
            'To receive employment applications for short listing them',
            'Administer, monitor and evaluate the Central Government recruitment process',
            'Preparation and management of written and Oral interview to shortlisted applicants who have reached the appropriate criteria',
            'Prepare and issue employment permits to the Ministries as approved by the Commission',
            'Approving the Employment of Special Contracts after obtaining the permit from the Secretary of the Revolutionary Council and the Chief Secretary',
            'Prepare quarterly, half and yearly implementation\'s reports and submit them to the Commission Secretary',
            'To perform other activities/functions consistent with Department or as assigned by the Commission\'s Secretary',
          ]
        : [
            'Kupokea vibali vya uajiri kutoka Ofisi Kuu ya Utumishi wa Umma na kutangaza kwa umma',
            'Kuendesha na kusimamia uajiri wa watumishi wapya katika Serikali Kuu',
            'Kupokea maombi ya ajira kwa ajili ya kuteua wanaostahili',
            'Kusimamia, kufuatilia na kutathmini mchakato wa uajiri wa Serikali Kuu',
            'Kuandaa na kusimamia mahojiano ya maandishi na ya mdomo kwa waombaji walioteuliwa wanaostahili',
            'Kuandaa na kutoa vibali vya ajira kwa Wizara kama ilivyoidhinishwa na Tume',
            'Kuidhinisha Ajira za Mkataba Maalum baada ya kupata kibali kutoka kwa Katibu wa Baraza la Mapinduzi na Katibu Mkuu',
            'Kuandaa ripoti za utekelezaji za robo mwaka, nusu mwaka na mwaka na kuziwasilisha kwa Katibu wa Tume',
            'Kutekeleza shughuli/kazi nyingine zinazolingana na Idara au kama atakavyoagizwa na Katibu wa Tume',
          ],
    },
  ];

  return (
    <article className="cms-page fade-in">
      <p className="back-link">
        <Link href={`/${locale}/organization`}>← {t('organization')}</Link>
      </p>
      <h1>{isEn ? 'Departments' : 'Idara'}</h1>
      <p style={{ marginBottom: 'var(--space-6)' }}>
        {isEn
          ? 'The Civil Service Commission comprises three main departments, each with specific responsibilities:'
          : 'Tume ya Utumishi wa Umma ina idara tatu kuu, kila moja ikiwa na majukumu maalum:'}
      </p>

      {departments.map((dept, i) => (
        <div key={i} style={{ marginBottom: 'var(--space-8)' }}>
          <h2 className="section-title">{dept.title}</h2>
          <h4 style={{ marginBottom: 'var(--space-3)', color: 'var(--color-text-muted)' }}>
            {isEn ? 'Responsibilities' : 'Majukumu'}
          </h4>
          <ol style={{ paddingLeft: 'var(--space-6)' }}>
            {dept.responsibilities.map((r, j) => (
              <li key={j} style={{ marginBottom: 'var(--space-2)' }}>{r}</li>
            ))}
          </ol>
        </div>
      ))}
    </article>
  );
}
