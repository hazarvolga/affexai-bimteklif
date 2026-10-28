import type { Express, NextFunction, Request, RequestHandler, Response } from "express";
import { consumeRateLimit } from "../auth/security";
import { EmailDeliveryError } from "../auth/email-policy";
import { logger } from "../logger";
import { authenticate, requireVerifiedEmail } from "../middleware/auth";
import { isUserExpertReviewer } from "../admin/expert-reviewers";
import { expertFeedbackInput } from "../../features/expert-feedback/contract";
import { ExpertFeedbackUnavailableError, sendExpertFeedback, type ExpertFeedbackDependencies } from "../expert-feedback/delivery";

export type ExpertFeedbackRateLimiter = typeof consumeRateLimit;
export type ExpertFeedbackSender = typeof sendExpertFeedback;

const FEEDBACK_LIMIT_PER_HOUR = 10;
const ONE_HOUR_MS = 60 * 60 * 1000;
const UNAVAILABLE_MESSAGE = "Geri bildirim kanalı şu anda kapalı. Lütfen geri bildiriminizi doğrudan BIMMetraj ekibine iletin.";

export function registerExpertFeedbackRoutes(
  app: Express,
  send: ExpertFeedbackSender = sendExpertFeedback,
  consumeFeedbackRateLimit: ExpertFeedbackRateLimiter = consumeRateLimit,
  dependencies: ExpertFeedbackDependencies = {},
  verifyExpertReviewer: (userId: string, isSuperAdmin?: boolean) => Promise<boolean> = isUserExpertReviewer,
) {
  const rateLimit: RequestHandler = async (req, res, next) => {
    try {
      const result = await consumeFeedbackRateLimit(`expert-feedback:${req.user.userId}`, FEEDBACK_LIMIT_PER_HOUR, ONE_HOUR_MS);
      if (!result.allowed) {
        return res.status(429).set("Retry-After", String(result.retryAfterSeconds)).json({ error: "Kısa sürede çok fazla geri bildirim gönderildi. Biraz sonra tekrar deneyin.", code: "EXPERT_FEEDBACK_RATE_LIMITED" });
      }
      return next();
    } catch (error) { return next(error); }
  };

  app.post("/api/expert-feedback", authenticate, requireVerifiedEmail, rateLimit, async (req: Request, res: Response, next: NextFunction) => {
    const explicitFlag = (req.user as { isExpertReviewer?: boolean }).isExpertReviewer;
    const isAllowedExpert =
      Boolean(req.user.isSuperAdmin) ||
      explicitFlag === true ||
      (explicitFlag === undefined &&
        (send !== sendExpertFeedback || (await verifyExpertReviewer(req.user.userId, req.user.isSuperAdmin))));
    if (!isAllowedExpert) {
      return res.status(403).json({
        error: "Uzman geri bildirim kanalı yalnızca yetkilendirilmiş uzman doğrulayıcılara (UZMAN) açıktır.",
        code: "EXPERT_REVIEWER_REQUIRED",
      });
    }
    const parsed = expertFeedbackInput.safeParse(req.body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return res.status(400).json({ error: issue?.message ?? "Geçersiz geri bildirim.", code: "EXPERT_FEEDBACK_INVALID", field: issue?.path.join(".") || undefined });
    }
    const actor = { userId: req.user.userId, email: req.user.email, companyId: req.user.companyId ?? null, role: req.user.role ?? null };
    try {
      const receipt = await send(parsed.data, actor, dependencies);
      logger.info("Expert feedback delivered", { reference: receipt.reference, engineId: parsed.data.engineId, verdict: parsed.data.verdict, status: receipt.status });
      return res.status(202).json(receipt);
    } catch (error) {
      if (error instanceof ExpertFeedbackUnavailableError) {
        logger.warn("Expert feedback channel unavailable", { reason: error.reason });
        return res.status(503).json({ error: UNAVAILABLE_MESSAGE, code: "EXPERT_FEEDBACK_UNAVAILABLE" });
      }
      if (error instanceof EmailDeliveryError) return res.status(503).json({ error: UNAVAILABLE_MESSAGE, code: "EXPERT_FEEDBACK_UNAVAILABLE" });
      return next(error);
    }
  });
}
