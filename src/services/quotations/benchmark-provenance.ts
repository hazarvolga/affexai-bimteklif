import { priceObservationMatchesSource } from '../../server/crawler/source-identity';
import { buildPricePermissionEvidence, sourceReviewEligible } from '../../server/pricing/source-review-policy';
import { asc, inArray } from 'drizzle-orm';
import { sha256Payload } from '../../smartcheck/pricing/snapshots';
import { db } from '../../db';
import { priceFeedStaging, pricingDataSources } from '../../db/schema';
import { benchmarkEligible } from '../pricing/benchmark-policy';
import type { ManualQuotationInput } from './input';
import { QuotationIntegrityError } from './integrity';
type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

// Approval and source records stay locked until the quote write commits.
export async function resolveBenchmarkProvenance(tx: Transaction, items: ManualQuotationInput['items'], currency: string) {
 const resolved = new Map<string, { priceSource: string; sourceReference: string; verificationStatus: string }>();
 const failure = () => new QuotationIntegrityError(409,'Rayiç onayı, geçerliliği, birimi veya fiyatı değişti. Onaylı rayiçleri yeniden yükleyin.');
 const ids = [...new Set(items.flatMap(item => item.benchmarkStagingId ? [item.benchmarkStagingId.toLowerCase()] : []))].sort();
 const discovered = new Map<string, string>();
 // Discover without retaining row locks. Writers lock sources before staging, so
 // all sources must be locked first (including across multi-source quotations).
 if (ids.length) for (const row of await tx.select({ id: priceFeedStaging.id, sourceId: priceFeedStaging.sourceId }).from(priceFeedStaging).where(inArray(priceFeedStaging.id,ids))) discovered.set(row.id,row.sourceId);
 if (discovered.size !== ids.length) throw failure();
 const sources = new Map<string, typeof pricingDataSources.$inferSelect>();
 const sourceIds = [...new Set(discovered.values())].sort();
 if (sourceIds.length) for (const source of await tx.select().from(pricingDataSources).where(inArray(pricingDataSources.id,sourceIds)).orderBy(asc(pricingDataSources.id)).for('share')) sources.set(source.id,source);
 if (sources.size !== sourceIds.length) throw failure();
 const rows = new Map<string, typeof priceFeedStaging.$inferSelect>();
 if (ids.length) for (const row of await tx.select().from(priceFeedStaging).where(inArray(priceFeedStaging.id,ids)).orderBy(asc(priceFeedStaging.id)).for('share')) {
  const id = row.id;
  if (!row || row.sourceId !== discovered.get(id)) throw failure();
  rows.set(id,row);
 }
 if (rows.size !== ids.length) throw failure();
 for (const item of items) {
  if (!item.benchmarkStagingId) continue;
  const row = rows.get(item.benchmarkStagingId.toLowerCase());
  const source = row ? sources.get(row.sourceId) : undefined;
  if (!row || !source || !sourceReviewEligible(source) || !priceObservationMatchesSource(row, source) || !benchmarkEligible({...row,sourceStatus:source.status,authorizationStatus:source.authorizationStatus,authorizationEvidenceHash:source.authorizationEvidenceHash,authorizedAt:source.authorizedAt,validityStart:source.validityStart,validityEnd:source.validityEnd})
    || source.currency !== 'TRY' || currency !== 'TRY' || item.unit !== row.unit || item.unitPrice !== Number(row.crawledPrice)) {
   throw failure();
  }
  const { scope, reviewedByUserId: _reviewer, ...publicPermissionReview } = buildPricePermissionEvidence(source);
  resolved.set(row.id, { priceSource:'market', verificationStatus:'needs_review', sourceReference:JSON.stringify({
   kind:'approved_pricing_benchmark',version:1,stagingId:row.id,sourceId:source.id,sourceName:source.name,
   itemCode:row.itemCode,itemName:row.itemName,unit:row.unit,price:row.crawledPrice,currency:'TRY',sourceUrl:row.sourceUrl ?? source.sourceUrl,
   reviewedAt:row.reviewedAt,reviewedByUserId:row.reviewedByUserId,crawledAt:row.crawledAt,contentHash:row.contentHash,
   validityStart:source.validityStart,validityEnd:source.validityEnd,sourceVersion:source.versionTag,
   permissionReview:{ ...publicPermissionReview, scopeHash: scope ? sha256Payload({ scope }) : null },
  }) });
 }
 return items.map(({benchmarkStagingId,...item}) => {
  if (!benchmarkStagingId) return {...item, priceSource:'manual',verificationStatus:'unverified',sourceReference:null};
  const evidence = resolved.get(benchmarkStagingId.toLowerCase());
  if (!evidence) throw failure();
  return {...item, ...evidence};
 });
}
