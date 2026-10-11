import { eq, sql } from 'drizzle-orm';
import type { db } from '../../db';
import { documents } from '../../db/schema';
type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
export const UPLOAD_MAX_TTL_MS = 24 * 60 * 60 * 1000;
export const UPLOAD_CLEANUP_GRACE_MS = 60 * 60 * 1000;
export class UploadQuotaError extends Error {
  constructor(readonly code: string, readonly status = 413) { super(code); }
}
export function uploadQuotaLimits(env: Record<string, string | undefined> = process.env) {
  const integer = (raw: string | undefined, fallback: number) => {
    const value = raw === undefined ? fallback : Number(raw);
    if (!Number.isSafeInteger(value) || value <= 0) throw new UploadQuotaError('UPLOAD_QUOTA_CONFIG_INVALID', 503);
    return value;
  };
  return { maxBytes: integer(env.SMARTCHECK_TENANT_STORAGE_MAX_BYTES, 2 * 1024 ** 3),
    maxDocuments: integer(env.SMARTCHECK_TENANT_DOCUMENT_MAX_COUNT, 1000) };
}
export function checkUploadCapacity(usage: { bytes: bigint; count: bigint }, bytes: number, limits = uploadQuotaLimits()) {
  if (!Number.isSafeInteger(bytes) || bytes <= 0) throw new UploadQuotaError('FILE_SIZE_INVALID', 400);
  if (usage.bytes < 0n || usage.count < 0n) throw new UploadQuotaError('UPLOAD_QUOTA_UNAVAILABLE', 503);
  if (usage.bytes + BigInt(bytes) > BigInt(limits.maxBytes)) throw new UploadQuotaError('STORAGE_QUOTA_EXCEEDED');
  if (usage.count + 1n > BigInt(limits.maxDocuments)) throw new UploadQuotaError('DOCUMENT_QUOTA_EXCEEDED');
}
export async function lockTenantUploads(tx: Transaction, companyId: string) {
  await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${'smartcheck-upload:' + companyId}, 0))`);
}
export async function reserveUpload<T>(input: typeof documents.$inferInsert,
  createTarget: (document: typeof documents.$inferSelect) => Promise<T>) {
  const limits = uploadQuotaLimits();
  const { db } = await import('../../db');
  return db.transaction(async tx => {
    await lockTenantUploads(tx, input.companyId);
    const result = await tx.select({ bytes: sql<string>`coalesce(sum(${documents.fileSizeBytes}),0)::text`,
      count: sql<string>`count(*)::text` }).from(documents).where(eq(documents.companyId, input.companyId));
    checkUploadCapacity({ bytes: BigInt(result[0].bytes), count: BigInt(result[0].count) }, input.fileSizeBytes, limits);
    const [document] = await tx.insert(documents).values(input).returning();
    // No URL escapes to the client before commit. Target failure rolls back the reservation.
    const target = await createTarget(document);
    return { document, target };
  });
}
