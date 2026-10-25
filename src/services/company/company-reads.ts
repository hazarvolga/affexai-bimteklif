import { eq } from "drizzle-orm";
import { withAppTenant } from "../../db/app-tenant";
import { companies } from "../../db/schema";
import type { TenantContext } from "../../db/tenant-context";

/** Fields a workspace may see about its own company in the shell; nothing else leaves the server. */
export const COMPANY_SUMMARY_COLUMNS = { id: true, name: true, logoUrl: true, defaultCurrency: true, defaultVatRate: true } as const;

/**
 * Company reads for workspace requests. companies is FORCE RLS, so every read runs in the
 * caller's tenant context and can only ever return the caller's own company.
 */
export const companyReads = {
  findSummary(actor: TenantContext) {
    return withAppTenant(actor, (tenantDb) => tenantDb.query.companies.findFirst({
      where: eq(companies.id, actor.companyId),
      columns: COMPANY_SUMMARY_COLUMNS,
    }));
  },
  findFull(actor: TenantContext) {
    return withAppTenant(actor, (tenantDb) => tenantDb.query.companies.findFirst({ where: eq(companies.id, actor.companyId) }));
  },
};
