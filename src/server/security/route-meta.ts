/**
 * Sunucu tarafı sayfa üst verisi (SEO/GEO).
 *
 * Uygulama tek sayfalı (SPA) olduğundan tüm genel rotalar aynı `index.html` kabuğunu döndürür; başlık,
 * açıklama ve canonical yalnız JS çalışınca değişir. JS çalıştırmayan arama ve yapay zekâ tarayıcıları için
 * bilinen genel rotalarda bu etiketler sunucuda yeniden yazılır. İçerik gövdesi hâlâ istemcide üretilir
 * (tam ön-render ayrı iştir); burada yalnız `<head>` doğrulanır.
 */

import { PUBLIC_GLOSSARY_TERMS } from './public-glossary';
import { renderJsonLdScript, routeJsonLd } from './route-jsonld';
import { siteJsonLd } from './site-jsonld';
import { canonicalPlans } from '../../services/billing/plan-catalog';
import { BILLING_PERIOD_OPTIONS } from '../../services/billing/billing-periods';

const tl = (value: number) => value.toLocaleString('tr-TR');

/** T46: fiyat ve iskonto metni elle yazılmaz; plan kataloğu ve fatura dönemlerinden üretilir. */
function pricingBody(): string[] {
  const plans = canonicalPlans.filter(plan => plan.isActive && plan.isPublished).sort((a, b) => a.displayOrder - b.displayOrder);
  const trial = plans.find(plan => plan.isTrial);
  const paid = plans.filter(plan => !plan.isTrial);
  const commitments = BILLING_PERIOD_OPTIONS.filter(option => option.discountPercent > 0);
  return [
    `${trial ? `${trial.name} (${tl(trial.monthlyPrice)} TL/ay) ve ` : ''}${paid.length} kademeli aylık paket kataloğu: ${paid.map(plan => `${plan.name} (${tl(plan.monthlyPrice)} TL/ay)`).join(', ')}.`,
    `Havale/EFT ile ${commitments.map(option => option.months).join(', ')} aylık taahhütlerde sırasıyla ${commitments.map(option => `%${option.discountPercent}`).join(', ')} iskonto uygulanır. Kredi kartı ile çevrimiçi tahsilat henüz yayında değildir; tüm ödemeler kurumsal banka havalesi/EFT ve fatura onayı ile yürütülür.`,
  ];
}

export interface RouteMeta {
  title: string;
  description: string;
  noindex?: boolean;
}

const SITE = 'BIMMetraj';

