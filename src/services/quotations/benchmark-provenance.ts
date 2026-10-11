import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { priceFeedStaging, pricingDataSources } from '../../db/schema';
import { benchmarkEligible } from '../pricing/benchmark-policy';
import type { ManualQuotationInput } from './input';
import { QuotationIntegrityError } from './integrity';
type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

// Approval and source records stay locked until the quote write commits.
export async function resolveBenchmarkProvenance(tx: Transaction, items: ManualQuotationInput['items'], currency: string) {
 const resolved = new Map<string, { priceSource: string; sourceReference: string; verificationStatus: string }>();
 for (const item of [...items].sort((a,b) => (a.benchmarkStagingId ?? '').localeCompare(b.benchmarkStagingId ?? ''))) {
  if (!item.benchmarkStagingId) continue;
  const [row] = await tx.select().from(priceFeedStaging).where(eq(priceFeedStaging.id, item.benchmarkStagingId)).for('share');
  const [source] = row ? await tx.select().from(pricingDataSources).where(eq(pricingDataSources.id,row.sourceId)).for('share') : [];
  if (!row || !source || !benchmarkEligible({...row,sourceStatus:source.status,validityStart:source.validityStart,validityEnd:source.validityEnd})
    || source.currency !== 'TRY' || currency !== 'TRY' || item.unit !== row.unit || item.unitPrice !== Number(row.crawledPrice)) {
   throw new QuotationIntegrityError(409,'Rayiç onayı, geçerliliği, birimi veya fiyatı değişti. Onaylı rayiçleri yeniden yükleyin.');
  }
  resolved.set(row.id, { priceSource:'market', verificationStatus:'needs_review', sourceReference:JSON.stringify({
   kind:'approved_pricing_benchmark',version:1,stagingId:row.id,sourceId:source.id,sourceName:source.name,
   itemCode:row.itemCode,itemName:row.itemName,unit:row.unit,price:row.crawledPrice,currency:'TRY',sourceUrl:row.sourceUrl ?? source.sourceUrl,
   reviewedAt:row.reviewedAt,reviewedByUserId:row.reviewedByUserId,crawledAt:row.crawledAt,
   validityStart:source.validityStart,validityEnd:source.validityEnd,sourceVersion:source.versionTag,
  }) });
 }
 return items.map(({benchmarkStagingId,...item}) => ({...item,
  ...(benchmarkStagingId ? resolved.get(benchmarkStagingId)! : {priceSource:'manual',verificationStatus:'unverified',sourceReference:null}),
 }));
}
