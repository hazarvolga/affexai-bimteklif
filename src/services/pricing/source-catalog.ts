export const PRICING_SOURCE_CATALOG_VERSION = 'bimmetraj-pricing-sources-2026-10-11-v1';

export interface CatalogPricingSource {
  id: string; code: string; name: string; authority: string; category: string; sourceUrl: string;
  countryCode: string; currency: string; status: string; syncFrequency: string; itemCount: number; versionTag: string;
}

/** Metadata only. No price row, validity claim or approval is implied by this catalog. */
export const canonicalPricingSources: readonly CatalogPricingSource[] = [
  { id: '4c607e20-83d1-4b21-9fc1-000000000001', code: 'csb_yfk_2026', name: 'ÇŞB YFK Birim Fiyat Kaynak Adayı', authority: 'T.C. Çevre, Şehircilik ve İklim Değişikliği Bakanlığı (YFK)', category: 'official_gazette', sourceUrl: 'https://webdosya.csb.gov.tr/db/yfk', countryCode: 'TR', currency: 'TRY', status: 'stale', syncFrequency: 'monthly', itemCount: 0, versionTag: 'metadata-only' },
  { id: '4c607e20-83d1-4b21-9fc1-000000000002', code: 'epys_ek6', name: 'ÇŞB e-PYS Ek-6 Kaynak Adayı', authority: 'ÇŞB Mesleki Hizmetler Genel Müdürlüğü', category: 'epys_standard', sourceUrl: 'https://epys.csb.gov.tr/standartlar', countryCode: 'TR', currency: 'TRY', status: 'stale', syncFrequency: 'monthly', itemCount: 0, versionTag: 'metadata-only' },
  { id: '4c607e20-83d1-4b21-9fc1-000000000003', code: 'market_concrete_marmara', name: 'Marmara Hazır Beton Aday Piyasa Kaynağı', authority: 'Piyasa web kaynağı; kurum doğrulaması bekleniyor', category: 'market_commodity', sourceUrl: 'https://www.insaatgundemi.com/hazir-beton-fiyatlari.html', countryCode: 'TR', currency: 'TRY', status: 'stale', syncFrequency: 'weekly', itemCount: 0, versionTag: 'metadata-only' },
  { id: '4c607e20-83d1-4b21-9fc1-000000000004', code: 'market_steel_karabuk', name: 'Karabük/Payas Donatı Çeliği Aday Piyasa Kaynağı', authority: 'Piyasa web kaynağı; kurum doğrulaması bekleniyor', category: 'market_commodity', sourceUrl: 'https://demirfiyatlari.com', countryCode: 'TR', currency: 'TRY', status: 'stale', syncFrequency: 'daily', itemCount: 0, versionTag: 'metadata-only' },
  { id: '4c607e20-83d1-4b21-9fc1-000000000005', code: 'tuik_ime', name: 'TÜİK İnşaat Maliyet Endeksi Kaynak Adayı', authority: 'Türkiye İstatistik Kurumu', category: 'tuik_index', sourceUrl: 'https://data.tuik.gov.tr/Bulten/Index', countryCode: 'TR', currency: 'TRY', status: 'stale', syncFrequency: 'monthly', itemCount: 0, versionTag: 'metadata-only' },
];

export function pricingSourceCatalogChanges(rows: readonly CatalogPricingSource[]) {
  const insert: CatalogPricingSource[] = [], existing: string[] = [];
  const fields = ['code', 'name', 'authority', 'category', 'sourceUrl', 'countryCode', 'currency', 'syncFrequency'] as const;
  for (const source of canonicalPricingSources) {
    const matches = rows.filter(row => row.id === source.id || row.code === source.code);
    if (!matches.length) { insert.push({ ...source }); continue; }
    if (matches.length !== 1 || fields.some(field => matches[0][field] !== source[field])) throw new Error(`SOURCE_CATALOG_CONFLICT: ${source.code}`);
    existing.push(matches[0].id);
  }
  return { version: PRICING_SOURCE_CATALOG_VERSION, insert, existing };
}