const PUBLIC_ROUTE_META: Readonly<Record<string, RouteMeta>> = {
  '/': {
    title: `${SITE} | openBIM (IFC) Metraj, e-PYS & 5D İhale Masası`,
    description:
      'İnşaat ve teknik ofis ekipleri için IFC ve Excel tabanlı metraj, ÇŞB 2026 poz eşleştirme, RG 33331 e-PYS ön kontrolü ve SmartCheck denetimli teklif hazırlama. Sonuçlar ön kontrol niteliğindedir.',
  },
  '/features': {
    title: `Özellikler — IFC Metraj, SmartCheck ve e-PYS Ön Kontrol | ${SITE}`,
    description:
      'IFC modelinden metraj, çok katmanlı kaplama ayrıştırma, SmartCheck 3×3 ve minha denetimi, RG 33331 e-PYS ön kontrolü ve ÇŞB 2026 poz kataloğu.',
  },
  '/pricing': {
    title: `Paketler ve Fiyatlandırma | ${SITE}`,
    description: '14 günlük ücretsiz deneme ve 5 kademeli aylık paket kataloğu; Havale/EFT ile 6, 12 ve 24 aylık taahhüt iskontoları.',
  },
  '/about': {
    title: `Nasıl Çalışır? Kanıta Dayalı Metraj ve Teklif Akışı | ${SITE}`,
    description: 'IFC veya Excel yükleme, metraj incelemesi, poz eşleştirme ve teklif oluşturma adımları.',
  },
  '/smartcheck': {
    title: `SmartCheck Canlı Demo — Kanıta Dayalı Metraj Kontrolü | ${SITE}`,
    description: 'Metraj sapması, paspayı ve disiplin kontrollerini örnek verilerle deneyin. Demo verileri gerçek proje değildir.',
  },
  '/bim-sozlugu': {
    title: `BIM ve Mevzuat Sözlüğü | ${SITE}`,
    description: 'IFC, QTO, LOD, LOIN, CDE, COBie, ÇŞB poz, TS 500, Minha ve RG 33331 e-PYS kavramlarının Türkçe mühendislik açıklamaları.',
  },
  '/hesaplayicilar': {
    title: `Ücretsiz İnşaat Hesaplayıcıları | ${SITE}`,
    description: 'Varsayılan değer içermeyen, tarayıcıda çalışan KİK aşırı düşük teklif sınır değeri, 4735 fiyat farkı, YAMBİS yetki belgesi grubu ve kat karşılığı KDV hesaplayıcıları. Bağımsız doğrulanmamıştır.',
  },
  '/hesaplayicilar/kik-asiri-dusuk-teklif': {
    title: `Aşırı Düşük Teklif Sınır Değeri Hesaplama (KİK m.38) | ${SITE}`,
    description: 'Yaklaşık maliyet ve geçerli tekliflerden Tebliğ m.45.1.1 sınır değer hesabı. Girdileri siz girersiniz; sonuç bilgilendirme amaçlıdır.',
  },
  '/hesaplayicilar/fiyat-farki-4735': {
    title: `4735 Fiyat Farkı Hesaplama | ${SITE}`,
    description: 'F = A × B × (Pn − 1) fiyat farkı hesabı. Katsayı ve endeks değerlerini sözleşmenize göre siz girersiniz.',
  },
  '/hesaplayicilar/yambis-muteahhitlik-grubu': {
    title: `Müteahhitlik Yetki Belgesi Grubu Ön Değerlendirmesi (YAMBİS) | ${SITE}`,
    description: 'Yapı Müteahhitlerinin Sınıflandırılması Yönetmeliği grup koşullarını (iş deneyimi, bilanço rasyoları, ciro) kendi verilerinizle karşılaştırın. Bilgilendirme amaçlıdır.',
  },
  '/hesaplayicilar/kat-karsiligi-ve-kentsel-donusum': {
    title: `Kat Karşılığı Paylaşım ve KDV Ön Hesabı | ${SITE}`,
    description: 'Arsa sahibi ve müteahhit payını, VUK m.267/2 emsal bedel matrahını ve konut KDV\'sini (150 m² kademeli) kendi girdilerinizle hesaplayın. Bilgilendirme amaçlıdır.',
  },
  '/pilot': {
    title: `Pilot Başvurusu | ${SITE}`,
    description: 'Teknik ofisler için gerçek proje dosyalarıyla pilot çalışma başvurusu.',
  },
  '/terms': {
    title: `Kullanım Koşulları | ${SITE}`,
    description: 'Hizmet kapsamı, ön kontrol niteliği, mühendislik sorumluluğu ve abonelik koşulları.',
  },
  '/privacy': {
    title: `KVKK Aydınlatma ve Gizlilik Bildirimi | ${SITE}`,
    description: '6698 sayılı KVKK kapsamında kişisel veri işleme ve proje dosyalarında kişisel veri maskeleme politikası.',
  },
  '/login': {
    title: `Giriş Yap — Kurumsal İhale ve BIM Masası | ${SITE}`,
    description: 'BIMMetraj kurumsal teklif, openBIM IFC metraj ve SmartCheck çalışma alanınıza giriş yapın.',
    noindex: true,
  },
  '/register': {
    title: `Kayıt Ol — 14 Günlük Ücretsiz Deneme | ${SITE}`,
    description: 'BIMMetraj 14 günlük ücretsiz deneme hesabı oluşturun ve IFC/Excel tabanlı metraj ile teklif hazırlamaya başlayın.',
    noindex: true,
  },
  '/forgot-password': {
    title: `Şifre Sıfırlama | ${SITE}`,
    description: 'BIMMetraj hesap şifrenizi e-posta doğrulamasıyla sıfırlayın.',
    noindex: true,
  },
};

