import crypto from 'crypto';

export type AcademyPaymentEventType = 'academy.purchase.completed' | 'academy.purchase.refunded';

export interface AcademyPaymentEvent {
  eventId: string;
  type: AcademyPaymentEventType;
  provider: string;
  companyId: string;
  userId: string;
  paymentReference: string;
  accessEndsAt?: string | null;
}

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const token = /^[a-z0-9][a-z0-9._:-]{0,199}$/i;
const unsafeSecretValues = new Set(['change-me', 'changeme', 'secret', 'replace-me', 'your-secret']);

export function isAcademyPaymentWebhookSecretConfigured(secret: string | undefined): boolean {
  const value = secret?.trim() ?? '';
  return Buffer.byteLength(value, 'utf8') >= 32 && !unsafeSecretValues.has(value.toLocaleLowerCase('en-US'));
}

export function parseAcademyPaymentEvent(value: unknown): AcademyPaymentEvent | null {
  if (!value || typeof value !== 'object') return null;
  const event = value as Record<string, unknown>;
  if (!token.test(String(event.eventId ?? '')) || !['academy.purchase.completed', 'academy.purchase.refunded'].includes(String(event.type ?? '')) || !token.test(String(event.provider ?? '')) || !uuid.test(String(event.companyId ?? '')) || !uuid.test(String(event.userId ?? '')) || !token.test(String(event.paymentReference ?? ''))) return null;
  if (event.accessEndsAt !== undefined && event.accessEndsAt !== null) {
    const endsAt = new Date(String(event.accessEndsAt));
    if (!Number.isFinite(endsAt.getTime())) return null;
  }
  const parsed: AcademyPaymentEvent = {
    eventId: String(event.eventId),
    type: event.type as AcademyPaymentEventType,
    provider: String(event.provider).toLocaleLowerCase('en-US'),
    companyId: String(event.companyId),
    userId: String(event.userId),
    paymentReference: String(event.paymentReference),
  };
  if (event.accessEndsAt !== undefined) parsed.accessEndsAt = event.accessEndsAt === null ? null : String(event.accessEndsAt);
  return parsed;
}

export function verifyAcademyPaymentSignature(rawBody: Buffer, signatureHeader: string | undefined, secret: string, nowSeconds = Math.floor(Date.now() / 1000)): boolean {
  if (!rawBody.length || !isAcademyPaymentWebhookSecretConfigured(secret) || !signatureHeader) return false;
  const parts: Record<string, string> = {};
  for (const segment of signatureHeader.split(',')) {
    const match = /^([a-z0-9]+)=([^=]+)$/i.exec(segment.trim());
    if (!match || !['t', 'v1'].includes(match[1]) || parts[match[1]] !== undefined) return false;
    parts[match[1]] = match[2];
  }
  if (Object.keys(parts).length !== 2) return false;
  const timestamp = Number(parts.t);
  const supplied = parts.v1;
  if (!Number.isInteger(timestamp) || Math.abs(nowSeconds - timestamp) > 300 || !/^[a-f0-9]{64}$/i.test(supplied ?? '')) return false;
  const expected = crypto.createHmac('sha256', secret).update(`${timestamp}.`).update(rawBody).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(supplied, 'hex'));
}
