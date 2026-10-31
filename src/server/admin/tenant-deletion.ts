import { and, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { getControlDatabase } from '../../db/control-plane';
import { withAppTenantTransaction } from '../../db/app-tenant';
import { adminAuditLogs, companies, invitations, memberships, subscriptions, usageLogs, usageRecords, users } from '../../db/schema';
import { AdminChangeError } from './changes';

const FOREIGN_KEY_VIOLATION = '23503';
const PROTECTED_RECORDS_MESSAGE = 'Bu firmanın korunan kayıtları olduğu için silinemedi.';

/** Cleared through tenant RLS as the application role. Children come first. */
const TENANT_DELETE_ORDER = [
  'activities', 'deals', 'quotation_item_evidence', 'quotation_items', 'quotations', 'clients',
  'company_industry_settings', 'usage_alerts',
] as const;
/** Have no company_id column; they belong to the company through their quotation. */
const QUOTATION_CHILD_TABLES = ['cost_components', 'quotation_financials'] as const;
/** Cleared by the control role. Every other company table blocks deletion while it has rows, so new tables stay protected. */
const CONTROL_DELETE_TABLES = ['usage_records', 'usage_logs', 'invitations', 'memberships', 'subscriptions'] as const;
const DELETABLE_TABLES: ReadonlySet<string> = new Set([...TENANT_DELETE_ORDER, ...CONTROL_DELETE_TABLES]);

export const deleteTenantInput = z.strictObject({ confirmName: z.string().min(1).max(200) });

function hasPgCode(error: unknown, code: string): boolean {
  const candidate = error as { code?: string; cause?: { code?: string } } | null;
  return candidate?.code === code || candidate?.cause?.code === code;
}

type ControlTransaction = Parameters<Parameters<ReturnType<typeof getControlDatabase>['db']['transaction']>[0]>[0];

/** Deletes an account with no remaining membership. Rows that still reference it keep the account. */
async function deleteAccountIfUnreferenced(tx: ControlTransaction, userId: string): Promise<boolean> {
  const [otherMembership] = await tx.select({ id: memberships.id }).from(memberships).where(eq(memberships.userId, userId)).limit(1);
  const [account] = await tx.select({ isSuperAdmin: users.isSuperAdmin }).from(users).where(eq(users.id, userId));
  if (otherMembership || !account || account.isSuperAdmin) return false;
  try {
    await tx.transaction(async nested => { await nested.delete(users).where(eq(users.id, userId)); });
    return true;
  } catch (error) {
    if (hasPgCode(error, FOREIGN_KEY_VIOLATION)) return false;
    throw error;
  }
}

type TenantDatabaseHandle = Parameters<Parameters<typeof withAppTenantTransaction>[1]>[0];

async function findBlockers(tx: TenantDatabaseHandle, companyId: string): Promise<Record<string, number>> {
  const tables = await tx.execute(sql`
    SELECT c.relname AS name FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_catalog.pg_attribute a ON a.attrelid = c.oid
    WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p') AND a.attname = 'company_id' AND NOT a.attisdropped
    ORDER BY c.relname`);
  const blockers: Record<string, number> = {};
  for (const { name } of tables.rows as Array<{ name: string }>) {
    if (DELETABLE_TABLES.has(name)) continue;
    const counted = await tx.execute(sql`SELECT count(*)::int AS total FROM public.${sql.identifier(name)} WHERE company_id = ${companyId}`);
    const total = (counted.rows[0] as { total: number }).total;
    if (total > 0) blockers[name] = total;
  }
  return blockers;
}

async function readCompanyName(companyId: string): Promise<string> {
  const [company] = await getControlDatabase().db.select({ name: companies.name }).from(companies).where(eq(companies.id, companyId));
  if (!company) throw new AdminChangeError(404, 'Firma bulunamadı');
  return company.name;
}

export async function previewTenantDeletion(adminId: string, companyId: string) {
  const name = await readCompanyName(companyId);
  const blockers = await withAppTenantTransaction({ companyId, userId: adminId }, tx => findBlockers(tx, companyId), { readOnly: true });
  return { name, blockers, deletable: Object.keys(blockers).length === 0 };
}

async function deleteControlPlaneRows(adminId: string, companyId: string, companyName: string) {
  return getControlDatabase().db.transaction(async tx => {
    const members = await tx.select({ userId: memberships.userId }).from(memberships).where(eq(memberships.companyId, companyId)).for('update');
    await tx.delete(usageRecords).where(eq(usageRecords.companyId, companyId));
    await tx.delete(usageLogs).where(eq(usageLogs.companyId, companyId));
    await tx.delete(invitations).where(eq(invitations.companyId, companyId));
    await tx.delete(memberships).where(eq(memberships.companyId, companyId));
    await tx.delete(subscriptions).where(eq(subscriptions.companyId, companyId));
    await tx.delete(companies).where(eq(companies.id, companyId));
    let deletedUsers = 0;
    for (const { userId } of members) {
      if (userId !== adminId && await deleteAccountIfUnreferenced(tx, userId)) deletedUsers += 1;
    }
    const retainedUsers = members.length - deletedUsers;
    await tx.insert(adminAuditLogs).values({
      adminId, action: 'tenant.deleted',
      details: { deletedCompanyId: companyId, companyName, deletedUsers, retainedUsers },
    });
    return { deletedUsers, retainedUsers };
  });
}

export async function deleteTenant(adminId: string, companyId: string, confirmName: string) {
  const name = await readCompanyName(companyId);
  if (name !== confirmName) throw new AdminChangeError(400, 'Onay için firma adını aynen yazın.');
  try {
    // Tenant tables are writable only through tenant RLS, control tables only through the control role, so this is two steps.
    await withAppTenantTransaction({ companyId, userId: adminId }, async tx => {
      const blockers = Object.keys(await findBlockers(tx, companyId));
      if (blockers.length) throw new AdminChangeError(409, `Firma silinemedi; korunan kayıtlar var: ${blockers.join(', ')}`);
      for (const table of QUOTATION_CHILD_TABLES) {
        await tx.execute(sql`DELETE FROM public.${sql.identifier(table)} WHERE quotation_id IN (SELECT id FROM public.quotations WHERE company_id = ${companyId})`);
      }
      for (const table of TENANT_DELETE_ORDER) {
        await tx.execute(sql`DELETE FROM public.${sql.identifier(table)} WHERE company_id = ${companyId}`);
      }
    });
    return await deleteControlPlaneRows(adminId, companyId, name);
  } catch (error) {
    if (hasPgCode(error, FOREIGN_KEY_VIOLATION)) throw new AdminChangeError(409, PROTECTED_RECORDS_MESSAGE);
    throw error;
  }
}

/** Removes the membership, then deletes the account when nothing else references it so its email can be reused. */
export async function removeTenantMember(adminId: string, companyId: string, userId: string) {
  if (adminId === userId) throw new AdminChangeError(400, 'Kendi hesabınızı firmadan çıkaramazsınız.');
  return getControlDatabase().db.transaction(async tx => {
    const [membership] = await tx.select().from(memberships)
      .where(and(eq(memberships.companyId, companyId), eq(memberships.userId, userId))).for('update');
    if (!membership) throw new AdminChangeError(404, 'Firma kullanıcısı bulunamadı');
    if (membership.role === 'owner') {
      const owners = await tx.select({ id: memberships.id }).from(memberships)
        .where(and(eq(memberships.companyId, companyId), eq(memberships.role, 'owner'))).for('update');
      if (owners.length <= 1) throw new AdminChangeError(400, 'Firmanın tek sahibi çıkarılamaz. Firmayı silebilir veya önce başka bir sahip atayabilirsiniz.');
    }
    await tx.delete(memberships).where(eq(memberships.id, membership.id));

    const userDeleted = await deleteAccountIfUnreferenced(tx, userId);
    await tx.insert(adminAuditLogs).values({
      adminId, targetCompanyId: companyId, action: 'member.removed',
      details: { targetUserId: userId, companyId, role: membership.role, userDeleted },
    });
    return { userDeleted };
  });
}
