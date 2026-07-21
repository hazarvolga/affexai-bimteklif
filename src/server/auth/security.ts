import crypto from 'node:crypto';

export const hashActionToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');

export function createActionToken() {
  const token = crypto.randomBytes(32).toString('base64url');
  return { token, tokenHash: hashActionToken(token) };
}

type Bucket = { count: number; resetsAt: number };
const buckets = new Map<string, Bucket>();

export function consumeRateLimit(key: string, limit: number, windowMs: number, now = Date.now()) {
  const current = buckets.get(key);
  if (!current || current.resetsAt <= now) {
    buckets.set(key, { count: 1, resetsAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }
  if (current.count >= limit) return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((current.resetsAt - now) / 1000)) };
  current.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

export function clientAddress(req: { ip?: string; socket?: { remoteAddress?: string | null } }) {
  return req.ip || req.socket?.remoteAddress || 'unknown';
}