/**
 * JavaScript çalıştırmayan tarayıcılar (çoğu yapay zekâ ve bazı arama tarayıcıları) için rota başına gerçek içerik.
 * T48: içerik `<div id="root">` içine `<main id="prerender">` olarak yazılır. Readability/Trafilatura gibi çıkarıcılar
 * `<noscript>` içeriğini sildiği için metin artık onun dışındadır. JS çalışınca `createRoot().render()` kökü
 * temizleyip uygulamayı çizer; JS ile açılan sayfada görsel kayma olmasın diye blok bu sürede ekran dışında tutulur,
 * JS çalışmayan tarayıcıda `<noscript>` stili onu görünür yapar.
 * Yalnız kodla desteklenen ve kaynağı belirtilen bilgiler yazılır.
 */
const ROUTE_BODY: Readonly<Record<string, readonly string[]>> = {
  '/': [
    'BIMMetraj; Türkiye inşaat, mimarlık ve teknik ofis ekipleri için IFC 2x3, IFC4 ve IFC4.3 açık BIM modellerinden ve Excel metraj cetvellerinden otomatik miktar çıkarımı (QTO), ÇŞB 2026 poz birim fiyat eşleştirme, RG 33331 e-PYS dijital ruhsat ön kontrolü ve SmartCheck 3×3 kalite denetimi sağlayan 5D ihale ve metraj platformudur.',
    'Tüm mühendislik ve mevzuat kontrolleri insan onaylı ön kontrol niteliğindedir; imzalı uzman onayı gerektiren kararlarda resmî mevzuat metinleri ve yetkili mühendis görüşü esastır.',
  ],
  '/features': [
    'openBIM IFC Metraj (QTO) Motoru: IfcBeam, IfcColumn, IfcSlab, IfcWall ve çok katmanlı IfcCovering elemanlarından BaseQuantities, IfcComplexProperty ve 3B geometri tabanlı net metraj (m³, m², süpürgelik mtül) ve bağımsız bölüm (IfcZone/IfcSpace) daire cetveli çıkarımı yapar. Kalıp ve donatı miktarları model tahmini (model_estimate) olarak raporlanır.',
    'SmartCheck 3×3 ve Minha Denetimi: Şirket kalite politikası olan ≤%3 QTO sapma toleransı (smartcheck-3x3-2026-10-v2), TS 500 minimum paspayı (mm), TS 500 kiriş–döşeme kesişim düşümü ve ÇŞB 2026 (0,50 m²) / DIN 18350 (2,50 m²) / Özel Şartname boşluk minha kuralları ile kanıta dayalı metraj kontrolü sağlar.',
    'RG 33331 e-PYS ve ISO 19650-2 Desteği: 5 Ağustos 2026 tarihli Resmî Gazete Yönetmeliği EK-1..EK-7 ve disipline göre EK-9 Tablo 9.1 (Mimari 21 satır) / Tablo 9.2 (Diğer Disiplinler 16 satır) kuralları ile TS EN ISO 19650-2 dosya adlandırma ve EN 17412-1 (LOIN) eleman bütünlük ön kontrolünü çalıştırır.',
  ],
  '/about': [
    'BIMMetraj 4 adımlı kanıta dayalı iş akışı: 1) IFC 2x3/4/4.3 modelinizi, 2B PDF paftanızı veya Excel metraj cetvelinizi yükleyin. 2) RG 33331 e-PYS EK-9, ISO 19650-2 ve PDF/A ön kontrol bulgularını inceleyin. 3) SmartCheck 3×3, TS 500 kesişim ve Minha düşüm kurallarıyla net metrajları doğrulayın. 4) ÇŞB 2026 poz kataloğu veya firma fiyat hafızanızla eşleştirip kurumsal teklif cetvelini oluşturun.',
    'Modelden doğrudan kanıtlanan beton, kaplama ve süpürgelik miktarları ile mühendis onayı gerektiren kalıp ve donatı tahminleri birbirinden ayrı gösterilir.',
  ],
  '/smartcheck': [
    'SmartCheck Canlı Demo; örnek IFC/metraj verileri üzerinde ≤%3 QTO sapma politikası, TS 500 betonarme paspayı kontrolü, ÇŞB 2026 / DIN 18350 boşluk minha düşümü ve RG 33331 e-PYS EK-9 ön kontrol kurallarını tarayıcıda deneyimlemenizi sağlar.',
    'Bu sayfadaki veriler tanıtım amaçlı örnek senaryolardır; gerçek proje dosyalarınızı test etmek için ücretsiz deneme hesabı oluşturabilir veya pilot başvurusunda bulunabilirsiniz.',
  ],
  '/bim-sozlugu': PUBLIC_GLOSSARY_TERMS.map(term => `${term.name}: ${term.description}`),
  '/hesaplayicilar': [
    'BIMMetraj ücretsiz inşaat hesaplayıcıları, kayıt gerektirmeden ve uydurma varsayılan değer dayatmadan doğrudan tarayıcınızda çalışır: 1) 4734 KİK m.38 ve Kamu İhale Genel Tebliği m.45.1.1 Yapım İşleri Aşırı Düşük Teklif Sınır Değeri (SD) Hesaplayıcı, 2) 4735 Sayılı Kanun m.8 Yapım İşleri Fiyat Farkı F = An × B × (Pn − 1) Hesaplayıcı.',
    'Tüm hesaplamalar ön kontrol ve bilgilendirme amaçlıdır; bağımsız uzman onayı henüz alınmamıştır. İhale ve hakediş kararlarında resmî mevzuat metinleri ve ilgili idare esastır.',
  ],
  '/hesaplayicilar/kik-asiri-dusuk-teklif': [
    'Yapım işlerinde aşırı düşük teklif sınır değeri, 4734 sayılı Kamu İhale Kanunu m.38 ve Kamu İhale Genel Tebliği m.45.1.1 uyarınca şu adımlarla hesaplanır:',
    '1) Yaklaşık maliyetin (YM) %120\'sinin üzerindeki ve %40\'ının altındaki teklifler hesaba katılmaz. 2) Kalan geçerli tekliflerin aritmetik ortalaması (Tort1) ve standart sapması (σ) bulunur. 3) Tort1 − σ ile Tort1 + σ aralığındaki tekliflerin ortalaması Tort2 olur. 4) C = Tort2 / YM. 5) K katsayısı: C < 0,60 için K = C; 0,60 ≤ C ≤ 1,00 için K = (3,2C − C² − 0,6) / (C + 1); C > 1,00 için K = (C² − 0,8C + 1,4) / (C + 1). 6) Sınır değer SD = K × Tort2 / (C × N). Üstyapı, elektrik, mekanik tesisat ve elektronik işlerinde N = 1,00; diğer yapım işlerinde N = 1,20 (idare 1,00–1,20 arasında farklı bir değer belirleyebilir). 7) Hesaplanan değer YM\'nin %40\'ından küçükse SD = YM × %40 alınır.',
    'Yuvarlama: Tort1, σ ve Tort2 iki, C ve K üç ondalık basamağa yuvarlanır. Resmî örnek (Tebliğ 45.2): YM 100.000 TL, N = 1,20, 12 geçerli teklif → Tort1 = 66.270,00; σ = 20.317,05; Tort2 = 63.237,50; C = 0,632; K = 0,627; SD = 52.281,00 TL.',
    'Bu hesaplayıcı bilgilendirme amaçlıdır; ihale kararlarında resmî metinler ve ilgili idare esastır.',
  ],
  '/hesaplayicilar/fiyat-farki-4735': [
    'Yapım işlerinde fiyat farkı (4735 sayılı Kanun m.8; Yapım İşlerinde Uygulanacak Fiyat Farkına İlişkin Esaslar, 2013/5217 sayılı Karar ve sonraki değişiklikler) F = An × B × (Pn − 1) formülüyle hesaplanır.',
    'An, uygulama ayında gerçekleşen iş miktarlarının sözleşme birim fiyatlarıyla çarpımıdır; B = 0,90 sabit katsayısıdır; Pn, a (işçilik), b1–b6 (malzeme grupları) ve c (makine-ekipman) ağırlık katsayıları ile temel ve güncel endekslerden bulunur. Ağırlık katsayılarının toplamı 1,00\'dir ve ihale dokümanında gösterilir; sözleşme süresince değiştirilemez. Temel endeks ihale ayına, güncel endeks uygulama ayına aittir.',
    'Bu hesaplayıcı bilgilendirme amaçlıdır; sözleşmenizdeki katsayı ve endeks değerlerini siz girersiniz.',
  ],
  '/hesaplayicilar/yambis-muteahhitlik-grubu': [
    'Yapı Müteahhitlerinin Sınıflandırılması ve Kayıtlarının Tutulması Hakkında Yönetmelik (m.4, m.11, m.12, m.13, m.14) kapsamında A–H yetki belgesi grupları; yapı sınır bedeli, iş deneyim tutarı, cari oran (≥ 0,75), öz kaynak oranı (≥ 0,15), banka borcu / öz kaynak oranı (< 0,75), önceki yıl cirosu ve banka referans mektubu koşullarıyla değerlendirilir.',
    'Hiçbir değer varsayılmaz; başvuru tarihi (Geçici m.1/2 iş gücü muafiyeti kontrolü için) ve Bakanlıkça yayımlanan yapı sınır bedeli dahil tüm veriler kullanıcı tarafından girilir. Sonuçlar bilgilendirme amaçlı ön hesaptır.',
  ],
  '/hesaplayicilar/kat-karsiligi-ve-kentsel-donusum': [
    'Kat karşılığı inşaat sözleşmelerinde arsa sahibi ve müteahhit paylaşım oranı, emsale esas inşaat alanı, brüt/net alan çarpanları, birim maliyet, satış fiyatı ve hedeflenen kâr çarpanı üzerinden kullanıcı girdileriyle hesaplanır.',
    '3065 sayılı KDV Kanunu, 7346 sayılı Cumhurbaşkanı Kararı ve KDV Genel Uygulama Tebliği I/B-8 uyarınca 1/4/2022 sonrası yapı ruhsatlı konut teslimlerinde 150 m²\'ye kadar kısım (genel %10, 6306 kapsamında %1) ve 150 m² üzeri kısım (%20) ayrı dilimlenir; arsa sahibine bırakılan bağımsız bölümlerde VUK m.267/2 maliyet bedeli + %5 (toptan) / %10 (perakende) emsal bedel esas alınır. Sonuçlar bilgilendirme amaçlı ön hesaptır.',
  ],
  '/pricing': pricingBody(),
  '/pilot': [
    'Kurumsal teknik ofisler, mimarlık büroları ve yüklenici firmalar gerçek IFC modelleri, PDF paftaları ve Excel keşif listeleriyle BIMMetraj pilot programına başvurabilir.',
    'Pilot çalışmada QTO metraj sapması, Revit/Allplan IFC dışa aktarım ayarları, ÇŞB 2026 poz eşleştirmesi ve RG 33331 e-PYS EK-9 ön kontrol akışı kendi proje verileriniz üzerinde birlikte doğrulanır.',
  ],
  '/terms': [
    'BIMMetraj sonuçları ön kontrol niteliğindedir; mühendislik, mimarlık, ihale hukuku ve vergi kararlarında resmî mevzuat metinleri ve yetkili uzman görüşü esastır. Kalıp ve donatı tahminleri mühendis onayı olmadan hakediş veya teklif taahhüdü yerine geçmez.',
  ],
  '/privacy': [
    'Proje dosyalarındaki kişisel veriler (TC kimlik, VKN, telefon, e-posta) ön kontrol çıktılarında maskelenir. 6698 sayılı KVKK kapsamındaki başvuru ve haklarınız için info@bimmetraj.com adresinden iletişime geçebilirsiniz.',
  ],
};

