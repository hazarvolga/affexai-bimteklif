export type RegistrationIntent = 'workspace' | 'academy';

export interface RegistrationInput {
  email: string;
  password: string;
  fullName: string;
  companyName: string;
  intent: RegistrationIntent;
  termsAccepted: boolean;
  privacyAccepted: boolean;
  marketingConsent: boolean;
  acquisitionId: string | null;
}

export const ACADEMY_TERMS_VERSION = '2026-07-22';
export const ACADEMY_PRIVACY_VERSION = '2026-07-22';
export const ACADEMY_MARKETING_VERSION = '2026-07-22';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseRegistrationInput(value: unknown): RegistrationInput | null {
  if (!value || typeof value !== 'object') return null;
  const body = value as Record<string, unknown>;
  if (body.intent !== undefined && body.intent !== 'workspace' && body.intent !== 'academy') return null;
  const intent: RegistrationIntent = body.intent === 'academy' ? 'academy' : 'workspace';
  const email = typeof body.email === 'string' ? body.email.trim().toLocaleLowerCase('en-US') : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const fullName = typeof body.fullName === 'string' ? body.fullName.trim().replace(/\s+/g, ' ') : '';
  const submittedCompanyName = typeof body.companyName === 'string' ? body.companyName.trim().replace(/\s+/g, ' ') : '';
  const honeypot = typeof body.website === 'string' ? body.website.trim() : '';
  const formStartedAt = typeof body.formStartedAt === 'number' ? body.formStartedAt : 0;
  const acquisitionId = typeof body.acquisitionId === 'string' && /^[a-zA-Z0-9_-]{12,80}$/.test(body.acquisitionId) ? body.acquisitionId : null;
  if (honeypot) return null;
  if (formStartedAt && (Date.now() - formStartedAt < 1200 || Date.now() - formStartedAt > 2 * 60 * 60 * 1000)) return null;
  if (email.length > 254 || !emailPattern.test(email)) return null;
  if (password.length < 8 || password.length > 128) return null;
  if (fullName.length < 2 || fullName.length > 120) return null;
  if (submittedCompanyName.length > 160 || (intent === 'workspace' && submittedCompanyName.length < 2)) return null;
  if (body.termsAccepted !== true || body.privacyAccepted !== true) return null;
  return {
    email,
    password,
    fullName,
    companyName: submittedCompanyName || `${fullName} Academy`,
    intent,
    termsAccepted: true,
    privacyAccepted: true,
    marketingConsent: body.marketingConsent === true,
    acquisitionId,
  };
}

export const PLATFORM_SUPER_ADMIN_EMAILS = Object.freeze(['hazarvolga@gmail.com'] as const);

export function isPlatformSuperAdminEmail(email: unknown): boolean {
  if (typeof email !== 'string') return false;
  const normalized = email.trim().toLocaleLowerCase('en-US');
  if (!normalized) return false;
  return PLATFORM_SUPER_ADMIN_EMAILS.includes(normalized as (typeof PLATFORM_SUPER_ADMIN_EMAILS)[number]);
}

export function publicRegisteredUser<T extends { id: unknown; email: unknown; fullName: unknown; createdAt: unknown; emailVerified?: unknown; isSuperAdmin?: unknown }>(user: T) {
  return { id: user.id, email: user.email, fullName: user.fullName, emailVerified: user.emailVerified ?? null, createdAt: user.createdAt, isSuperAdmin: user.isSuperAdmin ?? false };
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseSelectedPlanId(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null;
  const raw = (value as Record<string, unknown>).selectedPlanId ?? (value as Record<string, unknown>).planId;
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return uuidPattern.test(trimmed) ? trimmed : null;
}

