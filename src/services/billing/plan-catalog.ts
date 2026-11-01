export const PLAN_CATALOG_VERSION = 'bimmetraj-2026-11-01-v8';
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

const NULLABLE_LIMIT_FIELDS = LIMIT_FIELDS.filter((key): key is Exclude<typeof key, 'isTrial'> => key !== 'isTrial');

const GB = 1024 ** 3;
const limits = (ai: number, pdf: number, crm: number, regulation: number, profit: number, storageGb: number, documents: number, isTrial = false) => ({
  monthlyAiLimit: ai, monthlyPdfLimit: pdf, monthlyCrmLimit: crm, monthlyRegulationLimit: regulation,
  monthlyProfitAnalysisLimit: profit, storageMaxBytes: storageGb * GB, maxDocuments: documents, isTrial,
});

/** Prices are TRY/month. Finite limits remain finite; no implicit unlimited entitlement. */
export const canonicalPlans: readonly CatalogPlan[] = [
  { id: '2b507e20-83d1-4b21-9fc1-000000000001', name: '14 Günlük Ücretsiz Deneme', monthlyPrice: 0, monthlyQuoteLimit: 3, monthlyIfcLimit: 1, ifcMaxFileMb: 25, ifcMaxConcurrent: 1, isActive: true, isPublished: true, isFeatured: false, displayOrder: 10, marketingBadge: '14 gün', marketingDescription: 'Teklif ve IFC inceleme akışını kendi projenizle deneyin.' , ...limits(5, 3, 15, 5, 5, 0.25, 25, true) },
  { id: '2b507e20-83d1-4b21-9fc1-000000000002', name: 'e-PYS & BIM Standart Denetçi', monthlyPrice: 1250, monthlyQuoteLimit: 5, monthlyIfcLimit: 5, ifcMaxFileMb: 35, ifcMaxConcurrent: 1, isActive: true, isPublished: true, isFeatured: false, displayOrder: 20, marketingBadge: 'Pilot', marketingDescription: 'Pilot erken erişim: RG 33331 eklerine göre IFC ön kontrolü ve EK-9 taslak raporu; resmî uygunluk kararı değildir. Sunucu tarafı denetim henüz pilot şirketlerde açılıyor.' , ...limits(10, 8, 25, 15, 5, 1, 150) },
  { id: '2b507e20-83d1-4b21-9fc1-000000000003', name: 'Teklif & Şantiye', monthlyPrice: 2950, monthlyQuoteLimit: 25, monthlyIfcLimit: 5, ifcMaxFileMb: 40, ifcMaxConcurrent: 1, isActive: true, isPublished: true, isFeatured: false, displayOrder: 30, marketingBadge: 'Başlangıç', marketingDescription: 'Excel metrajı ve fiyat kataloğuyla teklif hazırlama için.' , ...limits(25, 15, 150, 30, 25, 2, 300) },
  { id: '2b507e20-83d1-4b21-9fc1-000000000004', name: '5D BIM & SmartCheck', monthlyPrice: 5450, monthlyQuoteLimit: 75, monthlyIfcLimit: 15, ifcMaxFileMb: 60, ifcMaxConcurrent: 1, isActive: true, isPublished: true, isFeatured: true, displayOrder: 40, marketingBadge: 'En çok tercih edilen', marketingDescription: '5D BIM, SmartCheck kalite kontrolleri ve kaynak izi.' , ...limits(60, 35, 500, 100, 75, 5, 750) },
  { id: '2b507e20-83d1-4b21-9fc1-000000000005', name: 'Kurumsal Taahhüt & e-PYS', monthlyPrice: 8900, monthlyQuoteLimit: 200, monthlyIfcLimit: 35, ifcMaxFileMb: 85, ifcMaxConcurrent: 1, isActive: true, isPublished: true, isFeatured: false, displayOrder: 50, marketingBadge: 'Kurumsal', marketingDescription: 'Yüksek teklif ve IFC kapasitesi için.' , ...limits(150, 75, 1500, 250, 200, 15, 2000) },
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
    // Each limit is backfilled only while never configured; afterwards the admin panel owns it.
    const row = matches[0];
    const unset = NULLABLE_LIMIT_FIELDS.filter(key => row[key] === null || row[key] === undefined);
    if (unset.length) limitUpdates.push({ ...row, ...Object.fromEntries(unset.map(key => [key, plan[key]])), id: row.id });
  }
  return { version: PLAN_CATALOG_VERSION, insert, existing, presentationUpdates, limitUpdates };
}
