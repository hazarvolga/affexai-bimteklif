import type { RequestHandler } from 'express';
import {
  CAPABILITY_REGISTRY_VERSION,
  getLiveCapabilities,
  getPilotCapabilities,
  getRoadmapCapabilities,
} from '../../capabilities/registry';
import { ACADEMY_ENABLED } from '../../config/features';
import { PLAN_CATALOG_VERSION, canonicalPlans } from '../../services/billing/plan-catalog';

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

const tl = (value: number) => value.toLocaleString('tr-TR');

/** T46: paket satırları elle yazılmaz; plan kataloğundan (ilk kurulum değerleri) üretilir. */
export function planCatalogLines(): string[] {
  return canonicalPlans
    .filter(plan => plan.isActive && plan.isPublished)
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map(plan => `- **${plan.name}**: ${tl(plan.monthlyPrice)} ₺/ay (${plan.monthlyQuoteLimit} Teklif, ${plan.monthlyIfcLimit ?? 0} IFC / ${plan.ifcMaxFileMb} MB, ${plan.monthlyPdfLimit ?? 0} PDF ön kontrol)`);
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
    `## Yetenek Kaydı ve Kanıt Kapısı (${CAPABILITY_REGISTRY_VERSION}) — seviye L3 ve üzeri yalnız gerçek, imzalı uzman onayıyla verilir; şu an hiçbir yetenek L3 değildir`,
    ...liveLines,
    ...pilotLines,
    ...roadmapLines,
    '',
    `## Paketler (${PLAN_CATALOG_VERSION})`,
    ...planCatalogLines(),
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

/** Genel sayfa ön-render (`#prerender`) içeriği için tek satırlık yetenek özeti: ad, durum ve doğrulama seviyesi. */
export function capabilitySummaryLines(): string[] {
  return [...getLiveCapabilities(), ...getPilotCapabilities(), ...getRoadmapCapabilities()].map(
    c => `${c.title} — ${STATUS_LABEL[c.status]} (${c.level}${c.reviewer ? '' : '; bağımsız uzman onayı yok'})`,
  );
}
