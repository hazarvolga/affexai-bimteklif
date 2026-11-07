/**
 * SEO-05 / T49 / GEO-04–06: genel rotalara özgü JSON-LD. Yalnız sayfada gerçekten bulunan bilgi
 * yazılır: puan (aggregateRating), fiyat teklifi veya uzman onayı gibi alanlar üretilmez.
 */
import { PUBLIC_GLOSSARY_TERMS } from './public-glossary';
import { ACADEMY_TOPICS, findAcademyTopic } from '../../academy/library/topics';
import { findAcademyGuide } from '../../academy/library/guides';

interface Crumb {
  name: string;
  path: string;
}

const HOME: Crumb = { name: 'Ana Sayfa', path: '/' };
const CALCULATORS: Crumb = { name: 'Ücretsiz Hesaplayıcılar', path: '/hesaplayicilar' };
const ACADEMY_CRUMB: Crumb = { name: 'Akademi', path: '/academy' };

const BREADCRUMBS: Readonly<Record<string, readonly Crumb[]>> = {
  '/bim-sozlugu': [HOME, { name: 'BIM ve Mevzuat Sözlüğü', path: '/bim-sozlugu' }],
  '/smartcheck': [HOME, { name: 'SmartCheck — BIM Metraj Kalite Kontrolü', path: '/smartcheck' }],
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

/** GEO-04: sitewide Organization schema; `@id` referansı diğer şemalar tarafından kullanılır. */
function organizationSchema(origin: string) {
  return {
    '@type': 'Organization',
    '@id': `${origin}/#organization`,
    name: 'BIMMetraj',
    alternateName: ['BIM Metraj', 'BIMPlan Academy'],
    url: origin,
    description:
      'Türkiye inşaat, mimarlık ve teknik ofis ekipleri için IFC tabanlı 5D BIM metraj, keşif ve maliyet hesaplama SaaS platformu.',
    foundingDate: '2026',
    areaServed: 'TR',
    inLanguage: 'tr',
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'info@bimmetraj.com',
      contactType: 'customer service',
      availableLanguage: 'Turkish',
    },
  };
}

