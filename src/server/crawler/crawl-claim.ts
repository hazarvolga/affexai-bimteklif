import { randomUUID } from 'node:crypto';
import { and, eq, gt, isNull, lt, or, sql } from 'drizzle-orm';
import { db } from '../../db';
import { pricingDataSources } from '../../db/schema';

/** A random lease token fences stale workers; database time controls expiration. */
export async function claimCrawlSource(sourceId: string): Promise<string | null> {
  const token = randomUUID();
  const rows = await db.update(pricingDataSources).set({ status: 'syncing', crawlLeaseToken: token, crawlLeaseUntil: sql`now() + interval '15 minutes'`, updatedAt: new Date() })
    .where(and(eq(pricingDataSources.id, sourceId), or(eq(pricingDataSources.status, 'active'), and(eq(pricingDataSources.status, 'syncing'), or(isNull(pricingDataSources.crawlLeaseUntil), lt(pricingDataSources.crawlLeaseUntil, sql`now()`))))))
    .returning({ id: pricingDataSources.id });
  return rows.length === 1 ? token : null;
}

/** A stale owner may neither release nor replace a later owner's lease. */
export async function releaseCrawlSource(sourceId: string, token: string): Promise<void> {
  await db.update(pricingDataSources).set({ status: 'active', crawlLeaseToken: null, crawlLeaseUntil: null, updatedAt: new Date() })
    .where(and(eq(pricingDataSources.id, sourceId), eq(pricingDataSources.status, 'syncing'), eq(pricingDataSources.crawlLeaseToken, token), gt(pricingDataSources.crawlLeaseUntil, sql`now()`)));
}
