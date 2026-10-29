import { and, eq, sql } from 'drizzle-orm';
import { withAppTenant } from '../../db/app-tenant';
import { db } from '../../db';
import type { TenantContext } from '../../db/tenant-context';
import { adminAuditLogs, globalPriceSourceReviewEvents, priceSources, pricingDataSources, smartcheckAuditLogs } from '../../db/schema';
import { parseSourceReviewEvidence, type SourceReviewEvidence } from './source-review-policy';

type ReviewAction = Readonly<{ action: 'verify'; evidence: SourceReviewEvidence } | { action: 'revoke' }>;
/** Obtain these values from verified authentication middleware; never from request JSON. */
export type AuthenticatedReviewer = Readonly<{ userId: string; impersonatedBy: string | null }>;
export type TenantReviewer = TenantContext & AuthenticatedReviewer;

function assertReviewer(actor: AuthenticatedReviewer): void {
  if (!actor || actor.impersonatedBy !== null) throw new Error('PRICE_SOURCE_REVIEW_FORBIDDEN');
}

type ReviewRecord = { reviewStatus: string; reviewEvidenceReference: string | null; reviewScope: string | null; reviewAllowsQuotations: boolean; reviewedByUserId: string | null; reviewedAt: Date | null };
function safeAuditRecord(record: ReviewRecord) {
  let reference: string | null = null;
  if (record.reviewEvidenceReference) {
    try { const url = new URL(record.reviewEvidenceReference); url.username = ''; url.password = ''; url.search = ''; url.hash = ''; reference = url.href; } catch { reference = '[invalid-reference]'; }
  }
  return { status: record.reviewStatus, reference, scope: record.reviewScope, allowsQuotations: record.reviewAllowsQuotations, reviewer: record.reviewedByUserId, reviewedAt: record.reviewedAt?.toISOString() ?? null };
}

/** Authenticated actor is explicit; privileges are rechecked and locked for the whole transaction. */
export async function reviewTenantPriceSource(actor: TenantReviewer, sourceId: string, change: ReviewAction): Promise<boolean> {
  assertReviewer(actor);
  const evidence = change.action === 'verify' ? parseSourceReviewEvidence(change.evidence) : null;
  return withAppTenant(actor, async tx => {
    const result = await tx.execute<{ permitted: boolean }>(sql`select public.bimmetraj_lock_price_reviewer(${actor.userId}::uuid, ${actor.companyId}::uuid) as permitted`);
    if (!result.rows[0]?.permitted) throw new Error('PRICE_SOURCE_REVIEW_FORBIDDEN');
    const [source] = await tx.select().from(priceSources)
      .where(and(eq(priceSources.id, sourceId), eq(priceSources.companyId, actor.companyId))).for('update');
    if (!source) return false;
    const now = new Date();
    const [updated] = await tx.update(priceSources).set(change.action === 'verify' && evidence ? {
      reviewStatus: 'verified', reviewEvidenceReference: evidence.reference, reviewScope: evidence.scope, reviewAllowsQuotations: true,
      reviewedByUserId: actor.userId, reviewedAt: now, updatedAt: now,
    } : { reviewStatus: 'revoked', updatedAt: now }).where(and(eq(priceSources.id, sourceId), eq(priceSources.companyId, actor.companyId))).returning();
    await tx.insert(smartcheckAuditLogs).values({ companyId: actor.companyId, userId: actor.userId, action: `price_source.review_${change.action}`, entityType: 'price_source', entityId: sourceId, metadataJson: { before: safeAuditRecord(source), after: safeAuditRecord(updated) } });
    return true;
  });
}

/** Caller must authenticate actor. Super-admin status is checked and locked inside the transaction. */
export async function reviewGlobalPriceSource(actor: AuthenticatedReviewer, sourceId: string, change: ReviewAction): Promise<boolean> {
  assertReviewer(actor);
  const evidence = change.action === 'verify' ? parseSourceReviewEvidence(change.evidence) : null;
  return db.transaction(async tx => {
    const result = await tx.execute<{ permitted: boolean }>(sql`select public.bimmetraj_lock_global_price_reviewer(${actor.userId}::uuid) as permitted`);
    if (!result.rows[0]?.permitted) throw new Error('PRICE_SOURCE_REVIEW_FORBIDDEN');
    const [source] = await tx.select().from(pricingDataSources).where(eq(pricingDataSources.id, sourceId)).for('update');
    if (!source) return false;
    const now = new Date();
    const [updated] = await tx.update(pricingDataSources).set(change.action === 'verify' && evidence ? {
      reviewStatus: 'verified', reviewEvidenceReference: evidence.reference, reviewScope: evidence.scope, reviewAllowsQuotations: true,
      reviewedByUserId: actor.userId, reviewedAt: now, updatedAt: now,
    } : { reviewStatus: 'revoked', updatedAt: now }).where(eq(pricingDataSources.id, sourceId)).returning();
    await tx.insert(globalPriceSourceReviewEvents).values({ sourceId, actorUserId: actor.userId, action: change.action, before: safeAuditRecord(source), after: safeAuditRecord(updated) });
    await tx.insert(adminAuditLogs).values({ adminId: actor.userId, action: `pricing_data_source.review_${change.action}`, details: { sourceId } });
    return true;
  });
}
