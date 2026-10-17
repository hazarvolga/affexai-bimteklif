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
    'connect-src': ["'self'", ...storageOrigins, ...(ACADEMY_ENABLED ? FIREBASE_ORIGINS : [])],
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
    '> BIMMetraj; Türkiye inşaat, mimarlık ve teknik ofis ekipleri için IFC 2x3 / IFC4 / IFC4.3 model tabanlı metraj (QTO) çıkarma, çok katmanlı IfcCovering imalat ayrıştırma, ÇŞB 2026 poz birim fiyat eşleştirme, 4734 KİK m.38 aşırı düşük teklif (sınır değer & %80 sıralı iş kalemleri) analizi, TS EN ISO 19650-1/2 & EN 17412-1 (LOIN) bilgi konteyneri denetimi, SmartCheck 3x3 & Minha kalite denetimi ve 5 Ağustos 2026 tarihli RG 33331 e-PYS EK-9 dijital ruhsat ön-kontrol platformudur.',
    '',
    '## Temel Mühendislik Yetenekleri',
    '- **openBIM IFC Metraj (QTO) Motoru**: IfcBeam, IfcColumn, IfcSlab, IfcWall ve çok katmanlı IfcCovering elemanlarından BaseQuantities, IfcComplexProperty ve 3B geometri tabanlı net metraj (m³, m², süpürgelik mtül) ve bağımsız bölüm (IfcZone/IfcSpace) daire cetveli çıkarımı. Kalıp ve IfcReinforcingBar donatı miktarları model tahmini (model_estimate) olarak raporlanır ve mühendis onayı gerektirir.',
    '- **SmartCheck 3x3 & Minha Denetimi**: Şirket kalite politikası olan ≤%3 QTO sapma toleransı (smartcheck-3x3-2026-10-v2), TS 500 minimum paspayı (mm), TS 500 kiriş–döşeme kesişim düşümü ve ÇŞB 2026 / DIN 18350 / Özel Şartname boşluk minha kuralları (0,50 m², 2,50 m² ve 4,00 m² eşikleri) ile kanıta dayalı metraj kontrolü.',
    '- **TS EN ISO 19650-1/2 & EN 17412-1 (LOIN) Denetimi**: Bilgi konteyneri adlandırma şeması, CDE durumu (WIP S0 / SHARED S1..S7 / PUBLISHED A1..A7 / ARCHIVED B), revizyon kodu (Pxx.xx / Cxx) ve LOIN geometrik/alfa-sayısal bütünlük kontrolü (`src/smartcheck/rules/iso19650.ts`).',
    '- **4734 KİK m.38 & Genel Tebliğ m.45.1 Aşırı Düşük Teklif (ADT) Motoru**: Yapım işleri sınır değer (SD) hesabı (N=1,00 Üstyapı / N=0,80 Altyapı, 1-sigma filtreli düzeltilmiş ortalama) ve açıklama istenecek %80 Pareto sıralı iş kalemleri analizi (`src/lib/kik-adt.ts`).',
    '- **RG 33331 e-PYS & PDF/A Ön Kontrol**: 5 Ağustos 2026 tarihli Resmi Gazete Yönetmeliği EK-1..EK-7 ve disipline göre EK-9 Tablo 9.1 (Mimari 21 satır) / Tablo 9.2 (Diğer Disiplinler 16 satır) kurallarına göre IFC ön kontrolü; 2B PDF paftalarda PDF/A üstveri beyanı, ISO 216 A4 katları pafta boyutu, tek pafta düzeni ve 5070 sayılı Kanun gömülü e-imza (/Sig) ön kontrolü (tam PDF/A sertifikasyonu veraPDF gerektirir).',
    '- **ÇŞB 2026 Poz & 5D Teklif Cetveli**: SHA-256 mühürlü ÇŞB 2026 poz/rayiç kataloğu, firma fiyat hafızası, eskalasyon, kârlılık simülasyonu ve kurumsal PDF/Excel teklif çıktısı.',
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
    `- [Pilot Başvurusu](${origin}/pilot): Kurumsal teknik ofisler için gerçek proje dosyalarıyla pilot çalışma başvurusu.`,
    `- [Kullanım Koşulları](${origin}/terms): Mühendislik sorumluluğu, ön-kontrol niteliği ve abonelik koşulları.`,
    `- [KVKK ve Gizlilik Bildirimi](${origin}/privacy): 6698 sayılı KVKK aydınlatma metni ve proje dosyalarında kişisel veri maskeleme politikası.`,
    '',
  ].join('\n');
}

