import { and, eq, sql } from "drizzle-orm";
import { db } from "../../db";
import { subscriptions, usageAlerts, usageLogs } from "../../db/schema";

export const PLAN_LIMITS = {
  starter: {
    AI_QUOTATION_GENERATED: 20,
    PDF_GENERATED: 20,
    QUOTATION_CREATED: 20,
    CRM_ACTION_EXECUTED: 100,
    REGULATION_CHECK_RUN: 50,
    PROFIT_ANALYSIS_RUN: 50
  },
  pro: {
    AI_QUOTATION_GENERATED: 500,
    PDF_GENERATED: 999999,
    QUOTATION_CREATED: 5000,
    CRM_ACTION_EXECUTED: 50000,
    REGULATION_CHECK_RUN: 1000,
    PROFIT_ANALYSIS_RUN: 1000
  },
  elite: {
    AI_QUOTATION_GENERATED: 5000,
    PDF_GENERATED: 999999,
    QUOTATION_CREATED: 999999,
    CRM_ACTION_EXECUTED: 999999,
    REGULATION_CHECK_RUN: 5000,
    PROFIT_ANALYSIS_RUN: 5000
  },
  enterprise: {
    AI_QUOTATION_GENERATED: 999999,
    PDF_GENERATED: 999999,
    QUOTATION_CREATED: 999999,
    CRM_ACTION_EXECUTED: 999999,
    REGULATION_CHECK_RUN: 999999,
    PROFIT_ANALYSIS_RUN: 999999
  }
};

export const usageTracker = (feature: string) => async (req: any, res: any, next: any) => {
  try {
    const { companyId, userId } = req.user;

    const sub = await db.query.subscriptions.findFirst({ where: eq(subscriptions.companyId, companyId) });
    const plan = (sub?.plan || "starter") as keyof typeof PLAN_LIMITS;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const usage = await db.select({ count: sql<number>`sum(${usageLogs.count})` })
      .from(usageLogs)
      .where(and(
        eq(usageLogs.companyId, companyId),
        eq(usageLogs.feature, feature),
        sql`${usageLogs.date} >= ${startOfMonth}`
      ));

    const currentCount = Number(usage[0]?.count || 0);
    const limit = PLAN_LIMITS[plan][feature as keyof typeof PLAN_LIMITS["starter"]];

    if (currentCount >= limit) {
      return res.status(403).json({
        error: "Quota Exceeded",
        message: `Monthly ${feature} limit reached for ${plan.toUpperCase()} plan. Please upgrade to continue.`,
        limit,
        current: currentCount
      });
    }

    if (currentCount >= limit * 0.8 && currentCount < limit * 0.82) {
      await db.insert(usageAlerts).values({
        companyId,
        type: "quota_80",
        message: `Your ${feature} usage has reached 80% of your current plan limit.`
      }).onConflictDoNothing();
    }

    res.on("finish", async () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        let costEstimate = "0";
        switch (feature) {
          case "AI_QUOTATION_GENERATED": costEstimate = "0.05"; break;
          case "PDF_GENERATED": costEstimate = "0.01"; break;
          case "QUOTATION_CREATED": costEstimate = "0.005"; break;
          case "CRM_ACTION_EXECUTED": costEstimate = "0.002"; break;
          case "REGULATION_CHECK_RUN": costEstimate = "0.01"; break;
          case "PROFIT_ANALYSIS_RUN": costEstimate = "0.02"; break;
        }

        await db.insert(usageLogs).values({
          companyId,
          userId,
          feature,
          count: 1,
          costEstimate
        });
      }
    });

    next();
  } catch (error) {
    next();
  }
};
