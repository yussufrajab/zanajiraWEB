import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import DOMPurify from 'isomorphic-dompurify';

export const dynamic = 'force-dynamic';

type Props = { params: { locale: string } };

export async function generateMetadata({ params: { locale } }: Props) {
  const title = locale === 'sw' ? 'Utangulizi' : 'Introduction';
  return { title, alternates: { canonical: `/${locale}/about/introduction` } };
}

export default async function IntroductionPage({ params: { locale } }: Props) {
  const t = await getTranslations({ locale, namespace: 'Nav' });
  const isEn = locale === 'en';

  const body = isEn
    ? `<h2>Introduction</h2>
<p>The Civil Service Commission is an independent body formed by the Government under the Zanzibar Constitution of 1984 — specifically Section 117, 2010 and Article 33(1) of the Public Service Act No. 2 of 2011. Its primary role involves "managing Civil Servants with integrity and compliance with the principles of Good Governance" and overseeing recruitment processes.</p>

<h3>Background</h3>
<p>Established in 1986 through the Civil Service Commission Act No. 14 of 1986 and the Zanzibar Constitution of 1984, the Commission has operated as an independent institution since its founding.</p>
<p>Per Section 3(1) of that Act, the Commission originally comprised a Chairman, Vice Chairman, and five Members, all appointed by the President of Zanzibar and the Chairman of the Revolutionary Council.</p>
<p>At that time, it carried out duties defined in the same Act, including oversight of civil servants. Responsibilities included managing servant's disciplines, confirmation of servants, increasing service time, retirement, promotion etc.</p>`
    : `<h2>Utangulizi</h2>
<p>Tume ya Utumishi wa Umma ni chombo huru kilichoundwa na Serikali chini ya Katiba ya Zanzibar ya 1984 — hasa Sehemu ya 117, 2010 na Kifungu cha 33(1) cha Sheria ya Utumishi wa Umma Na. 2 ya 2011. Jukumu lake kuu linahusisha "kusimamia Watumishi wa Umma kwa uadilifu na kufuata kanuni za Utawala Bora" na kusimamia taratibu za uajiri.</p>

<h3>Historia</h3>
<p>Ilianzishwa mwaka 1986 kupitia Sheria ya Tume ya Utumishi wa Umma Na. 14 ya 1986 na Katiba ya Zanzibar ya 1984, Tume imekuwa ikifanya kazi kama taasisi huru tangu kuanzishwa kwake.</p>
<p>Kwa mujibu wa Sehemu ya 3(1) ya Sheria hiyo, Tume iliundwa na Mwenyekiti, Makamu Mwenyekiti, na Wajumbe watano, wote waliteuliwa na Rais wa Zanzibar na Mwenyekiti wa Baraza la Mapinduzi.</p>
<p>Wakati huo, ilitekeleza majukumu yaliyofafanuliwa katika Sheria hiyo, ikiwemo usimamizi wa watumishi wa umma. Majukumu yalijumuisha usimamizi wa nidhamu ya watumishi, uthibitisho wa watumishi, kuongeza muda wa huduma, kustaafu, kupandishwa vyeo n.k.</p>`;

  return (
    <article className="cms-page fade-in">
      <p className="back-link">
        <Link href={`/${locale}/about`}>← {t('about')}</Link>
      </p>
      <h1>{isEn ? 'Introduction' : 'Utangulizi'}</h1>
      <div className="cms-body" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(body) }} />
    </article>
  );
}
