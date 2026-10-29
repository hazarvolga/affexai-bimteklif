import { and, eq, isNotNull } from 'drizzle-orm';
import { getControlDatabase } from '../../db/control-plane';
import { adminMfaAccounts, users } from '../../db/schema';
import { decryptMfaSecret } from './mfa-crypto';

export function areMfaSecretsReadable(records: { userId: string; ciphertext: string | null }[], key: string): boolean {
  try {
    return records.every(record => record.ciphertext !== null && decryptMfaSecret(record.ciphertext, key, record.userId).length === 20);
  } catch { return false; }
}

export async function isMfaReady(): Promise<boolean> {
  const rows = await getControlDatabase().db.select({ userId: users.id, ciphertext: adminMfaAccounts.secretCiphertext })
    .from(users).leftJoin(adminMfaAccounts, eq(users.id, adminMfaAccounts.userId))
    .where(and(eq(users.isSuperAdmin, true), isNotNull(users.mfaEpoch)));
  return areMfaSecretsReadable(rows, process.env.MFA_ENCRYPTION_KEY || '');
}
