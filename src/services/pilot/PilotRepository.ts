import { db } from "../../db";
import { pilotApplications } from "../../db/schema";
import { eq, desc, sql } from "drizzle-orm";

export class PilotRepository {
  async findAll(limit = 100, offset = 0) {
    const safeLimit = Math.min(Math.max(limit, 1), 200);
    const safeOffset = Math.max(offset, 0);
    return await db.select().from(pilotApplications).orderBy(desc(pilotApplications.createdAt)).limit(safeLimit).offset(safeOffset);
  }

  async findById(id: string) {
    const [application] = await db.select().from(pilotApplications).where(eq(pilotApplications.id, id));
    return application || null;
  }

  async findByEmail(email: string) {
    const [application] = await db
      .select()
      .from(pilotApplications)
      .where(eq(pilotApplications.email, email.toLowerCase().trim()))
      .orderBy(desc(pilotApplications.createdAt));
    return application || null;
  }

  async updateStatus(id: string, status: string, payload: any = {}) {
    const [updated] = await db
      .update(pilotApplications)
      .set({ status, ...payload, updatedAt: new Date() })
      .where(eq(pilotApplications.id, id))
      .returning();
    return updated;
  }

  async create(data: any) {
    const [created] = await db
      .insert(pilotApplications)
      .values({
        ...data,
        consentAt: data.consentAt ?? new Date(),
      })
      .returning();
    return created;
  }

  async getMetrics() {
    const [metrics] = await db.select({
      total: sql<number>`count(*)::int`,
      converted: sql<number>`sum(case when status = 'converted' then 1 else 0 end)::int`,
      paid: sql<number>`sum(case when payment_status = 'paid' then 1 else 0 end)::int`,
      averageDaysToConvert: sql<number>`avg(case when status = 'converted' and provisioned_company_id is not null then extract(epoch from (updated_at - created_at))/86400 else null end)::int`,
      bottleneckContacted: sql<number>`sum(case when status = 'contacted' then 1 else 0 end)::int`,
      newLeads: sql<number>`sum(case when status = 'new' then 1 else 0 end)::int`
    }).from(pilotApplications);

    return {
      total: metrics.total || 0,
      converted: metrics.converted || 0,
      paid: metrics.paid || 0,
      newLeads: metrics.newLeads || 0,
      bottleneckContacted: metrics.bottleneckContacted || 0,
      conversionRate: metrics.total > 0 ? ((metrics.converted || 0) / metrics.total) * 100 : 0,
      paidRate: metrics.converted > 0 ? ((metrics.paid || 0) / metrics.converted) * 100 : 0,
      averageDaysToConvert: metrics.averageDaysToConvert || null
    };
  }
}

export const pilotRepository = new PilotRepository();
