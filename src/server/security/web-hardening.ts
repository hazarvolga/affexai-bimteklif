import type { RequestHandler } from 'express';
import {
  CAPABILITY_REGISTRY_VERSION,
  getLiveCapabilities,
  getPilotCapabilities,
  getRoadmapCapabilities,
} from '../../capabilities/registry';
import { ACADEMY_ENABLED } from '../../config/features';

/** Firebase (Academy profile/certificates) is the only third-party runtime the SPA talks to. */
const FIREBASE_ORIGINS = [
  'https://firestore.googleapis.com',
  'https://firebase.googleapis.com',
  'https://firebaseinstallations.googleapis.com',
  'https://identitytoolkit.googleapis.com',
  'https://securetoken.googleapis.com',
];

function httpsOrigin(raw: string | undefined): URL | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

/**
 * Enforced in production. Scripts are same-origin only; inline styles stay allowed because
 * React style props and Tailwind arbitrary values set style attributes.
 */
export function contentSecurityPolicy(env: Record<string, string | undefined>): string {
  const storage = httpsOrigin(env.SMARTCHECK_S3_ENDPOINT);
  // Presigned uploads go browser -> bucket, either path-style or virtual-hosted (bucket.host).
  const storageOrigins = storage ? [storage.origin, `https://*.${storage.host}`] : [];
  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    'script-src': ["'self'", 'https://static.cloudflareinsights.com'],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'blob:'],
    'font-src': ["'self'", 'data:'],
    'connect-src': ["'self'", 'https://cloudflareinsights.com', ...storageOrigins, ...(ACADEMY_ENABLED ? FIREBASE_ORIGINS : [])],
    'worker-src': ["'self'", 'blob:'],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
  };
  return Object.entries(directives).map(([name, values]) => [name, ...values].join(' ')).join('; ');
}

/** 301s www.<apex> to the canonical origin from PUBLIC_APP_URL; other hosts pass through untouched. */
export function canonicalHostRedirect(publicAppUrl: string | undefined): RequestHandler {
  const canonical = httpsOrigin(publicAppUrl);
  const wwwHost = canonical && !canonical.hostname.startsWith('www.') ? `www.${canonical.hostname}` : null;
  return (req, res, next) => {
    if (!canonical || !wwwHost || req.hostname !== wwwHost) return next();
    res.redirect(301, `${canonical.origin}${req.originalUrl}`);
  };
}

const ACADEMY_PAGES = ['/academy', '/academy/complete', '/academy/allplan'];
const CALCULATOR_PAGES = [
  '/hesaplayicilar',
  '/hesaplayicilar/kik-asiri-dusuk-teklif',
  '/hesaplayicilar/fiyat-farki-4735',
];
const PUBLIC_PAGES = ['/', '/about', '/features', '/pricing', '/smartcheck', '/bim-sozlugu', ...CALCULATOR_PAGES, ...(ACADEMY_ENABLED ? ACADEMY_PAGES : []), '/pilot', '/terms', '/privacy'];

const EXACT_SPA_ROUTES = new Set([
  '/',
  '/index.html',
  '/about',
  '/features',
  '/pricing',
  '/smartcheck',
  '/bim-sozlugu',
  ...CALCULATOR_PAGES,
  '/pilot',
  '/login',
  '/register',
  '/terms',
  '/privacy',
  '/forgot-password',
]);

const PREFIX_SPA_ROUTES = [
  '/reset-password/',
  '/accept-invite/',
  '/verify-email/',
  '/academy',
  '/admin',
  '/app',
];

/**
 * Returns true if `pathname` matches a known SPA client route in `src/App.tsx`.
 * Unknown paths still receive the SPA shell (`index.html` -> `<NotFound />`),
 * but with HTTP status `404` instead of a soft-404 `200` (BUG-3 / SEO-2).
 */
