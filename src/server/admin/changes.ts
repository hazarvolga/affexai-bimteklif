import { and, eq } from 'drizzle-orm';
import type { z } from 'zod';
import { db } from '../../db';
import { adminAuditLogs, companies, plans, subscriptions } from '../../db/schema';
import type { createPlanInput, updateCompanyAdminInput, updatePlanInput, updateSubscriptionInput } from './input';

export class AdminChangeError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}

export async function createPlan(adminId: string, input: z.infer<typeof createPlanInput>) {
  return db.transaction(async tx => {
    const [after] = await tx.insert(plans).values({
      name: input.name,
      monthlyQuoteLimit: input.monthlyQuoteLimit,
      monthlyPrice: input.monthlyPrice,
      monthlyIfcLimit: input.monthlyIfcLimit,
      ifcMaxFileMb: input.ifcMaxFileMb,
      ifcMaxConcurrent: input.ifcMaxConcurrent,
      isActive: input.isActive,
      isPublished: input.isPublished,
      isFeatured: input.isFeatured,
      displayOrder: input.displayOrder,
      marketingBadge: input.marketingBadge,
      marketingDescription: input.marketingDescription,
    }).returning();
    await tx.insert(adminAuditLogs).values({ adminId, action: 'plan.created', details: { before: null, after } });
    return after;
  });
}

export async function updatePlan(adminId: string, id: string, input: z.infer<typeof updatePlanInput>) {
  return db.transaction(async tx => {
    const [before] = await tx.select().from(plans).where(eq(plans.id, id)).for('update');
    if (!before) throw new AdminChangeError(404, 'Plan not found');
    const [after] = await tx.update(plans).set(input).where(eq(plans.id, id)).returning();
    await tx.insert(adminAuditLogs).values({ adminId, action: 'plan.updated', details: { before, after } });
    return after;
  });
}

export async function updateSubscription(adminId: string, companyId: string, input: z.infer<typeof updateSubscriptionInput>) {
  return db.transaction(async tx => {
    const [company] = await tx.select({ id: companies.id }).from(companies).where(eq(companies.id, companyId)).for('update');
    if (!company) throw new AdminChangeError(404, 'Company not found');
    // The company lock stabilizes this pointer without reversing plan/subscription lock order.
    const [current] = await tx.select({ planId: subscriptions.planId }).from(subscriptions).where(eq(subscriptions.companyId, companyId));
    if (input.planId && input.planId !== current?.planId) {
      const [plan] = await tx.select({ id: plans.id }).from(plans)
        .where(and(eq(plans.id, input.planId), eq(plans.isActive, true))).for('share');
      if (!plan) throw new AdminChangeError(400, 'Active plan required');
    }
    const [before] = await tx.select().from(subscriptions).where(eq(subscriptions.companyId, companyId)).for('update');
    const [after] = before
      ? await tx.update(subscriptions).set({ ...input, updatedAt: new Date() }).where(eq(subscriptions.id, before.id)).returning()
      : await tx.insert(subscriptions).values({ ...input, companyId }).returning();
    await tx.insert(adminAuditLogs).values({ adminId, targetCompanyId: companyId, action: 'subscription.updated', details: { before: before ?? null, after } });
    return after;
  });
}

export async function updateCompanyAdmin(adminId: string, companyId: string, input: z.infer<typeof updateCompanyAdminInput>) {
  return db.transaction(async tx => {
    const [before] = await tx.select().from(companies).where(eq(companies.id, companyId)).for('update');
    if (!before) throw new AdminChangeError(404, 'Company not found');
    const [after] = await tx.update(companies).set(input).where(eq(companies.id, companyId)).returning();
    await tx.insert(adminAuditLogs).values({
      adminId,
      targetCompanyId: companyId,
      action: 'company.updated',
      details: { before, after }
    });
    return after;
  });
}
