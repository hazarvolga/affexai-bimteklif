import type { Express, RequestHandler } from "express";
import { db } from "../../db";
import { consumeBrowserIfcAnalysis, QuotaError } from "../../services/billing/quota";
import { fetchTenantIfcLimits, IfcLimitsUnavailableError, IfcNotAvailableError } from "../../smartcheck/import/config";
import { authenticate, requireVerifiedEmail } from "../middleware/auth";

export function registerIfcBrowserAnalysisRoutes(app: Express, canMutate: RequestHandler) {
  // The file never leaves the browser; this only books one IFC analysis against the package.
  app.post("/api/ifc/browser-analyses", authenticate, requireVerifiedEmail, canMutate, async (req, res) => {
    try {
      const usage = await db.transaction(async tx => {
        const limits = await fetchTenantIfcLimits(req.user.companyId, tx);
        return consumeBrowserIfcAnalysis(tx, req.user.companyId, limits.monthlyLimit);
      });
      return res.json(usage);
    } catch (error) {
      if (error instanceof QuotaError) return res.status(error.status).json({ error: error.message, code: error.code, ...error.details });
      if (error instanceof IfcNotAvailableError || error instanceof IfcLimitsUnavailableError) {
        return res.status(error.status).json({ error: error.message, code: error.code });
      }
      return res.status(503).json({ error: "IFC quota is temporarily unavailable", code: "IFC_QUOTA_UNAVAILABLE" });
    }
  });
}