export function isKnownSpaRoute(pathname: string): boolean {
  const normalized = pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
  if (EXACT_SPA_ROUTES.has(normalized)) return true;
  return PREFIX_SPA_ROUTES.some(
    (prefix) => normalized === prefix || normalized.startsWith(prefix.endsWith('/') ? prefix : `${prefix}/`),
  );
}

/**
 * SEO-03 / T47: sayfa başına gerçek bir içerik değişiklik tarihi tutulmadığı için `lastmod` yazılmaz.
 * Tüm sayfalara aynı (derleme veya sabit) tarihi vermek, arama motorlarına yanlış güncelleme sinyali olurdu.
 */
export function sitemapXml(publicAppUrl: string): string {
  const origin = new URL(publicAppUrl).origin;
  const urls = PUBLIC_PAGES.map(page => `  <url><loc>${origin}${page}</loc></url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

/** Arama/alıntı amaçlı yapay zekâ tarayıcıları (kullanıcı sorusuna yanıt verirken sayfayı okur). */
export const AI_SEARCH_CRAWLERS = ['OAI-SearchBot', 'ChatGPT-User', 'Claude-SearchBot', 'Claude-User', 'PerplexityBot', 'Perplexity-User'] as const;
/** Model eğitimi için içerik toplayan tarayıcılar ve eğitim kullanım belirteçleri. */
export const AI_TRAINING_CRAWLERS = ['GPTBot', 'ClaudeBot', 'Google-Extended', 'Applebot-Extended', 'CCBot'] as const;

export type AiTrainingPolicy = 'allow' | 'disallow';

const PRIVATE_DISALLOWS = ['Disallow: /app/', 'Disallow: /admin/', 'Disallow: /api/'];

/** `ROBOTS_AI_TRAINING=disallow` eğitim tarayıcılarını kapatır; tanımsız veya başka değer varsayılanı (izin) korur. */
export function aiTrainingPolicyFromEnv(value: string | undefined): AiTrainingPolicy {
  return value?.trim().toLowerCase() === 'disallow' ? 'disallow' : 'allow';
}

/**
 * GEO-01 / T49: yapay zekâ tarayıcıları için açık gruplar. Bir tarayıcı kendi adını taşıyan grubu bulunca `*`
 * grubunu okumaz; bu yüzden özel rotaların yasağı her grupta tekrarlanır. Varsayılan davranış önceki `*`
 * kuralıyla aynıdır (genel sayfalar açık); eğitim izni site sahibinin tercihidir.
 */
export function robotsTxt(publicAppUrl: string, trainingPolicy: AiTrainingPolicy = 'allow'): string {
  const origin = new URL(publicAppUrl).origin;
  const group = (agents: readonly string[], rules: readonly string[]) => [...agents.map(agent => `User-agent: ${agent}`), ...rules, ''];
  return [
    ...group(['*'], PRIVATE_DISALLOWS),
    '# Yapay zekâ arama ve alıntı tarayıcıları: genel sayfalar açık.',
    ...group(AI_SEARCH_CRAWLERS, PRIVATE_DISALLOWS),
    `# Model eğitimi tarayıcıları: ${trainingPolicy === 'allow' ? 'genel sayfalar açık' : 'site kapalı'} (ROBOTS_AI_TRAINING).`,
    ...group(AI_TRAINING_CRAWLERS, trainingPolicy === 'allow' ? PRIVATE_DISALLOWS : ['Disallow: /']),
    `Sitemap: ${origin}/sitemap.xml`,
    '',
  ].join('\n');
}

export function securityTxt(publicAppUrl: string): string {
  const origin = new URL(publicAppUrl).origin;
  return [
    'Contact: mailto:info@bimmetraj.com',
    'Preferred-Languages: tr, en',
    `Canonical: ${origin}/.well-known/security.txt`,
    'Expires: 2027-10-18T00:00:00.000Z',
    '',
  ].join('\n');
}

