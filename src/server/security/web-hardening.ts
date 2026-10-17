import type { RequestHandler } from 'express';
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
    'script-src': ["'self'"],
    'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    'img-src': ["'self'", 'data:', 'blob:'],
    'font-src': ["'self'", 'data:', 'https://fonts.gstatic.com'],
    'connect-src': ["'self'", ...storageOrigins, ...FIREBASE_ORIGINS],
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
const PUBLIC_PAGES = ['/', '/about', '/features', '/pricing', '/smartcheck', '/bim-sozlugu', ...(ACADEMY_ENABLED ? ACADEMY_PAGES : []), '/pilot', '/terms', '/privacy'];

export function sitemapXml(publicAppUrl: string): string {
  const origin = new URL(publicAppUrl).origin;
  const urls = PUBLIC_PAGES.map(page => `  <url><loc>${origin}${page}</loc></url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export function robotsTxt(publicAppUrl: string): string {
  const origin = new URL(publicAppUrl).origin;
  return ['User-agent: *', 'Disallow: /app/', 'Disallow: /admin/', 'Disallow: /api/', '', `Sitemap: ${origin}/sitemap.xml`, ''].join('\n');
}

export function llmsTxt(publicAppUrl: string): string {
  const origin = new URL(publicAppUrl).origin;
  return [
    '# BIMMetraj (TeklifPro) — openBIM (IFC) Metraj, RG 33331 e-PYS & 5D İhale Masası',
    '',
    '> BIMMetraj; Türkiye inşaat, mimarlık ve teknik ofis ekipleri için IFC 2x3 / IFC4 / IFC4.3 model tabanlı metraj (QTO) çıkarma, ÇŞB 2026 poz birim fiyat eşleştirme, 4734 KİK aşırı düşük teklif analizi, SmartCheck 3x3 & Minha kalite denetimi ve 5 Ağustos 2026 tarihli RG 33331 e-PYS (Elektronik Proje Yönetim Sistemi) EK-9 dijital ruhsat ön-kontrol platformudur.',
    '',
    '## Temel Mühendislik Yetenekleri',
    '- **openBIM IFC Metraj (QTO) Motoru**: IfcBeam, IfcColumn, IfcSlab, IfcWall, IfcCovering ve IfcReinforcingBar elemanlarından BaseQuantities ve geometri tabanlı metraj çıkarımı.',
    '- **SmartCheck 3x3 & Minha Denetimi**: TS 500, TBDY 2018, TS 708 donatı ağırlık tablosu ve ÇŞB Genel Teknik Şartnamesi boşluk/kesişim minha kuralları (0.50 m² / 4.00 m² eşikleri) ile kanıta dayalı metraj kontrolü.',
    '- **RG 33331 e-PYS & PDF/A-1b Ön Kontrol**: 5 Ağustos 2026 tarihli Resmi Gazete Yönetmeliği EK-6 ve EK-9 kurallarına göre IFC özellik seti (Pset), mahal (IfcSpace) ve PDF/A-1b arşiv uyumluluk denetimi.',
    '- **ÇŞB Poz & 5D Teklif Cetveli**: Çevre, Şehircilik ve İklim Değişikliği Bakanlığı (ÇŞB) birim fiyat pozları, firma fiyat hafızası, eskalasyon ve kârlılık simülasyonu.',
    '',
    '## Genel Sayfalar ve Bilgi Kaynakları',
    `- [Ana Sayfa](${origin}/): BIMMetraj 5D ihale ve metraj platformu genel bakış.`,
    `- [Özellikler](${origin}/features): IFC QTO, SmartCheck denetimi, ÇŞB poz eşleştirme ve PDF/A raporlama yetenekleri.`,
    `- [SmartCheck Canlı Demo](${origin}/smartcheck): Kanıta dayalı 3x3 metraj ve kalite kontrol simülatörü.`,
    `- [Paketler ve Fiyatlandırma](${origin}/pricing): Ücretsiz Deneme (Trial), Başlangıç (Starter), Profesyonel (Pro) ve Kurumsal (Enterprise) paket kotaları.`,
    `- [BIM & Mevzuat Sözlüğü](${origin}/bim-sozlugu): ISO 19650, IFC 4.3, QTO, LOD, COBie, ÇŞB Poz ve RG 33331 e-PYS kapsamlı Türkçe mühendislik sözlüğü.`,
    `- [Pilot Başvurusu](${origin}/pilot): Kurumsal teknik ofisler için gerçek proje dosyalarıyla pilot çalışma başvurusu.`,
    `- [Kullanım Koşulları](${origin}/terms): Mühendislik sorumluluğu, ön-kontrol niteliği ve abonelik koşulları.`,
    `- [KVKK ve Gizlilik Bildirimi](${origin}/privacy): 6698 sayılı KVKK aydınlatma metni ve proje dosyalarında kişisel veri maskeleme politikası.`,
    '',
  ].join('\n');
}

