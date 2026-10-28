/**
 * SEO-05 / T49: genel rotalara özgü JSON-LD. Yalnız sayfada gerçekten bulunan bilgi yazılır:
 * puan (aggregateRating), fiyat teklifi veya uzman onayı gibi alanlar üretilmez.
 */
import { PUBLIC_GLOSSARY_TERMS } from './public-glossary';

interface Crumb {
  name: string;
  path: string;
}

const HOME: Crumb = { name: 'Ana Sayfa', path: '/' };
const CALCULATORS: Crumb = { name: 'Ücretsiz Hesaplayıcılar', path: '/hesaplayicilar' };

const BREADCRUMBS: Readonly<Record<string, readonly Crumb[]>> = {
  '/bim-sozlugu': [HOME, { name: 'BIM ve Mevzuat Sözlüğü', path: '/bim-sozlugu' }],
  '/hesaplayicilar': [HOME, CALCULATORS],
  '/hesaplayicilar/kik-asiri-dusuk-teklif': [HOME, CALCULATORS, { name: 'Aşırı Düşük Teklif Sınır Değeri', path: '/hesaplayicilar/kik-asiri-dusuk-teklif' }],
  '/hesaplayicilar/fiyat-farki-4735': [HOME, CALCULATORS, { name: '4735 Fiyat Farkı', path: '/hesaplayicilar/fiyat-farki-4735' }],
  '/hesaplayicilar/yambis-muteahhitlik-grubu': [HOME, CALCULATORS, { name: 'Müteahhitlik Yetki Belgesi Grubu (YAMBİS)', path: '/hesaplayicilar/yambis-muteahhitlik-grubu' }],
  '/hesaplayicilar/kat-karsiligi-ve-kentsel-donusum': [HOME, CALCULATORS, { name: 'Kat Karşılığı Paylaşım ve KDV', path: '/hesaplayicilar/kat-karsiligi-ve-kentsel-donusum' }],
};

const CALCULATOR_ROUTES = new Set([
  '/hesaplayicilar/kik-asiri-dusuk-teklif',
  '/hesaplayicilar/fiyat-farki-4735',
  '/hesaplayicilar/yambis-muteahhitlik-grubu',
  '/hesaplayicilar/kat-karsiligi-ve-kentsel-donusum',
]);

const absolute = (origin: string, path: string) => `${origin}${path}`;

function breadcrumbList(origin: string, crumbs: readonly Crumb[]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: absolute(origin, crumb.path),
    })),
  };
}

function definedTermSet(origin: string) {
  const setId = `${absolute(origin, '/bim-sozlugu')}#terimler`;
  return {
    '@type': 'DefinedTermSet',
    '@id': setId,
    name: 'BIM ve Mevzuat Sözlüğü',
    inLanguage: 'tr',
    url: absolute(origin, '/bim-sozlugu'),
    hasDefinedTerm: PUBLIC_GLOSSARY_TERMS.map(term => ({
      '@type': 'DefinedTerm',
      name: term.name,
      description: term.description,
      inDefinedTermSet: setId,
    })),
  };
}

function calculatorApplication(origin: string, path: string, name: string, description: string) {
  return {
    '@type': 'WebApplication',
    name,
    description,
    url: absolute(origin, path),
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web tarayıcısı',
    inLanguage: 'tr',
    isAccessibleForFree: true,
    publisher: { '@id': `${origin}/#organization` },
  };
}

export interface RouteJsonLdInput {
  pathname: string;
  origin: string;
  title: string;
  description: string;
}

/** Rotaya özgü JSON-LD grafiği; uygun şema yoksa `null`. */
export function routeJsonLd({ pathname, origin, title, description }: RouteJsonLdInput): Record<string, unknown> | null {
  const crumbs = BREADCRUMBS[pathname];
  if (!crumbs) return null;
  const graph: Record<string, unknown>[] = [breadcrumbList(origin, crumbs)];
  if (pathname === '/bim-sozlugu') graph.push(definedTermSet(origin));
  if (CALCULATOR_ROUTES.has(pathname)) graph.push(calculatorApplication(origin, pathname, crumbs.at(-1)!.name, description || title));
  return { '@context': 'https://schema.org', '@graph': graph };
}

/** `</script>` kapanışını ve HTML'e duyarlı karakterleri kaçışlayarak `<script type="application/ld+json">` bloğu üretir. */
export function renderJsonLdScript(id: string, data: Record<string, unknown>): string {
  const json = JSON.stringify(data).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
  return `<script id="${id}" type="application/ld+json">${json}</script>`;
}