export function llmsTxt(publicAppUrl: string): string {
  const origin = new URL(publicAppUrl).origin;
  const liveLines = getLiveCapabilities().map(
    (c) =>
      `- **[${c.level} CANLI] ${c.title}**: ${c.shortClaim} (Kaynak: ${c.evidence.officialSource.documentTitle} — ${c.evidence.officialSource.articleOrTable}; Modül: \`${c.evidence.modulePath}\`; Golden Test: \`${c.evidence.goldenTestPath}\`)`,
  );
  const pilotLines = getPilotCapabilities().map(
    (c) => `- **[${c.level} PİLOT] ${c.title}**: ${c.shortClaim} (Modül: \`${c.evidence.modulePath}\`)`,
  );
  const roadmapLines = getRoadmapCapabilities().map(
    (c) => `- **[${c.level} YOL HARİTASI] ${c.title}**: ${c.shortClaim}`,
  );
  return [
    '# BIMMetraj (TeklifPro) — openBIM (IFC) Metraj, RG 33331 e-PYS & 5D İhale Masası',
    '',
    '> BIMMetraj; Türkiye inşaat, mimarlık ve teknik ofis ekipleri için IFC 2x3 / IFC4 / IFC4.3 model tabanlı metraj (QTO) çıkarma, çok katmanlı IfcCovering imalat ayrıştırma, ÇŞB 2026 poz birim fiyat eşleştirme, 4734 KİK m.38 kullanıcı girdili sınır değer & %80 sıralı iş kalemleri analizi, TS EN ISO 19650-2 / EN 17412-1 (LOIN) dosya adı ve eleman üstveri desteği, SmartCheck 3x3 & Minha kalite denetimi ve 5 Ağustos 2026 tarihli RG 33331 e-PYS EK-9 dijital ruhsat ön-kontrol platformudur.',
    '',
    '## Temel Mühendislik Yetenekleri (pilot aşaması; bağımsız mühendis/uzman doğrulaması henüz yoktur — sonuçlar ön kontrol niteliğindedir)',
    '- **openBIM IFC Metraj (QTO) Motoru**: IfcBeam, IfcColumn, IfcSlab, IfcWall ve çok katmanlı IfcCovering elemanlarından BaseQuantities, IfcComplexProperty ve 3B geometri tabanlı net metraj (m³, m², süpürgelik mtül) ve bağımsız bölüm (IfcZone/IfcSpace) daire cetveli çıkarımı. Kalıp ve IfcReinforcingBar donatı miktarları model tahmini (model_estimate) olarak raporlanır ve mühendis onayı gerektirir.',
    '- **SmartCheck 3x3 & Minha Denetimi**: Şirket kalite politikası olan ≤%3 QTO sapma toleransı (smartcheck-3x3-2026-10-v2), TS 500 minimum paspayı (mm), TS 500 kiriş–döşeme kesişim düşümü ve ÇŞB 2026 (0,50 m²) / DIN 18350 (2,50 m²) / Kullanıcı Tanımlı Özel Şartname boşluk minha kuralları ile kanıta dayalı metraj kontrolü.',
    '- **TS EN ISO 19650-2 & EN 17412-1 (LOIN) Desteği**: RG 33331 EK-2 (9 alanlı) ve ISO 19650-2 (7 alanlı) bilgi konteyneri dosya adlandırma şeması ile LOIN geometrik/alfa-sayısal eleman bütünlük kontrolü (`src/smartcheck/rules/iso19650.ts`). Doküman üstverisinde CDE durumu girilmediğinde uydurma varsayılan üretilmez ("değerlendirilmedi" döner); tam CDE durum makinesi Faz 2 yol haritasındadır.',
    '- **4734 KİK m.38 & Genel Tebliğ m.45.1.1 Aşırı Düşük Teklif (ADT) Motoru**: Teklif kalemlerinden %80 Pareto sıralı iş kalemleri analizi ve kullanıcı tarafından YM + geçerli teklifler girildiğinde Tebliğ m.45.1.1 formülü (%40–%120 YM bandı, Tort1, standart sapma, Tort2, C, K, N=1,00 Üstyapı / N=1,20 Diğer Yapım, SD = K × Tort2 / (C × N)) ile Sınır Değer hesabı (`src/lib/kik-adt.ts`). Tam KİK açıklama dosyası üretimi Faz 3 yol haritasındadır.',
    '- **RG 33331 e-PYS & PDF/A Ön Kontrol**: 5 Ağustos 2026 tarihli Resmi Gazete Yönetmeliği EK-1..EK-7 ve disipline göre EK-9 Tablo 9.1 (Mimari 21 satır) / Tablo 9.2 (Diğer Disiplinler 16 satır) kurallarına göre IFC ön kontrolü; 2B PDF paftalarda PDF/A üstveri beyanı, ISO 216 A4 katları pafta boyutu, tek pafta düzeni ve 5070 sayılı Kanun gömülü e-imza (/Sig) ön kontrolü (Ghostscript/veraPDF ile tam PDF/A-2b arşiv üretimi Faz 2 yol haritasındadır).',
    '- **ÇŞB 2026 Poz & 5D Teklif Cetveli**: SHA-256 mühürlü ÇŞB 2026 poz/rayiç kataloğu, firma fiyat hafızası, eskalasyon, kârlılık simülasyonu ve kurumsal PDF/Excel teklif çıktısı.',
    '',
    `## Yetenek Kaydı ve Kanıt Kapısı (${CAPABILITY_REGISTRY_VERSION}) — seviye L3 ve üzeri yalnız gerçek, imzalı uzman onayıyla verilir; şu an hiçbir yetenek L3 değildir`,
    ...liveLines,
    ...pilotLines,
    ...roadmapLines,
    '',
    '## Paketler (Katalog v6 — 5 Paket)',
    '- **14 Günlük Ücretsiz Deneme**: 0 ₺/ay (3 Teklif, 1 IFC / 25 MB, 3 PDF ön kontrol)',
    '- **e-PYS & BIM Standart Denetçi**: 1.250 ₺/ay (5 Teklif, 5 IFC / 35 MB, 8 PDF ön kontrol)',
    '- **Teklif & Şantiye**: 2.950 ₺/ay (25 Teklif, 5 IFC / 40 MB, 15 PDF ön kontrol)',
    '- **5D BIM & SmartCheck**: 5.450 ₺/ay (75 Teklif, 15 IFC / 60 MB, 35 PDF ön kontrol)',
    '- **Kurumsal Taahhüt & e-PYS**: 8.900 ₺/ay (200 Teklif, 35 IFC / 85 MB, 75 PDF ön kontrol)',
    '',
    '## Genel Sayfalar ve Bilgi Kaynakları',
    `- [Ana Sayfa](${origin}/): BIMMetraj 5D ihale ve metraj platformu genel bakış.`,
    `- [Özellikler](${origin}/features): IFC QTO, SmartCheck 3x3 & Minha denetimi, ÇŞB 2026 poz eşleştirme ve RG 33331 e-PYS / PDF/A ön kontrol yetenekleri.`,
    `- [SmartCheck Canlı Demo](${origin}/smartcheck): Kanıta dayalı 3x3 metraj ve kalite kontrol simülatörü.`,
    `- [Paketler ve Fiyatlandırma](${origin}/pricing): 5 kademeli v6 paket kataloğu ve 6 Aylık (%10), 1 Yıllık (%20), 2 Yıllık (%30) Havale/EFT taahhüt iskontoları.`,
    `- [BIM & Mevzuat Sözlüğü](${origin}/bim-sozlugu): openBIM IFC 4.3, QTO, LOD, COBie, ÇŞB 2026 Poz ve RG 33331 e-PYS kapsamlı Türkçe mühendislik sözlüğü.`,
    `- [Ücretsiz Hesaplayıcılar](${origin}/hesaplayicilar): Giriş gerektirmeyen, varsayılan değer içermeyen ön hesaplayıcılar (bağımsız doğrulanmamıştır).`,
    `- [Aşırı Düşük Teklif Sınır Değeri](${origin}/hesaplayicilar/kik-asiri-dusuk-teklif): KİK m.38 ve Tebliğ m.45.1.1 yapım işleri sınır değer hesabı.`,
    `- [4735 Fiyat Farkı](${origin}/hesaplayicilar/fiyat-farki-4735): F = A × B × (Pn − 1) fiyat farkı hesabı, kullanıcı girdili katsayı ve endeks.`,
    `- [Pilot Başvurusu](${origin}/pilot): Kurumsal teknik ofisler için gerçek proje dosyalarıyla pilot çalışma başvurusu.`,
    `- [Kullanım Koşulları](${origin}/terms): Mühendislik sorumluluğu, ön-kontrol niteliği ve abonelik koşulları.`,
    `- [KVKK ve Gizlilik Bildirimi](${origin}/privacy): 6698 sayılı KVKK aydınlatma metni ve proje dosyalarında kişisel veri maskeleme politikası.`,
    '',
  ].join('\n');
}


