import type { RequestHandler } from "express";
import { withAppTenantTransaction } from "../../db/app-tenant";
import { checkQuotationQuota, QuotaError } from "../../services/billing/quota";
import { quotaUnavailable } from "../../services/billing/quota-policy";
import { recordUsage } from "../../services/billing/usage-audit";
import { AI_USAGE_FEATURE, reserveAiUsage } from "../../services/billing/ai-quota";
import { featureQuotaUnavailable, isMeteredFeature, type MeteredFeature } from "../../services/billing/feature-limits";
import { releaseFeatureUsage, reserveFeatureUsage, type UsageSubject } from "../../services/billing/feature-quota";
import type { Request } from "express";

export { PLAN_LIMITS } from "../../services/billing/limits";

type UsageDependencies = {
  checkQuota(companyId: string, userId: string): Promise<unknown>;
  logUsage(companyId: string, userId: string, feature: string): Promise<unknown>;
  reserveAiQuota?(companyId: string, userId: string): Promise<unknown>;
  reserveFeatureQuota?(companyId: string, userId: string, feature: MeteredFeature, subject?: UsageSubject): Promise<{ id: string; reused?: boolean }>;
  releaseFeatureQuota?(companyId: string, reservationId: string): Promise<unknown>;
};

const isSuccess = (status: number) => status >= 200 && status < 300;

/** Optional per-request subject (e.g. the quotation version a PDF is for); null skips the reservation so the route can answer 404. */
export type UsageSubjectResolver = (req: Request) => Promise<UsageSubject | null>;

export const createUsageTrackerWith = (dependencies: UsageDependencies) => (feature: string, resolveSubject?: UsageSubjectResolver): RequestHandler => async (req, res, next) => {
  try {
    const { companyId, userId } = req.user;
    // Preflight is advisory UX only; the creation transaction owns quota consumption.
    if (feature === "QUOTATION_CREATED") await dependencies.checkQuota(companyId, userId);
    if (feature === AI_USAGE_FEATURE) {
      if (!dependencies.reserveAiQuota) throw new QuotaError(503, 'AI_QUOTA_UNAVAILABLE', 'AI quota is temporarily unavailable');
      await dependencies.reserveAiQuota(companyId, userId);
    } else if (isMeteredFeature(feature)) {
      if (!dependencies.reserveFeatureQuota || !dependencies.releaseFeatureQuota) throw featureQuotaUnavailable(feature);
      const subject = resolveSubject ? await resolveSubject(req) : undefined;
      if (subject === null) {
        next();
        return;
      }
      const reservation = await dependencies.reserveFeatureQuota(companyId, userId, feature, subject);
      const release = dependencies.releaseFeatureQuota;
      // A reused reservation belongs to an earlier successful render; this request never owns it.
      if (reservation.reused) {
        next();
        return;
      }
      // The reservation is the usage event; a failed or aborted response never consumed the allowance.
      // "close" fires for both delivered and aborted responses; "finish" never fires on abort.
      res.once("close", () => {
        if (res.writableFinished && isSuccess(res.statusCode)) return;
        void Promise.resolve().then(() => release(companyId, reservation.id)).catch(() => {
          console.error("Usage reservation release failed", { companyId, feature });
        });
      });
      next();
      return;
    }
    res.once("finish", () => {
      if (feature === AI_USAGE_FEATURE) return; // Reservation is already the canonical usage event.
      if (!isSuccess(res.statusCode)) return;
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

const defaultUsageDependencies: UsageDependencies = {
  checkQuota: (companyId, userId) => withAppTenantTransaction({ companyId, userId }, tx => checkQuotationQuota(tx, companyId)),
  logUsage: recordUsage,
  reserveAiQuota: reserveAiUsage,
  reserveFeatureQuota: reserveFeatureUsage,
  releaseFeatureQuota: releaseFeatureUsage,
};

export const createUsageTracker = (dependencies: UsageDependencies = defaultUsageDependencies) => createUsageTrackerWith(dependencies);

export const usageTracker = createUsageTracker();
