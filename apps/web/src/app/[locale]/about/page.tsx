import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import DOMPurify from 'isomorphic-dompurify';

export const dynamic = 'force-dynamic';

type Props = { params: { locale: string } };

export async function generateMetadata({ params: { locale } }: Props) {
  return {
    title: locale === 'sw' ? 'Kuhusu Sisi' : 'About Us',
    alternates: { canonical: `/${locale}/about` },
  };
}

export default async function AboutPage({ params: { locale } }: Props) {
  const t = await getTranslations({ locale, namespace: 'Nav' });
  const isEn = locale === 'en';

  const introBody = isEn
    ? '<p>The Civil Service Commission is an independent body formed by the Government under the Zanzibar Constitution of 1984 &mdash; specifically Section 117, 2010 and Article 33(1) of the Public Service Act No. 2 of 2011. Its primary role involves managing Civil Servants with integrity and compliance with the principles of Good Governance and overseeing recruitment processes.</p><h3>Background</h3><p>Established in 1986 through the Civil Service Commission Act No. 14 of 1986 and the Zanzibar Constitution of 1984, the Commission has operated as an independent institution since its founding.</p><p>Per Section 3(1) of that Act, the Commission originally comprised a Chairman, Vice Chairman, and five Members, all appointed by the President of Zanzibar and the Chairman of the Revolutionary Council. At that time, it carried out duties defined in the same Act, including oversight of civil servants. Responsibilities included managing servant&rsquo;s disciplines, confirmation of servants, increasing service time, retirement, promotion etc.</p>'
    : '<p>Tume ya Utumishi wa Umma ni chombo huru kilichoundwa na Serikali chini ya Katiba ya Zanzibar ya 1984 &mdash; hasa Sehemu ya 117, 2010 na Kifungu cha 33(1) cha Sheria ya Utumishi wa Umma Na. 2 ya 2011. Jukumu lake kuu linahusisha usimamizi wa Watumishi wa Umma kwa uadilifu na kufuata kanuni za Utawala Bora na kusimamia taratibu za uajiri.</p><h3>Historia</h3><p>Ilianzishwa mwaka 1986 kupitia Sheria ya Tume ya Utumishi wa Umma Na. 14 ya 1986 na Katiba ya Zanzibar ya 1984, Tume imekuwa ikifanya kazi kama taasisi huru tangu kuanzishwa kwake.</p><p>Kwa mujibu wa Sehemu ya 3(1) ya Sheria hiyo, Tume iliundwa na Mwenyekiti, Makamu Mwenyekiti, na Wajumbe watano, wote waliteuliwa na Rais wa Zanzibar na Mwenyekiti wa Baraza la Mapinduzi. Wakati huo, ilitekeleza majukumu yaliyofafanuliwa katika Sheria hiyo, ikiwemo usimamizi wa watumishi wa umma. Majukumu yalijumuisha usimamizi wa nidhamu ya watumishi, uthibitisho wa watumishi, kuongeza muda wa huduma, kustaafu, kupandishwa vyeo n.k.</p>';

  const missionBody = isEn
    ? '<blockquote><p><strong>Mission:</strong> Addressing the rights of employees and provide opportunities to promote government performance.</p></blockquote><blockquote><p><strong>Vision:</strong> The existence of dedicated service that meets the values and qualities of the civil servants.</p></blockquote>'
    : '<blockquote><p><strong>Dhamira:</strong> Kushughulikia haki za watumishi na kutoa fursa za kuendeleza utendaji wa serikali.</p></blockquote><blockquote><p><strong>Maono:</strong> Kuwepo kwa huduma ya kujitolea inayokidhi maadili na sifa za watumishi wa umma.</p></blockquote>';

  const functionsBody = isEn
    ? '<h3>Core Functions</h3><ol><li>Major roles of the employee are carried out in accordance with the scheme of service. The Public Service Commission is responsible for recruiting people to hold public office based on merit and qualifications.</li><li>To terminate their employment</li><li>Recommend to the Government the salaries and benefits of their employees</li><li>To recommend to the commission the approval of scheme of service of the institution</li><li>To approve the promotion</li><li>To ensure the public basic principle, value and code of conduct are observed</li><li>To approve extended service up to two years and to recommend the chief secretary any extended service exceeding two years</li></ol><h3>Core Values</h3><ul><li><strong>Transparency:</strong> Existence of transparency in job vacancies advertised and in the recruitment process so citizens receive honest employment.</li><li><strong>Integrity:</strong> Ensuring advertised jobs are offered without bias to citizens.</li><li><strong>Corruption free:</strong> Ensuring commission staff remain free from corruption so citizens can secure employment.</li><li><strong>Equality:</strong> Employment equity for all, including men and women.</li></ul>'
    : '<h3>Kazi za Msingi</h3><ol><li>Majukumu makuu ya mtumishi yanatekelezwa kwa mujibu wa mpango wa utumishi. Tume ya Utumishi wa Umma inawajibika kuajiri watu wa kushikilia nyadhifa za umma kwa kuzingatia ustahili na sifa.</li><li>Kusitisha ajira zao</li><li>Kupendekeza kwa Serikali mishahara na marupurupu ya watumishi wao</li><li>Kupendekeza kwa tume uidhinishaji wa mpango wa utumishi wa taasisi</li><li>Kuidhinisha kupandishwa vyeo</li><li>Kuhakikisha kanuni za msingi za umma, maadili na kanuni za maadili zinafuatwa</li><li>Kuidhinisha muda wa huduma ulioongezwa hadi miaka miwili na kupendekeza kwa katibu mkuu muda wowote wa huduma unaozidi miaka miwili</li></ol><h3>Maadili ya Msingi</h3><ul><li><strong>Uwazi:</strong> Kuwepo kwa uwazi katika nafasi za kazi zinazotangazwa na katika mchakato wa kuajiri ili wananchi wapate ajira ya haki.</li><li><strong>Uadilifu:</strong> Kuhakikisha ajira zinazotangazwa zinatolewa bila upendeleo kwa wananchi.</li><li><strong>Kutokuwa na rushwa:</strong> Kuhakikisha wafanyakazi wa tume wanabaki huru kutokana na rushwa ili wananchi waweze kupata ajira.</li><li><strong>Usawa:</strong> Usawa wa ajira kwa wote, ikiwemo wanaume na wanawake.</li></ul>';

  return (
    <article className="cms-page fade-in">
      <h1>{t('about')}</h1>

      <h2 className="section-title">{isEn ? 'Introduction' : 'Utangulizi'}</h2>
      <div className="cms-body" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(introBody) }} />
      <p className="mb-6">
        <Link href={`/${locale}/about/introduction`} className="btn btn-outline btn-sm">
          {isEn ? 'Read more →' : 'Soma zaidi →'}
        </Link>
      </p>

      <h2 className="section-title">{isEn ? 'Mission & Vision' : 'Dhamira na Maono'}</h2>
      <div className="cms-body" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(missionBody) }} />
      <p className="mb-6">
        <Link href={`/${locale}/about/mission-vision`} className="btn btn-outline btn-sm">
          {isEn ? 'Read more →' : 'Soma zaidi →'}
        </Link>
      </p>

      <h2 className="section-title">{isEn ? 'Core Functions' : 'Kazi za Msingi'}</h2>
      <div className="cms-body" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(functionsBody) }} />
      <p>
        <Link href={`/${locale}/about/core-functions`} className="btn btn-outline btn-sm">
          {isEn ? 'Read more →' : 'Soma zaidi →'}
        </Link>
      </p>
    </article>
  );
}
