/**
 * Sunucu tarafı sayfa üst verisi (SEO/GEO).
 *
 * Uygulama tek sayfalı (SPA) olduğundan tüm genel rotalar aynı `index.html` kabuğunu döndürür; başlık,
 * açıklama ve canonical yalnız JS çalışınca değişir. JS çalıştırmayan arama ve yapay zekâ tarayıcıları için
 * bilinen genel rotalarda bu etiketler sunucuda yeniden yazılır. İçerik gövdesi hâlâ istemcide üretilir
 * (tam ön-render ayrı iştir); burada yalnız `<head>` doğrulanır.
 */

export interface RouteMeta {
  title: string;
  description: string;
}

const SITE = 'BIMMetraj';

const PUBLIC_ROUTE_META: Readonly<Record<string, RouteMeta>> = {
  '/': {
    title: `${SITE} | openBIM (IFC) Tabanlı Metraj, RG 33331 e-PYS ve İhale Masası`,
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
    description: 'IFC, QTO, LOD, COBie, ÇŞB poz ve RG 33331 e-PYS kavramlarının Türkçe açıklamaları.',
  },
  '/hesaplayicilar': {
    title: `Ücretsiz İnşaat Hesaplayıcıları | ${SITE}`,
    description: 'Varsayılan değer içermeyen, tarayıcıda çalışan KİK aşırı düşük teklif sınır değeri ve 4735 fiyat farkı hesaplayıcıları. Bağımsız doğrulanmamıştır.',
  },
  '/hesaplayicilar/kik-asiri-dusuk-teklif': {
    title: `Aşırı Düşük Teklif Sınır Değeri Hesaplama (KİK m.38) | ${SITE}`,
    description: 'Yaklaşık maliyet ve geçerli tekliflerden Tebliğ m.45.1.1 sınır değer hesabı. Girdileri siz girersiniz; sonuç bilgilendirme amaçlıdır.',
  },
  '/hesaplayicilar/fiyat-farki-4735': {
    title: `4735 Fiyat Farkı Hesaplama | ${SITE}`,
    description: 'F = A × B × (Pn − 1) fiyat farkı hesabı. Katsayı ve endeks değerlerini sözleşmenize göre siz girersiniz.',
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
};

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
}

/** `index.html` içinde başlık, açıklama, canonical ve paylaşım etiketlerini rota için yeniden yazar. */
export function injectRouteMeta(html: string, options: InjectOptions): string {
  const { pathname, origin, notFound = false, ogImagePath = null } = options;
  let out = html;
  const meta = getRouteMeta(pathname);
  const canonical = `${origin}${normalize(pathname) === '/' ? '/' : normalize(pathname)}`;

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

  if (notFound && out.includes('</head>') && !/name="robots"/.test(out)) {
    out = out.replace('</head>', '    <meta name="robots" content="noindex, nofollow" />\n  </head>');
  }
  return out;
}
