export const PLAN_CATALOG_VERSION = 'bimmetraj-2026-10-13-v4';
export interface CatalogPlan {
  id: string; name: string; monthlyPrice: number; monthlyQuoteLimit: number;
  monthlyIfcLimit: number | null; ifcMaxFileMb: number; ifcMaxConcurrent: number; isActive: boolean;
  isPublished: boolean; isFeatured: boolean; displayOrder: number;
  marketingBadge: string | null; marketingDescription: string | null;
  monthlyAiLimit: number | null; monthlyPdfLimit: number | null; monthlyCrmLimit: number | null;
  monthlyRegulationLimit: number | null; monthlyProfitAnalysisLimit: number | null;
  storageMaxBytes: number | null; maxDocuments: number | null; isTrial: boolean;
}

/** Feature limits owned by the catalog until an admin sets them; NULL marks "never configured". */
export const LIMIT_FIELDS = ['monthlyAiLimit', 'monthlyPdfLimit', 'monthlyCrmLimit', 'monthlyRegulationLimit',
  'monthlyProfitAnalysisLimit', 'storageMaxBytes', 'maxDocuments', 'isTrial'] as const;

const GB = 1024 ** 3;
const limits = (ai: number, pdf: number, crm: number, regulation: number, profit: number, storageGb: number, documents: number, isTrial = false) => ({
  monthlyAiLimit: ai, monthlyPdfLimit: pdf, monthlyCrmLimit: crm, monthlyRegulationLimit: regulation,
  monthlyProfitAnalysisLimit: profit, storageMaxBytes: storageGb * GB, maxDocuments: documents, isTrial,
});

/** Prices are TRY/month. Finite limits remain finite; no implicit unlimited entitlement. */
export const canonicalPlans: readonly CatalogPlan[] = [
  { id: '2b507e20-83d1-4b21-9fc1-000000000001', name: '14 Günlük Ücretsiz Deneme', monthlyPrice: 0, monthlyQuoteLimit: 5, monthlyIfcLimit: 1, ifcMaxFileMb: 35, ifcMaxConcurrent: 1, isActive: true, isPublished: true, isFeatured: false, displayOrder: 10, marketingBadge: '14 gün', marketingDescription: 'Teklif ve IFC inceleme akışını kendi projenizle deneyin.' , ...limits(5, 10, 50, 10, 10, 0.5, 100, true) },
  { id: '2b507e20-83d1-4b21-9fc1-000000000002', name: 'e-PYS & BIM Standart Denetçi', monthlyPrice: 390, monthlyQuoteLimit: 0, monthlyIfcLimit: 50, ifcMaxFileMb: 50, ifcMaxConcurrent: 1, isActive: true, isPublished: true, isFeatured: false, displayOrder: 20, marketingBadge: 'Pilot', marketingDescription: 'Pilot erken erişim: model isimlendirme ve e-PYS ön kontrolü. Sunucu tarafı IFC denetimi henüz pilot şirketlerde açılıyor.' , ...limits(0, 50, 0, 50, 0, 1, 500) },
  { id: '2b507e20-83d1-4b21-9fc1-000000000003', name: 'Teklif & Şantiye', monthlyPrice: 1450, monthlyQuoteLimit: 30, monthlyIfcLimit: 2, ifcMaxFileMb: 30, ifcMaxConcurrent: 1, isActive: true, isPublished: true, isFeatured: false, displayOrder: 30, marketingBadge: 'Başlangıç', marketingDescription: 'Excel metrajı ve fiyat kataloğuyla teklif hazırlama için.' , ...limits(30, 100, 500, 50, 50, 2, 1000) },
  { id: '2b507e20-83d1-4b21-9fc1-000000000004', name: '5D BIM & SmartCheck', monthlyPrice: 3950, monthlyQuoteLimit: 150, monthlyIfcLimit: 25, ifcMaxFileMb: 100, ifcMaxConcurrent: 2, isActive: true, isPublished: true, isFeatured: true, displayOrder: 40, marketingBadge: 'En çok tercih edilen', marketingDescription: '5D BIM, SmartCheck kalite kontrolleri ve kaynak izi.' , ...limits(150, 500, 2000, 300, 300, 10, 5000) },
  { id: '2b507e20-83d1-4b21-9fc1-000000000005', name: 'Kurumsal Taahhüt & e-PYS', monthlyPrice: 8900, monthlyQuoteLimit: 99999, monthlyIfcLimit: 100, ifcMaxFileMb: 100, ifcMaxConcurrent: 2, isActive: true, isPublished: true, isFeatured: false, displayOrder: 50, marketingBadge: 'Kurumsal', marketingDescription: 'Ekip yönetimi, yüksek kapasite ve öncelikli işleme için.' , ...limits(1000, 99999, 99999, 2000, 2000, 50, 20000) },
];

export function planCatalogChanges(rows: readonly CatalogPlan[]) {
  const insert: CatalogPlan[] = [];
  const existing: string[] = [];
  const presentationUpdates: CatalogPlan[] = [];
  const limitUpdates: CatalogPlan[] = [];
  for (const plan of canonicalPlans) {
    const matches = rows.filter(row => row.id === plan.id || row.name === plan.name);
    if (!matches.length) { insert.push({ ...plan }); continue; }
    const fields = ['name', 'monthlyPrice', 'monthlyQuoteLimit', 'monthlyIfcLimit', 'ifcMaxFileMb', 'ifcMaxConcurrent', 'isActive'] as const;
    if (matches.length !== 1 || fields.some(key => matches[0][key] !== plan[key])) {
      throw new Error(`CATALOG_CONFLICT: ${plan.name}; existing plans require explicit review`);
    }
    existing.push(matches[0].id);
    const presentationFields = ['isPublished', 'isFeatured', 'displayOrder', 'marketingBadge', 'marketingDescription'] as const;
    if (presentationFields.some(key => matches[0][key] !== plan[key])) presentationUpdates.push({ ...plan, id: matches[0].id });
    // Limits are backfilled only while never configured; afterwards the admin panel owns them.
    if (matches[0].monthlyAiLimit === null || matches[0].monthlyAiLimit === undefined) limitUpdates.push({ ...plan, id: matches[0].id });
  }
  return { version: PLAN_CATALOG_VERSION, insert, existing, presentationUpdates, limitUpdates };
}
