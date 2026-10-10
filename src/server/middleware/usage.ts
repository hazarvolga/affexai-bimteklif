import type { RequestHandler } from "express";
import { db } from "../../db";
import { checkQuotationQuota, QuotaError } from "../../services/billing/quota";
import { quotaUnavailable } from "../../services/billing/quota-policy";
import { recordUsage } from "../../services/billing/usage-audit";

export { PLAN_LIMITS } from "../../services/billing/limits";

type UsageDependencies = {
  checkQuota(companyId: string): Promise<unknown>;
  logUsage(companyId: string, userId: string, feature: string): Promise<unknown>;
};

export const createUsageTracker = (dependencies: UsageDependencies = {
  checkQuota: companyId => db.transaction(tx => checkQuotationQuota(tx, companyId)),
  logUsage: recordUsage,
}) => (feature: string): RequestHandler => async (req, res, next) => {
  try {
    const { companyId, userId } = req.user;
    // Preflight is advisory UX only; the creation transaction owns quota consumption.
    if (feature === "QUOTATION_CREATED") await dependencies.checkQuota(companyId);
    res.once("finish", () => {
      if (res.statusCode < 200 || res.statusCode >= 300) return;
      void Promise.resolve().then(() => dependencies.logUsage(companyId, userId, feature)).catch(() => {
        console.error("Usage audit persistence failed", { companyId, feature });
      });
    });
  } catch (error) {
    const failure = error instanceof QuotaError ? error : quotaUnavailable();
    res.status(failure.status).json({ error: failure.message, code: failure.code, ...failure.details });
    return;
  }
  next();
};

export const usageTracker = createUsageTracker();
