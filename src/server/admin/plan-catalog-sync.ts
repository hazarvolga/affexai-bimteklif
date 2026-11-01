import { eq } from "drizzle-orm";
import { getControlDatabase } from "../../db/control-plane";
import { adminAuditLogs, plans } from "../../db/schema";
import { planCatalogChanges, PLAN_CATALOG_VERSION, type CatalogPlan } from "../../services/billing/plan-catalog";

/** Adds missing catalog plans and fills empty columns; existing panel values stay untouched. */
export async function syncPlanCatalog(adminId: string) {
  return getControlDatabase().db.transaction(async (tx) => {
    const rows = await tx.select().from(plans).for("update");
    const changes = planCatalogChanges(rows as CatalogPlan[]);
    if (changes.insert.length) await tx.insert(plans).values(changes.insert).onConflictDoNothing({ target: plans.id });
    for (const plan of changes.limitUpdates) {
      await tx.update(plans).set({
        monthlyAiLimit: plan.monthlyAiLimit,
        monthlyPdfLimit: plan.monthlyPdfLimit,
        monthlyCrmLimit: plan.monthlyCrmLimit,
        monthlyRegulationLimit: plan.monthlyRegulationLimit,
        monthlyProfitAnalysisLimit: plan.monthlyProfitAnalysisLimit,
        storageMaxBytes: plan.storageMaxBytes,
        maxDocuments: plan.maxDocuments,
      }).where(eq(plans.id, plan.id));
    }
    for (const plan of changes.presentationUpdates) {
      await tx.update(plans).set({ marketingBadge: plan.marketingBadge, marketingDescription: plan.marketingDescription }).where(eq(plans.id, plan.id));
    }
    await tx.insert(adminAuditLogs).values({
      adminId,
      action: "plan_catalog.synced",
      details: {
        version: PLAN_CATALOG_VERSION,
        insertedPlanIds: changes.insert.map(plan => plan.id),
        limitBackfilledPlanIds: changes.limitUpdates.map(plan => plan.id),
        presentationBackfilledPlanIds: changes.presentationUpdates.map(plan => plan.id),
        preserved: changes.preserved,
      },
    });
    return {
      version: PLAN_CATALOG_VERSION,
      inserted: changes.insert.length,
      limitBackfilled: changes.limitUpdates.length,
      presentationBackfilled: changes.presentationUpdates.length,
      preserved: changes.preserved,
    };
  });
}
