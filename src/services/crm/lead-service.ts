import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import type pg from "pg";
import { pool } from "../../db";
import * as schema from "../../db/schema";
import { leads } from "../../db/schema";
import { withTenantTransaction, type TenantContext } from "../../db/tenant-context";
import { reserveFeatureUsageInTransaction } from "../billing/feature-quota";

export type LeadActor = TenantContext;
export type LeadCreateInput = Readonly<{ name: string; email?: string | null; phone?: string | null; source?: string | null; notes?: string | null }>;
export type LeadPagination = Readonly<{ limit: number; offset: number }>;
export type CrmLeadTenantTransactionRunner = <T>(database: pg.Pool, context: TenantContext, work: (client: pg.PoolClient) => Promise<T>) => Promise<T>;

const selection = {
  id: leads.id, name: leads.name, email: leads.email, phone: leads.phone, source: leads.source,
  status: leads.status, notes: leads.notes, createdAt: leads.createdAt, updatedAt: leads.updatedAt,
};

export class CrmLeadService {
  constructor(private readonly database: pg.Pool = pool, private readonly tenantTransaction: CrmLeadTenantTransactionRunner = withTenantTransaction) {}

  async list(actor: LeadActor, pagination: LeadPagination) {
    return this.tenantTransaction(this.database, actor, async client => {
      const tx = drizzle(client, { schema });
      return tx.select(selection).from(leads)
        .where(eq(leads.companyId, actor.companyId))
        .orderBy(desc(leads.createdAt), desc(leads.id))
        .limit(pagination.limit).offset(pagination.offset);
    });
  }

  async create(actor: LeadActor, input: LeadCreateInput) {
    return this.tenantTransaction(this.database, actor, async client => {
      const tx = drizzle(client, { schema });
      await reserveFeatureUsageInTransaction(tx, actor.companyId, actor.userId, "CRM_ACTION_EXECUTED");
      const [created] = await tx.insert(leads).values({
        companyId: actor.companyId, name: input.name, email: input.email ?? null,
        phone: input.phone ?? null, source: input.source ?? null, notes: input.notes ?? null, status: "new",
      }).returning(selection);
      if (!created) throw new Error("Lead creation returned no row");
      return created;
    });
  }
}
