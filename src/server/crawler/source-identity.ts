import { isDeepStrictEqual } from 'node:util';
import type { pricingDataSources } from '../../db/schema';

type Source = typeof pricingDataSources.$inferSelect;
/** Fields governing source interpretation or permission; compare while source row is locked. */
export function crawlSourceIdentity(source: Source) {
  return {
    code: source.code, name: source.name, authority: source.authority,
    sourceUrl: source.sourceUrl, category: source.category, versionTag: source.versionTag,
    currency: source.currency, countryCode: source.countryCode, crawlerConfig: source.crawlerConfig,
    authorizationStatus: source.authorizationStatus, authorizationScope: source.authorizationScope,
    authorizationEvidenceHash: source.authorizationEvidenceHash,
    reviewStatus: source.reviewStatus, reviewEvidenceReference: source.reviewEvidenceReference,
    reviewScope: source.reviewScope, reviewAllowsQuotations: source.reviewAllowsQuotations,
    reviewedByUserId: source.reviewedByUserId, reviewedAt: source.reviewedAt,
  };
}

/** Immutable source identity persisted per price observation. */
export function priceSourceIdentity(source: Pick<Source, 'code'|'name'|'authority'|'sourceUrl'|'category'|'versionTag'|'currency'|'countryCode'>) {
  return {code:source.code,name:source.name,authority:source.authority,sourceUrl:source.sourceUrl,category:source.category,versionTag:source.versionTag,currency:source.currency,countryCode:source.countryCode};
}

/** Legacy observations without a source snapshot are intentionally not selectable. */
export function priceObservationMatchesSource(row: { sourceIdentity: unknown; contentHash: string | null }, source: Parameters<typeof priceSourceIdentity>[0]) {
  return typeof row.contentHash === 'string' && /^[a-f0-9]{64}$/.test(row.contentHash) && isDeepStrictEqual(row.sourceIdentity, priceSourceIdentity(source));
}