/** GEO-04: sitewide WebSite schema; SearchAction sözlük aramasına yönlendirir. */
function webSiteSchema(origin: string) {
  return {
    '@type': 'WebSite',
    '@id': `${origin}/#website`,
    url: origin,
    name: 'BIMMetraj',
    publisher: { '@id': `${origin}/#organization` },
    inLanguage: 'tr',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${origin}/bim-sozlugu?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

/** GEO-05: SoftwareApplication schema for /smartcheck. */
function smartCheckApplication(origin: string) {
  return {
    '@type': 'SoftwareApplication',
    name: 'BIMMetraj SmartCheck',
    description:
      'IFC tabanlı BIM metraj kalite kontrolü: 3×3 kural motoru (metraj toleransı, beton paspayı, STR disiplin önceliği) ve ÇŞB poz birim uyuşmazlıkları için kanıta dayalı doğrulama simülatörü.',
    applicationCategory: 'BusinessApplication',
    applicationSubCategory: 'BIM Kalite Kontrol',
    operatingSystem: 'Web tarayıcısı',
    url: absolute(origin, '/smartcheck'),
    inLanguage: 'tr',
    isAccessibleForFree: true,
    featureList: [
      'IFC QTO metraj doğrulama (IfcWall, IfcSlab, IfcColumn)',
      'SmartCheck 3×3: metraj toleransı, paspayı, STR disiplin önceliği',
      'ÇŞB 2026 poz–birim uyuşmazlığı tespiti',
      'Minha (boşluk düşümü) kontrolü',
      'Allplan / Revit / ArchiCAD / Tekla IFC dosyası ile çalışır',
    ],
    publisher: { '@id': `${origin}/#organization` },
  };
}

/** GEO-06: FAQPage schema for /bim-sozlugu — IFC+marka arama sorgularını karşılar. */
function glossaryFaqPage(origin: string) {
  const faq = (q: string, a: string) => ({
    '@type': 'Question',
    name: q,
    acceptedAnswer: { '@type': 'Answer', text: a },
  });
  return {
    '@type': 'FAQPage',
    url: absolute(origin, '/bim-sozlugu'),
    mainEntity: [
      faq(
        'Allplan\'dan IFC nasıl export edilir?',
        'Allplan\'da File → Export → IFC Interface menüsünden IFC 2x3 veya IFC 4 formatını seçin. Dışa aktarım ayarlarında Quantities (Miktarlar) seçeneğini etkinleştirerek Qto_BaseQuantities verilerini (NetVolume, NetArea) IFC dosyasına dahil edin. Bu dosya doğrudan BIMMetraj\'a yüklenebilir.',
      ),
      faq(
        'Revit\'ten IFC nasıl çıkarılır?',
        'Revit\'te File → Export → IFC yolunu kullanın. IFC Setup\'ta "Export base quantities" seçeneğini işaretleyin; bu seçenek IfcElementQuantity nesnelerini dosyaya ekler. BIMMetraj IFC 2x3, IFC 4 ve IFC 4.3 formatlarını destekler.',
      ),
      faq(
        'ArchiCAD\'den IFC nasıl alınır?',
        'ArchiCAD\'de File → Save As → IFC 2x3 veya IFC4 seçin. Translator ayarlarında "Quantities" ve "Property Sets" dahil edildiğinden emin olun. Böylece Qto_BaseQuantities değerleri IFC dosyasına yazar ve BIMMetraj bu verileri okuyabilir.',
      ),
      faq(
        'Tekla Structures\'dan IFC nasıl export edilir?',
        'Tekla Structures\'da File → Export → IFC menüsünde IFC 2x3 veya IFC4 seçin. "Export quantities" seçeneği aktifken Qto_BaseQuantities ve özel property set\'ler dışa aktarılır. BIMMetraj bu IFC dosyasından otomatik metraj çıkarır.',
      ),
      faq(
        'BIMMetraj hangi IFC versiyonlarını destekliyor?',
        'BIMMetraj; IFC 2x3, IFC4 (IFC 4.0) ve IFC 4.3 (ISO 16739-1:2024) dosyalarını okuyabilir. Allplan, Revit, ArchiCAD, Tekla Structures, Bentley OpenBuildings ve diğer IFC uyumlu yazılımlardan ihraç edilen dosyalar desteklenir.',
      ),
      faq(
        '5D BIM nedir?',
        '5D BIM; 3B geometri, 4D inşaat programı ve maliyet boyutunu birleştiren BIM olgunluk seviyesidir. Her model elemanına ÇŞB poz numarası ve birim fiyat atanır; model değiştiğinde teklif/yaklaşık maliyet otomatik güncellenir. BIMMetraj\'ın temel işlevi IFC QTO metrajını 5D maliyet analizine dönüştürmektir.',
      ),
      faq(
        'openBIM nedir?',
        'openBIM, buildingSMART International tarafından savunulan; IFC, BCF ve bSDD gibi açık standartlar kullanarak BIM verilerinin yazılımdan bağımsız şekilde paylaşılmasını sağlayan yaklaşımdır. Allplan, Revit, ArchiCAD ve Tekla gibi uygulamalardan IFC formatında ihraç edilen modeller openBIM iş akışının temelidir.',
      ),
      faq(
        'ISO 19650 nedir?',
        'ISO 19650 (TS EN ISO 19650), yapı varlıklarına ilişkin bilgi yönetiminin uluslararası standardıdır. Bölüm 2 teslimat sürecini tanımlar: işveren EIR şartnamesine göre yüklenici BEP hazırlar, tüm model ve metraj teslimlerini CDE (Ortak Veri Ortamı) üzerinden yürütür. Türkiye\'nin e-PYS (RG 33331) pilot uygulaması bu standardı referans alır.',
      ),
    ],
  };
}

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

function articleSchema(origin: string, path: string, headline: string, description: string) {
  return {
    '@type': 'Article',
    headline,
    description,
    url: absolute(origin, path),
    inLanguage: 'tr',
    isAccessibleForFree: true,
    publisher: { '@id': `${origin}/#organization` },
  };
}

function academyJsonLd(pathname: string, origin: string, title: string, description: string): Record<string, unknown> | null {
  const parts = pathname.split('/').filter(Boolean);

  if (parts.length === 1) {
    // /academy — konu listesi
    return {
      '@context': 'https://schema.org',
      '@graph': [{
        '@type': 'ItemList',
        name: 'BIMMetraj Akademi',
        description,
        url: absolute(origin, '/academy'),
        inLanguage: 'tr',
        numberOfItems: ACADEMY_TOPICS.length,
        itemListElement: ACADEMY_TOPICS.map((topic, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: topic.title,
          url: absolute(origin, `/academy/${topic.slug}`),
        })),
      }],
    };
  }

  if (parts.length === 2) {
    // /academy/{topicSlug}
    const topic = findAcademyTopic(parts[1]);
    if (!topic) return null;
    const crumbs: Crumb[] = [HOME, ACADEMY_CRUMB, { name: topic.title, path: `/academy/${topic.slug}` }];
    return {
      '@context': 'https://schema.org',
      '@graph': [
        breadcrumbList(origin, crumbs),
        articleSchema(origin, pathname, title || topic.title, description || topic.summary),
      ],
    };
  }

  if (parts.length === 3) {
    // /academy/{topicSlug}/{guideSlug}
    const topic = findAcademyTopic(parts[1]);
    const guide = findAcademyGuide(parts[1], parts[2]);
    if (!topic || !guide) return null;
    const crumbs: Crumb[] = [HOME, ACADEMY_CRUMB, { name: topic.title, path: `/academy/${topic.slug}` }, { name: guide.title, path: pathname }];
    return {
      '@context': 'https://schema.org',
      '@graph': [
        breadcrumbList(origin, crumbs),
        articleSchema(origin, pathname, title || guide.title, description || guide.summary),
      ],
    };
  }

  return null;
}

export interface RouteJsonLdInput {
  pathname: string;
  origin: string;
  title: string;
  description: string;
}

/** Rotaya özgü JSON-LD grafiği; uygun şema yoksa `null`. */
export function routeJsonLd({ pathname, origin, title, description }: RouteJsonLdInput): Record<string, unknown> | null {
  // GEO-04: Organization+WebSite sitewide; anasamfa için breadcrumb olmadan yeterli.
  if (pathname === '/') {
    return {
      '@context': 'https://schema.org',
      '@graph': [organizationSchema(origin), webSiteSchema(origin)],
    };
  }
  if (pathname === '/academy' || pathname.startsWith('/academy/')) {
    return academyJsonLd(pathname, origin, title, description);
  }
  const crumbs = BREADCRUMBS[pathname];
  if (!crumbs) return null;
  const graph: Record<string, unknown>[] = [breadcrumbList(origin, crumbs)];
  if (pathname === '/bim-sozlugu') {
    graph.push(definedTermSet(origin));
    graph.push(glossaryFaqPage(origin)); // GEO-06
  }
  if (pathname === '/smartcheck') {
    graph.push(smartCheckApplication(origin)); // GEO-05
  }
  if (CALCULATOR_ROUTES.has(pathname)) graph.push(calculatorApplication(origin, pathname, crumbs.at(-1)!.name, description || title));
  return { '@context': 'https://schema.org', '@graph': graph };
}

/** `</script>` kapanışını ve HTML'e duyarlı karakterleri kaçışlayarak `<script type="application/ld+json">` bloğu üretir. */
export function renderJsonLdScript(id: string, data: Record<string, unknown>): string {
  const json = JSON.stringify(data).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
  return `<script id="${id}" type="application/ld+json">${json}</script>`;
}