/**
 * Genişletilmiş makine-okunur özet (llms-full.txt): yetenek kaydındaki her kaydın tam açıklaması,
 * dayandığı kaynak ve doğrulama seviyesi. Yalnız kayıttan üretilir; elle iddia eklenmez.
 */
export function llmsFullTxt(publicAppUrl: string): string {
  const all = [...getLiveCapabilities(), ...getPilotCapabilities(), ...getRoadmapCapabilities()];
  const statusLabel = { live: 'CANLI', pilot: 'PİLOT', roadmap: 'YOL HARİTASI' } as const;
  const blocks = all.map((c) =>
    [
      `### ${c.title}`,
      `- Durum: ${statusLabel[c.status]} · Doğrulama seviyesi: ${c.level}`,
      `- Özet: ${c.shortClaim}`,
      `- Ayrıntı: ${c.longDescription}`,
      `- Dayanak: ${c.evidence.officialSource.institution} — ${c.evidence.officialSource.documentTitle} (${c.evidence.officialSource.articleOrTable})`,
      `- Uzman onayı: ${c.reviewer ? `${c.reviewer.name}, ${c.reviewer.title} (${c.reviewer.registrationNo}), ${c.reviewer.approvedAt}` : 'Yok (bağımsız mühendis/uzman doğrulaması henüz alınmadı)'}`,
      '',
    ].join('\n'),
  );
  return [
    llmsTxt(publicAppUrl).trimEnd(),
    '',
    `## Yetenek Ayrıntıları (${CAPABILITY_REGISTRY_VERSION})`,
    'Seviyeler: L1 motor ve birim test; L2 uygulama akışına bağlı; L3 resmî kaynak ve altın örnekle doğrulanmış, imzalı uzman onaylı; L4 pilot müşteride saha kabulü.',
    'Bu platformun sonuçları ön kontrol niteliğindedir; mühendislik, hukuk ve vergi kararlarında resmî metinler ve yetkili uzman görüşü esastır.',
    '',
    ...blocks,
  ].join('\n');
}

const STATUS_LABEL = { live: 'Canlı', pilot: 'Pilot', roadmap: 'Yol haritasında' } as const;

/** Genel sayfa `<noscript>` içeriği için tek satırlık yetenek özeti: ad, durum ve doğrulama seviyesi. */
export function capabilitySummaryLines(): string[] {
  return [...getLiveCapabilities(), ...getPilotCapabilities(), ...getRoadmapCapabilities()].map(
    c => `${c.title} — ${STATUS_LABEL[c.status]} (${c.level}${c.reviewer ? '' : '; bağımsız uzman onayı yok'})`,
  );
}
