import crypto from 'node:crypto';
import { eq, lt, sql } from 'drizzle-orm';
import { db } from '../../db';
import { rateLimitBuckets } from '../../db/schema';

export const hashActionToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');
export const rateLimitStorageKey = (key: string) => crypto.createHash('sha256').update(`rate-limit:${key}`).digest('hex');

export function createActionToken() {
  const token = crypto.randomBytes(32).toString('base64url');
  return { token, tokenHash: hashActionToken(token) };
}

type Bucket = { requestCount: number; resetsAt: Date } | null;

export function nextRateLimitBucket(current: Bucket, limit: number, windowMs: number, now: Date) {
  if (!current || current.resetsAt <= now) return { requestCount: 1, resetsAt: new Date(now.getTime() + windowMs), allowed: true, retryAfterSeconds: 0 };
  const requestCount = current.requestCount + 1;
  return { requestCount, resetsAt: current.resetsAt, allowed: requestCount <= limit, retryAfterSeconds: requestCount <= limit ? 0 : Math.max(1, Math.ceil((current.resetsAt.getTime() - now.getTime()) / 1000)) };
}

export async function consumeRateLimit(key: string, limit: number, windowMs: number, now = new Date()) {
  if (!key || key.length > 500 || !Number.isInteger(limit) || limit < 1 || !Number.isInteger(windowMs) || windowMs < 1000) throw new Error('INVALID_RATE_LIMIT_CONFIG');
  const storageKey = rateLimitStorageKey(key);
  return db.transaction(async tx => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${storageKey}))`);
    const [current] = await tx.select({ requestCount: rateLimitBuckets.requestCount, resetsAt: rateLimitBuckets.resetsAt }).from(rateLimitBuckets).where(eq(rateLimitBuckets.bucketKey, storageKey));
    const next = nextRateLimitBucket(current ?? null, limit, windowMs, now);
    await tx.insert(rateLimitBuckets).values({ bucketKey: storageKey, requestCount: next.requestCount, resetsAt: next.resetsAt, updatedAt: now }).onConflictDoUpdate({ target: rateLimitBuckets.bucketKey, set: { requestCount: next.requestCount, resetsAt: next.resetsAt, updatedAt: now } });
    return { allowed: next.allowed, retryAfterSeconds: next.retryAfterSeconds };
  });
}

export async function pruneExpiredRateLimits(now = new Date()) {
  const retentionBoundary = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  await db.delete(rateLimitBuckets).where(lt(rateLimitBuckets.resetsAt, retentionBoundary));
}

export function clientAddress(req: { ip?: string; socket?: { remoteAddress?: string | null } }) {
  return req.ip || req.socket?.remoteAddress || 'unknown';
}