const NAV_LINKS: readonly (readonly [string, string])[] = [
  ['/', 'Ana sayfa'], ['/features', 'Özellikler'], ['/pricing', 'Paketler'], ['/bim-sozlugu', 'BIM ve mevzuat sözlüğü'],
  ['/hesaplayicilar', 'Ücretsiz hesaplayıcılar'], ['/pilot', 'Pilot başvurusu'], ['/terms', 'Kullanım koşulları'], ['/privacy', 'KVKK ve gizlilik'],
];

/**
 * JS ile açılışta ön-render bloğu ekran dışında (ekran okuyucu ve metin çıkarıcıya açık) tutulur; React kökü
 * temizleyince blok kaybolur. JS kapalıysa `<noscript>` içindeki kural onu normal akışta gösterir.
 */
const PRERENDER_STYLE = [
  '<style id="prerender-style">#prerender{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0,0,0,0);white-space:normal;border:0}</style>',
  '<noscript><style>#prerender{position:static;width:auto;height:auto;margin:0 auto;padding:2rem 1rem;overflow:visible;clip:auto;max-width:60rem;font:16px/1.6 system-ui,sans-serif}</style></noscript>',
].join('\n    ');

function renderPrerender(pathname: string, origin: string, meta: RouteMeta, capabilityLines: readonly string[]): string {
  const key = normalize(pathname);
  const paragraphs = [meta.description, ...(ROUTE_BODY[key] ?? [])];
  const extra = key === '/' ? capabilityLines : [];
  const body = [
    `<h1>${escapeAttr(meta.title)}</h1>`,
    ...paragraphs.map(text => `<p>${escapeAttr(text)}</p>`),
    ...(extra.length ? ['<h2>Yetenekler ve doğrulama durumu</h2>', `<ul>${extra.map(line => `<li>${escapeAttr(line)}</li>`).join('')}</ul>`] : []),
    `<nav aria-label="Genel sayfalar"><ul>${NAV_LINKS.map(([href, label]) => `<li><a href="${origin}${href}">${escapeAttr(label)}</a></li>`).join('')}</ul></nav>`,
  ].join('');
  return `<main id="prerender" data-prerender="route">${body}</main>`;
}

