import type { RequestHandler } from 'express';
type Env = Record<string, string | undefined>;
const placeholder = (value: string) => /^(change-me|super-secret|secret|password)/i.test(value.trim());

export class EmailDeliveryError extends Error {
  readonly status = 503;
  constructor(public readonly code: 'EMAIL_DELIVERY_DISABLED' | 'EMAIL_DELIVERY_UNAVAILABLE') {
    super(code === 'EMAIL_DELIVERY_DISABLED'
      ? 'E-posta hizmeti henüz etkinleştirilmedi. Bu işlem şu anda kullanılamıyor.'
      : 'E-posta hizmeti geçici olarak kullanılamıyor.');
  }
}

export function validateAuthEmailEnvironment(env: Env = process.env): string[] {
  const mode = env.AUTH_EMAIL_DELIVERY_MODE ?? 'webhook';
  if (!['disabled', 'webhook'].includes(mode)) return ['AUTH_EMAIL_DELIVERY_MODE must be webhook or disabled.'];
  if (mode === 'disabled' || env.NODE_ENV !== 'production') return [];
  const errors: string[] = [];
  try {
    if (!env.AUTH_EMAIL_WEBHOOK_URL || new URL(env.AUTH_EMAIL_WEBHOOK_URL).protocol !== 'https:') throw new Error();
  } catch { errors.push('AUTH_EMAIL_WEBHOOK_URL must be an absolute HTTPS URL.'); }
  if (!env.AUTH_EMAIL_WEBHOOK_SECRET || env.AUTH_EMAIL_WEBHOOK_SECRET.length < 32 || placeholder(env.AUTH_EMAIL_WEBHOOK_SECRET)) {
    errors.push('AUTH_EMAIL_WEBHOOK_SECRET must be a non-placeholder secret of at least 32 characters.');
  }
  return errors;
}

export function assertAuthEmailAvailable(env: Env = process.env): void {
  if (env.AUTH_EMAIL_DELIVERY_MODE === 'disabled') throw new EmailDeliveryError('EMAIL_DELIVERY_DISABLED');
  if (validateAuthEmailEnvironment(env).length) throw new EmailDeliveryError('EMAIL_DELIVERY_UNAVAILABLE');
}

/** Place before rate-limit/token/user mutations on actions requiring new email. */
export const requireAuthEmailDelivery: RequestHandler = (_req, res, next) => {
  try { assertAuthEmailAvailable(); next(); }
  catch (error) {
    const failure = error instanceof EmailDeliveryError ? error : new EmailDeliveryError('EMAIL_DELIVERY_UNAVAILABLE');
    res.status(failure.status).json({ code: failure.code, error: failure.message });
  }
};
