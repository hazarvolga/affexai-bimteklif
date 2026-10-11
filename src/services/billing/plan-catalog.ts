export const PLAN_CATALOG_VERSION = 'bimmetraj-2026-10-11-v1';
export interface CatalogPlan {
  id: string; name: string; monthlyPrice: number; monthlyQuoteLimit: number;
  monthlyIfcLimit: number | null; ifcMaxFileMb: number; ifcMaxConcurrent: number; isActive: boolean;
}

/** Prices are TRY/month. Finite limits remain finite; no implicit unlimited entitlement. */
export const canonicalPlans: readonly CatalogPlan[] = [
  { id: '2b507e20-83d1-4b21-9fc1-000000000001', name: '14 Günlük Ücretsiz Deneme', monthlyPrice: 0, monthlyQuoteLimit: 5, monthlyIfcLimit: 1, ifcMaxFileMb: 35, ifcMaxConcurrent: 1, isActive: true },
  { id: '2b507e20-83d1-4b21-9fc1-000000000002', name: 'e-PYS & BIM Standart Denetçi', monthlyPrice: 390, monthlyQuoteLimit: 0, monthlyIfcLimit: 50, ifcMaxFileMb: 50, ifcMaxConcurrent: 1, isActive: true },
  { id: '2b507e20-83d1-4b21-9fc1-000000000003', name: 'Teklif & Şantiye', monthlyPrice: 1450, monthlyQuoteLimit: 30, monthlyIfcLimit: 2, ifcMaxFileMb: 30, ifcMaxConcurrent: 1, isActive: true },
  { id: '2b507e20-83d1-4b21-9fc1-000000000004', name: '5D BIM & SmartCheck', monthlyPrice: 3950, monthlyQuoteLimit: 150, monthlyIfcLimit: 25, ifcMaxFileMb: 100, ifcMaxConcurrent: 2, isActive: true },
  { id: '2b507e20-83d1-4b21-9fc1-000000000005', name: 'Kurumsal Taahhüt & e-PYS', monthlyPrice: 8900, monthlyQuoteLimit: 99999, monthlyIfcLimit: 100, ifcMaxFileMb: 100, ifcMaxConcurrent: 2, isActive: true },
];

export function planCatalogChanges(rows: readonly CatalogPlan[]) {
  const insert: CatalogPlan[] = [];
  const existing: string[] = [];
  for (const plan of canonicalPlans) {
    const matches = rows.filter(row => row.id === plan.id || row.name === plan.name);
    if (!matches.length) { insert.push({ ...plan }); continue; }
    const fields = Object.keys(plan).filter(key => key !== 'id') as (keyof CatalogPlan)[];
    if (matches.length !== 1 || fields.some(key => matches[0][key] !== plan[key])) {
      throw new Error(`CATALOG_CONFLICT: ${plan.name}; existing plans require explicit review`);
    }
    existing.push(matches[0].id);
  }
  return { version: PLAN_CATALOG_VERSION, insert, existing };
}
