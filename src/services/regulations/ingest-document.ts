import { createHash } from 'node:crypto';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '../../db';
import { sourceIntelligenceAdapters, sourceIngestionRuns, sourceIngestionArtifacts, sourceReviewItems, smartcheckAuditLogs } from '../../db/schema';
import type { OfficialRegulationDocument } from './official-document';

/** Freshly fetched text enters the existing tenant review pipeline, never canonical rules. */
export async function ingestRegulationDocument(companyId: string, userId: string, document: OfficialRegulationDocument) {
  const runKey = createHash('sha256').update(`official-document-v1:${companyId}:${document.sourceUrl}:${document.sourceHash}`).digest('hex');
  return db.transaction(async tx => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${companyId}), hashtext('regulation-document-ingest'))`);
    let [adapter] = await tx.select().from(sourceIntelligenceAdapters).where(and(eq(sourceIntelligenceAdapters.companyId,companyId),eq(sourceIntelligenceAdapters.adapterKey,'resmi_gazete')));
    if (!adapter) [adapter] = await tx.insert(sourceIntelligenceAdapters).values({ companyId, adapterKey:'resmi_gazete', sourceKind:'regulation', displayName:'Resmî Gazete', authority:'Türkiye Cumhuriyeti Resmî Gazete', sourceUrl:'https://www.resmigazete.gov.tr', allowedHost:'www.resmigazete.gov.tr', cadence:'manual', createdByUserId:userId, configurationJson:{ licenseStatus:'unknown', ingestionMode:'official-html-document' } }).returning();
    if (!adapter.enabled) throw new Error('REGULATION_SOURCE_DISABLED');
    const [existing] = await tx.select().from(sourceIngestionRuns).where(and(eq(sourceIngestionRuns.companyId,companyId),eq(sourceIngestionRuns.runKey,runKey)));
    if (existing) return { idempotent:true, runId:existing.id, count:0, status:existing.status, sourceUrl:document.sourceUrl, sourceHash:document.sourceHash };
    const now = new Date();
    const [run] = await tx.insert(sourceIngestionRuns).values({ companyId, adapterId:adapter.id, runKey, sourceDocumentIdentifier:document.sourceDocumentIdentifier, sourceUrl:document.sourceUrl, status:'awaiting_review', sourceHash:document.sourceHash, parserVersion:'official-html-v1', httpStatus:200, requestedByUserId:userId, fetchedAt:new Date(document.fetchedAt), completedAt:now }).returning();
    await tx.insert(sourceIngestionArtifacts).values({ companyId, ingestionRunId:run.id, artifactType:'raw', storageKey:`source-intelligence/${companyId}/${run.id}/raw.html`, contentType:'text/html', checksumSha256:document.sourceHash, sizeBytes:Buffer.byteLength(document.rawHtml), payloadJson:{ html:document.rawHtml, sourceUrl:document.sourceUrl, fetchedAt:document.fetchedAt, licenseStatus:document.licenseStatus } });
    const payload = { sourceDocumentIdentifier:document.sourceDocumentIdentifier, publishedAt:document.publishedAt, sourceVersion:null, entries:[], changes:[document.change], licenseStatus:document.licenseStatus, extractionMode:'source-excerpt', applicabilityVerified:false };
    const serialized = JSON.stringify(payload);
    const [artifact] = await tx.insert(sourceIngestionArtifacts).values({ companyId, ingestionRunId:run.id, artifactType:'normalized', storageKey:`source-intelligence/${companyId}/${run.id}/normalized.json`, contentType:'application/json', checksumSha256:createHash('sha256').update(serialized).digest('hex'), sizeBytes:Buffer.byteLength(serialized), payloadJson:payload }).returning();
    await tx.insert(sourceReviewItems).values({ companyId, ingestionRunId:run.id, artifactId:artifact.id, itemType:'regulation_diff', title:document.change.title, rationale:'Resmî HTML belgesinden alıntı. Lisans durumu bilinmiyor; kapsam, yürürlük ve teklif etkisi doğrulanmadı. İnsan incelemesi gerekiyor.', proposedPayloadJson:payload });
    await tx.update(sourceIntelligenceAdapters).set({ lastRunAt:now, lastSuccessAt:now, lastSourceHash:document.sourceHash, lastErrorCode:null, lastErrorMessage:null, updatedAt:now }).where(and(eq(sourceIntelligenceAdapters.companyId,companyId),eq(sourceIntelligenceAdapters.id,adapter.id)));
    await tx.insert(smartcheckAuditLogs).values({ companyId, userId, action:'regulation_document_fetched', entityType:'source_ingestion_run', entityId:run.id, metadataJson:{ sourceUrl:document.sourceUrl, sourceHash:document.sourceHash, canonicalPromotion:false, licenseStatus:document.licenseStatus } });
    return { idempotent:false, runId:run.id, count:1, status:'awaiting_review', sourceUrl:document.sourceUrl, sourceHash:document.sourceHash };
  });
}
