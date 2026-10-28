import { and, eq } from 'drizzle-orm';
import { lockCompanyQuota, lockCompanyQuotas } from '../../services/billing/company-quota-lock';
import type { z } from 'zod';
import { getControlDatabase } from '../../db/control-plane';
import { adminAuditLogs, companies, memberships, plans, subscriptions } from '../../db/schema';
import { EXPERT_GRANTED_ACTION, EXPERT_REVOKED_ACTION, isUserExpertReviewer } from './expert-reviewers';
import type { createPlanInput, updateCompanyAdminInput, updatePlanInput, updateSubscriptionInput, updateTenantMemberAdminInput } from './input';

export class AdminChangeError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}

export async function createPlan(adminId: string, input: z.infer<typeof createPlanInput>) {
  return getControlDatabase().db.transaction(async tx => {
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
      monthlyAiLimit: input.monthlyAiLimit,
      monthlyPdfLimit: input.monthlyPdfLimit,
      monthlyCrmLimit: input.monthlyCrmLimit,
      monthlyRegulationLimit: input.monthlyRegulationLimit,
      monthlyProfitAnalysisLimit: input.monthlyProfitAnalysisLimit,
      storageMaxBytes: input.storageMaxBytes,
      maxDocuments: input.maxDocuments,
      isTrial: input.isTrial,
    }).returning();
    await tx.insert(adminAuditLogs).values({ adminId, action: 'plan.created', details: { before: null, after } });
    return after;
  });
}

export async function updatePlan(adminId: string, id: string, input: z.infer<typeof updatePlanInput>) {
  return getControlDatabase().db.transaction(async tx => {
    const [before] = await tx.select().from(plans).where(eq(plans.id, id)).for('update');
    if (!before) throw new AdminChangeError(404, 'Plan not found');

    const { replacementPlanId, ...planUpdates } = input;
    const isDeactivating = planUpdates.isActive === false && before.isActive === true;
    const isActivating = planUpdates.isActive === true && (!before.isActive || !before.isPublished);

    if (isDeactivating && planUpdates.isPublished === undefined) {
      planUpdates.isPublished = false;
    } else if (isActivating && planUpdates.isPublished === undefined) {
      planUpdates.isPublished = true;
    }

    const existingSubscriptions =
      isDeactivating || replacementPlanId
        ? await tx.select().from(subscriptions).where(eq(subscriptions.planId, id)).for('update')
        : [];
    // Quota consumers hold the per-company advisory lock; take it before moving their plan.
    await lockCompanyQuotas(tx, existingSubscriptions.map(subscription => subscription.companyId));

    let migratedCompanyIds: string[] = [];

    if (existingSubscriptions.length > 0 && isDeactivating && !replacementPlanId) {
      throw new AdminChangeError(
        409,
        'Bu paketi kullanan aktif firmalar var. Paketi tamamen pasife almak için mevcut firmaların aktarılacağı alternatif bir aktif paket seçmelisiniz.'
      );
    }

    if (replacementPlanId) {
      if (replacementPlanId === id) {
        throw new AdminChangeError(400, 'Alternatif paket kendisi olamaz.');
      }
      const [replacementPlan] = await tx
        .select()
        .from(plans)
        .where(and(eq(plans.id, replacementPlanId), eq(plans.isActive, true)))
        .for('share');
      if (!replacementPlan) {
        throw new AdminChangeError(400, 'Seçilen alternatif paket aktif olmalıdır.');
      }

      if (existingSubscriptions.length > 0) {
        const now = new Date();
        await tx
          .update(subscriptions)
          .set({ planId: replacementPlanId, updatedAt: now })
          .where(eq(subscriptions.planId, id));
        migratedCompanyIds = existingSubscriptions.map(s => s.companyId);
      }
    }

    const [after] =
      Object.keys(planUpdates).length > 0
        ? await tx.update(plans).set(planUpdates).where(eq(plans.id, id)).returning()
        : [before];

    await tx.insert(adminAuditLogs).values({
      adminId,
      action: 'plan.updated',
      details: {
        before,
        after,
        ...(replacementPlanId
          ? { replacementPlanId, migratedCompanyIds, migratedCount: migratedCompanyIds.length }
          : {}),
      },
    });
    return {
      ...after,
      ...(replacementPlanId
        ? {
            replacementPlanId,
            migratedCompanyIds,
            migratedCount: migratedCompanyIds.length,
          }
        : {}),
    };
  });
}

export async function updateSubscription(adminId: string, companyId: string, input: z.infer<typeof updateSubscriptionInput>) {
  return getControlDatabase().db.transaction(async tx => {
    await lockCompanyQuota(tx, companyId);
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
  return getControlDatabase().db.transaction(async tx => {
    await lockCompanyQuota(tx, companyId);
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

export async function updateTenantMemberAdmin(
  adminId: string,
  companyId: string,
  userId: string,
  input: z.infer<typeof updateTenantMemberAdminInput>,
) {
  return getControlDatabase().db.transaction(async tx => {
    const [membership] = await tx
      .select()
      .from(memberships)
      .where(and(eq(memberships.companyId, companyId), eq(memberships.userId, userId)))
      .for('update');

    if (!membership) {
      throw new AdminChangeError(404, 'Firma kullanıcısı bulunamadı');
    }

    let nextRole = membership.role;
    if (input.role !== undefined && input.role !== membership.role) {
      if (membership.role === 'owner' && input.role !== 'owner') {
        const owners = await tx
          .select({ id: memberships.id })
          .from(memberships)
          .where(and(eq(memberships.companyId, companyId), eq(memberships.role, 'owner')));
        if (owners.length <= 1) {
          throw new AdminChangeError(
            400,
            'Firmanın tek sahibi (OWNER) başka bir role düşürülemez. Uzman yetkisi vermek için yanındaki UZMAN anahtarını kullanın.',
          );
        }
      }

      await tx
        .update(memberships)
        .set({ role: input.role })
        .where(eq(memberships.id, membership.id));

      nextRole = input.role;
      await tx.insert(adminAuditLogs).values({
        adminId,
        targetCompanyId: companyId,
        action: 'member.role_updated',
        details: {
          targetUserId: userId,
          companyId,
          beforeRole: membership.role,
          afterRole: input.role,
        },
      });
    }

    if (input.isExpertReviewer !== undefined) {
      await tx.insert(adminAuditLogs).values({
        adminId,
        targetCompanyId: companyId,
        action: input.isExpertReviewer ? EXPERT_GRANTED_ACTION : EXPERT_REVOKED_ACTION,
        details: {
          targetUserId: userId,
          companyId,
          isExpertReviewer: input.isExpertReviewer,
        },
      });
    }

    const isExpertReviewer =
      input.isExpertReviewer !== undefined
        ? input.isExpertReviewer
        : await isUserExpertReviewer(userId);

    return {
      userId,
      companyId,
      role: nextRole,
      isExpertReviewer,
    };
  });
}

