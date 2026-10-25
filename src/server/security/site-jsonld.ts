/**
 * T46 / GEO-03: site geneli Organization + SoftwareApplication JSON-LD. `index.html` içindeki statik blok yalnız
 * yerel geliştirme yedeğidir; üretimde bu grafik yetenek kaydından ve plan kataloğundan her istekte üretilir.
 * Yalnız doğrulanmış alanlar yazılır: puan, yorum, `sameAs` profilleri ve uydurma adres eklenmez.
 */
import { getLiveCapabilities, getPilotCapabilities } from '../../capabilities/registry';
import { canonicalPlans } from '../../services/billing/plan-catalog';

const ORGANIZATION_DESCRIPTION =
  'Türkiye inşaat ve mühendislik sektörü için openBIM (IFC) tabanlı metraj, maliyet, ÇŞB 2026 poz ve RG 33331 e-PYS ön kontrol araçları. Sonuçlar ön kontrol niteliğindedir.';

/** Yayındaki planların fiyat aralığı; deneme dahil, katalogdaki sırayla. */
function aggregateOffer() {
  const prices = canonicalPlans.filter(plan => plan.isActive && plan.isPublished).map(plan => plan.monthlyPrice);
  return {
    '@type': 'AggregateOffer',
    priceCurrency: 'TRY',
    lowPrice: String(Math.min(...prices)),
    highPrice: String(Math.max(...prices)),
    offerCount: String(prices.length),
  };
}

/** Özellik listesi: yalnız canlı ve pilot yetenekler; yol haritasındakiler yazılmaz. */
export function siteFeatureList(): string[] {
  return [...getLiveCapabilities(), ...getPilotCapabilities()].map(capability => capability.title);
}

export function siteJsonLd(origin: string): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${origin}/#organization`,
        name: 'BIMMetraj',
        url: origin,
        logo: { '@type': 'ImageObject', url: `${origin}/og-image.png`, width: 1200, height: 630 },
        image: `${origin}/og-image.png`,
        email: 'info@bimmetraj.com',
        address: { '@type': 'PostalAddress', addressLocality: 'İstanbul', addressCountry: 'TR' },
        areaServed: { '@type': 'Country', name: 'Türkiye', identifier: 'TR' },
        contactPoint: { '@type': 'ContactPoint', email: 'info@bimmetraj.com', contactType: 'customer support', availableLanguage: 'tr' },
        description: ORGANIZATION_DESCRIPTION,
      },
      {
        '@type': 'SoftwareApplication',
        '@id': `${origin}/#software`,
        name: 'BIMMetraj',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        url: origin,
        inLanguage: 'tr-TR',
        publisher: { '@id': `${origin}/#organization` },
        featureList: siteFeatureList(),
        offers: aggregateOffer(),
      },
    ],
  };
}
