import { and, eq, sql } from "drizzle-orm";
import { db } from "../../db";
import { subscriptions, plans, usageRecords, usageLogs } from "../../db/schema";

export const usageTracker = (feature: string) => async (req: any, res: any, next: any) => {
  try {
    const { companyId, userId } = req.user;

    const [subData] = await db.execute(sql`
      SELECT s.id, p.monthly_quote_limit, s.bonus_quote_limit
      FROM subscriptions s
      LEFT JOIN plans p ON p.id = s.plan_id
      WHERE s.company_id = ${companyId}
    `);

    const limit = subData ? (Number(subData.monthly_quote_limit || 15) + Number(subData.bonus_quote_limit || 0)) : 15;

    if (feature === "QUOTATION_CREATED") {
      const currentPeriod = new Date().toISOString().slice(0, 7);
      
      const [usageData] = await db.execute(sql`
        SELECT quote_count FROM usage_records 
        WHERE company_id = ${companyId} AND period = ${currentPeriod}
      `);
      
      const currentCount = Number(usageData?.quote_count || 0);

      if (currentCount >= limit) {
        return res.status(403).json({
          error: "Quota Exceeded",
          message: `Aylık teklif kotanız (${limit}) doldu. Lütfen paketinizi yükseltin.`,
          limit,
          current: currentCount
        });
      }

      res.on("finish", async () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const [updated] = await db.execute(sql`
            UPDATE usage_records 
            SET quote_count = quote_count + 1 
            WHERE company_id = ${companyId} AND period = ${currentPeriod}
            RETURNING id
          `);
          if (!updated) {
            await db.execute(sql`
              INSERT INTO usage_records (company_id, period, quote_count)
              VALUES (${companyId}, ${currentPeriod}, 1)
            `);
          }
        }
      });
    }

    res.on("finish", async () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        await db.insert(usageLogs).values({
          companyId,
          userId,
          feature,
          count: 1,
          costEstimate: "0"
        });
      }
    });

    next();
  } catch (error) {
    next();
  }
};

// Geçmişe dönük uyumluluk için PLAN_LIMITS dışa aktarımı
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