function normalize(pathname: string): string {
  return pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
}

export function getRouteMeta(pathname: string): RouteMeta | null {
  return PUBLIC_ROUTE_META[normalize(pathname)] ?? null;
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function setMetaContent(html: string, selector: string, content: string): string {
  const pattern = new RegExp(`(<meta\\s+${selector}\\s+content=")[^"]*(")`);
  return pattern.test(html) ? html.replace(pattern, `$1${escapeAttr(content)}$2`) : html;
}

export interface InjectOptions {
  pathname: string;
  origin: string;
  /** Bilinmeyen rota: arama motorlarına indekslememe işareti ver. */
  notFound?: boolean;
  /** Paylaşım görseli mevcutsa mutlak URL'i. */
  ogImagePath?: string | null;
  /** Ana sayfa ön-render içeriği için yetenek özeti satırları (yetenek kaydından üretilir). */
  capabilityLines?: readonly string[];
}

/** `index.html` içinde başlık, açıklama, canonical ve paylaşım etiketlerini rota için yeniden yazar. */
export function injectRouteMeta(html: string, options: InjectOptions): string {
  const { pathname, origin, notFound = false, ogImagePath = null, capabilityLines = [] } = options;
  let out = html;
  const normalizedPath = normalize(pathname);
  const meta = getRouteMeta(pathname);
  const canonical = `${origin}${normalizedPath === '/' ? '/' : normalizedPath}`;

  // T46: statik site JSON-LD'si (index.html yedeği) yetenek kaydı ve plan kataloğundan üretilen grafikle değiştirilir.
  out = out.replace(/<script id="site-jsonld" type="application\/ld\+json">[\s\S]*?<\/script>/, () => renderJsonLdScript('site-jsonld', siteJsonLd(origin)));

  // FAQPage JSON-LD yalnız ana sayfada kalmalı (P2 SEO: diğer rotalarda tekrar etmemeli)
  if (normalizedPath !== '/') {
    out = out.replace(/\s*<script id="faq-jsonld" type="application\/ld\+json">[\s\S]*?<\/script>/, '');
  }

  if (meta && !notFound) {
    out = out.replace(/<title>[^<]*<\/title>/, `<title>${escapeAttr(meta.title)}</title>`);
    out = setMetaContent(out, 'name="description"', meta.description);
    out = setMetaContent(out, 'property="og:title"', meta.title);
    out = setMetaContent(out, 'property="og:description"', meta.description);
    out = setMetaContent(out, 'property="og:url"', canonical);
    out = setMetaContent(out, 'name="twitter:title"', meta.title);
    out = setMetaContent(out, 'name="twitter:description"', meta.description);
    out = out.replace(/(<link\s+rel="canonical"\s+href=")[^"]*(")/, `$1${escapeAttr(canonical)}$2`);
  }

  if (ogImagePath && out.includes('</head>') && !out.includes('property="og:image"')) {
    const image = `${origin}${ogImagePath}`;
    out = out.replace(
      '</head>',
      `    <meta property="og:image" content="${escapeAttr(image)}" />\n    <meta property="og:image:width" content="1200" />\n    <meta property="og:image:height" content="630" />\n    <meta name="twitter:image" content="${escapeAttr(image)}" />\n  </head>`,
    );
  }

  if (meta && !notFound && !meta.noindex && !out.includes('id="route-jsonld"') && out.includes('</head>')) {
    const data = routeJsonLd({ pathname: normalizedPath, origin, title: meta.title, description: meta.description });
    if (data) out = out.replace('</head>', `    ${renderJsonLdScript('route-jsonld', data)}\n  </head>`);
  }

  if (meta && !notFound && !meta.noindex && !out.includes('id="prerender"') && out.includes('<div id="root"></div>')) {
    out = out.replace('<div id="root"></div>', `<div id="root">${renderPrerender(pathname, origin, meta, capabilityLines)}</div>`);
    if (out.includes('</head>')) out = out.replace('</head>', `    ${PRERENDER_STYLE}\n  </head>`);
  }

  if (meta?.noindex && !notFound && out.includes('</head>') && !/name="robots"/.test(out)) {
    out = out.replace('</head>', '    <meta name="robots" content="noindex, follow" />\n  </head>');
  }

  // Bilinmeyen rota ana sayfaya canonical vermemeli (kopya içerik sinyali); noindex ile birlikte kaldırılır.
  if (notFound) out = out.replace(/\s*<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/, '');

  if (notFound && out.includes('</head>') && !/name="robots"/.test(out)) {
    out = out.replace('</head>', '    <meta name="robots" content="noindex, nofollow" />\n  </head>');
  }
  return out;
}
