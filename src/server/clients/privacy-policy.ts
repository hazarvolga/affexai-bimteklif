export type PrivacyStatus = 'active' | 'requested' | 'hold' | 'masked';
export type PrivacyAction = 'request' | 'hold' | 'release' | 'mask';
/** `hold` records a human review decision, not an automated legal-retention determination. */
export function privacyTransition(status: PrivacyStatus, action: PrivacyAction): PrivacyStatus {
  if (action === 'request' && (status === 'active' || status === 'requested')) return 'requested';
  if (action === 'hold' && (status === 'requested' || status === 'hold')) return 'hold';
  if (action === 'release' && status === 'hold') return 'requested';
  if (action === 'mask' && (status === 'requested' || status === 'masked')) return 'masked';
  throw new Error('CLIENT_PRIVACY_CONFLICT');
}
