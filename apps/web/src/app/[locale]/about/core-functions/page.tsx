import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import DOMPurify from 'isomorphic-dompurify';

export const dynamic = 'force-dynamic';

type Props = { params: { locale: string } };

export async function generateMetadata({ params: { locale } }: Props) {
  const title = locale === 'sw' ? 'Kazi za Msingi' : 'Core Functions';
  return { title, alternates: { canonical: `/${locale}/about/core-functions` } };
}

export default async function CoreFunctionsPage({ params: { locale } }: Props) {
  const t = await getTranslations({ locale, namespace: 'Nav' });
  const isEn = locale === 'en';

  const body = isEn
    ? `<h2>Core Functions</h2>
<ol>
  <li>Major roles of the employee are carried out in accordance with the scheme of service. The Public Service Commission is responsible for recruiting people to hold public office "based on merit and qualifications."</li>
  <li>To terminate their employment</li>
  <li>Recommend to the Government the salaries and benefits of their employees</li>
  <li>To recommend to the commission the approval of scheme of service of the institution</li>
  <li>To approve the promotion</li>
  <li>To ensure the public basic principle, value and code of conduct are observed</li>
  <li>To approve extended service up to two years and to recommend the chief secretary any extended service exceeding two years</li>
</ol>

<h2>Core Values</h2>
<div class="grid-2" style="margin-bottom: var(--space-6);">
  <div class="card"><div class="card-body">
    <h3 class="card-title">Transparency</h3>
    <p>Existence of transparency in job vacancies advertised and in the recruitment process so citizens receive honest employment.</p>
  </div></div>
  <div class="card"><div class="card-body">
    <h3 class="card-title">Integrity</h3>
    <p>Ensuring advertised jobs are offered without bias to citizens.</p>
  </div></div>
  <div class="card"><div class="card-body">
    <h3 class="card-title">Corruption Free</h3>
    <p>Ensuring commission staff remain free from corruption so citizens can secure employment.</p>
  </div></div>
  <div class="card"><div class="card-body">
    <h3 class="card-title">Equality</h3>
    <p>Employment equity for all, including men and women.</p>
  </div></div>
</div>`
    : `<h2>Kazi za Msingi</h2>
<ol>
  <li>Majukumu makuu ya mtumishi yanatekelezwa kwa mujibu wa mpango wa utumishi. Tume ya Utumishi wa Umma inawajibika kuajiri watu wa kushikilia nyadhifa za umma "kwa kuzingatia ustahili na sifa."</li>
  <li>Kusitisha ajira zao</li>
  <li>Kupendekeza kwa Serikali mishahara na marupurupu ya watumishi wao</li>
  <li>Kupendekeza kwa tume uidhinishaji wa mpango wa utumishi wa taasisi</li>
  <li>Kuidhinisha kupandishwa vyeo</li>
  <li>Kuhakikisha kanuni za msingi za umma, maadili na kanuni za maadili zinafuatwa</li>
  <li>Kuidhinisha muda wa huduma ulioongezwa hadi miaka miwili na kupendekeza kwa katibu mkuu muda wowote wa huduma unaozidi miaka miwili</li>
</ol>

<h2>Maadili ya Msingi</h2>
<div class="grid-2" style="margin-bottom: var(--space-6);">
  <div class="card"><div class="card-body">
    <h3 class="card-title">Uwazi</h3>
    <p>Kuwepo kwa uwazi katika nafasi za kazi zinazotangazwa na katika mchakato wa kuajiri ili wananchi wapate ajira ya haki.</p>
  </div></div>
  <div class="card"><div class="card-body">
    <h3 class="card-title">Uadilifu</h3>
    <p>Kuhakikisha ajira zinazotangazwa zinatolewa bila upendeleo kwa wananchi.</p>
  </div></div>
  <div class="card"><div class="card-body">
    <h3 class="card-title">Kutokuwa na Rushwa</h3>
    <p>Kuhakikisha wafanyakazi wa tume wanabaki huru kutokana na rushwa ili wananchi waweze kupata ajira.</p>
  </div></div>
  <div class="card"><div class="card-body">
    <h3 class="card-title">Usawa</h3>
    <p>Usawa wa ajira kwa wote, ikiwemo wanaume na wanawake.</p>
  </div></div>
</div>`;

  return (
    <article className="cms-page fade-in">
      <p className="back-link">
        <Link href={`/${locale}/about`}>← {t('about')}</Link>
      </p>
      <h1>{isEn ? 'Core Functions' : 'Kazi za Msingi'}</h1>
      <div className="cms-body" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(body) }} />
    </article>
  );
}
