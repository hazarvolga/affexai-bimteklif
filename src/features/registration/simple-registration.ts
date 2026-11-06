/**
 * Request body for the plain registration page used while REGISTER_PLAN_PICKER_ENABLED is false.
 * It never names a plan, so /api/auth/register opens only the default subscription and creates
 * no payment order. Field names match the original Register page.
 */
export interface SimpleRegistrationFields {
  email: string;
  password: string;
  fullName: string;
  companyName: string;
  termsAccepted: boolean;
  privacyAccepted: boolean;
  marketingConsent: boolean;
  /** Honeypot; humans leave it empty. */
  website: string;
  formStartedAt: number;
}

export interface SimpleRegistrationPayload extends SimpleRegistrationFields {
  intent: 'workspace';
  selectedBillingCycle: 'monthly';
}

export function buildSimpleRegistrationPayload(fields: Readonly<SimpleRegistrationFields>): SimpleRegistrationPayload {
  return {
    email: fields.email,
    password: fields.password,
    fullName: fields.fullName,
    companyName: fields.companyName,
    termsAccepted: fields.termsAccepted,
    privacyAccepted: fields.privacyAccepted,
    marketingConsent: fields.marketingConsent,
    website: fields.website,
    formStartedAt: fields.formStartedAt,
    intent: 'workspace',
    selectedBillingCycle: 'monthly',
  };
}
