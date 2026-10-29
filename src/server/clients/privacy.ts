import { and, eq, sql } from 'drizzle-orm';
import { withAppTenant } from '../../db/app-tenant';
import { clients, smartcheckAuditLogs } from '../../db/schema';
import type { TenantContext } from '../../db/tenant-context';
import { privacyTransition, type PrivacyAction, type PrivacyStatus } from './privacy-policy';

type Actor = TenantContext & { impersonatedBy: string | null };
/** Called only after request authentication; actor must never be taken from the body. */
export async function changeClientPrivacy(actor: Actor, clientId: string, action: PrivacyAction) {
  if (actor.impersonatedBy) throw new Error('CLIENT_PRIVACY_FORBIDDEN');
  return withAppTenant(actor, async tx => {
    const permitted = await tx.execute<{ permitted: boolean }>(sql`select public.bimmetraj_lock_price_reviewer(${actor.userId}::uuid, ${actor.companyId}::uuid) as permitted`);
    if (!permitted.rows[0]?.permitted) throw new Error('CLIENT_PRIVACY_FORBIDDEN');
    const [client] = await tx.select().from(clients).where(and(eq(clients.id, clientId), eq(clients.companyId, actor.companyId))).for('update');
    if (!client) return null;
    const next = privacyTransition(client.privacyStatus as PrivacyStatus, action);
    if (next === client.privacyStatus) return { status: next, maskedAt: client.privacyMaskedAt };
    const maskedAt = next === 'masked' ? new Date() : null;
    await tx.update(clients).set(next === 'masked' ? {
      privacyStatus: next, privacyMaskedAt: maskedAt, name: 'Maskelenmiş müşteri', phone: null, email: null, address: null, notes: null,
    } : { privacyStatus: next }).where(and(eq(clients.id, clientId), eq(clients.companyId, actor.companyId)));
    // Do not log name, contact information, notes, or hashes of personal data.
    await tx.insert(smartcheckAuditLogs).values({ companyId: actor.companyId, userId: actor.userId, entityType: 'client', entityId: clientId,
      action: `client.privacy_${action}`, metadataJson: { beforeStatus: client.privacyStatus, afterStatus: next } });
    return { status: next, maskedAt };
  });
}
