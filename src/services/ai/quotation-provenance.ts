import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';

const numeric = z.union([z.number(), z.string().trim().min(1)]).pipe(z.coerce.number<string | number>().finite().nonnegative().max(1e12));
const lineSchema = z.object({ description: z.string().trim().min(1).max(1000), unit: z.string().trim().min(1).max(40), quantity: numeric, unitPrice: numeric });
const payloadSchema = z.object({ purpose: z.literal('ai-quotation-line-v1'), id: z.string().uuid(), companyId: z.string().min(1), userId: z.string().min(1), expiresAt: z.number().int(), line: lineSchema });
type Line = z.infer<typeof lineSchema>;
type Actor = { companyId: string; userId: string };
const key = (secret: string) => createHmac('sha256', secret).update('bimmetraj:ai-quotation-evidence:v1').digest();
const signature = (encoded: string, secret: string) => createHmac('sha256', key(secret)).update(encoded).digest();

export function provenanceSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (process.env.NODE_ENV === 'production' && (!secret || secret.trim().length < 32 || /^(change-me|super-secret|secret|password)/i.test(secret.trim()))) throw new Error('JWT_SECRET is not configured securely');
  return secret || 'super-secret-key-teklifpro';
}

export function signAiLine(line: unknown, actor: Actor, secret = provenanceSecret(), now = Math.floor(Date.now() / 1000)): string {
  const payload = payloadSchema.parse({ purpose: 'ai-quotation-line-v1', id: randomUUID(), ...actor, expiresAt: now + 86400, line: lineSchema.parse(line) });
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${encoded}.${signature(encoded, secret).toString('base64url')}`;
}

export function verifyAiLine(token: string, actor: Actor, secret = provenanceSecret(), now = Math.floor(Date.now() / 1000)) {
  if (token.length > 8192 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)) throw new Error('AI_EVIDENCE_INVALID');
  const [encoded, tag] = token.split('.');
  const actual = Buffer.from(tag, 'base64url');
  const expected = signature(encoded, secret);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new Error('AI_EVIDENCE_INVALID');
  const payload = payloadSchema.parse(JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')));
  if (payload.companyId !== actor.companyId || payload.userId !== actor.userId || payload.expiresAt <= now) throw new Error('AI_EVIDENCE_INVALID');
  return payload;
}

export function compareAiLine(original: Line, final: Line): Array<keyof Line> {
  return (['description', 'unit', 'quantity', 'unitPrice'] as const).filter(field => original[field] !== final[field]);
}
