import type { Express, Request, RequestHandler, Response } from "express";
import { z } from "zod";
import {
  correctProgressPeriodSchema,
  createConstructionContractSchema,
  createProgressPeriodSchema,
  progressTransitionSchema,
  reviewProgressMeasurementsSchema,
  saveProgressDraftSchema,
} from "../../contracts/progress-payment";
import { ProgressPaymentServiceError, progressPaymentService, type ProgressPaymentService } from "../../services/progress-payments/service";
import { consumeRateLimit } from "../auth/security";
import { authenticate, checkRole, requireVerifiedEmail } from "../middleware/auth";

const uuidSchema = z.string().uuid();
const canMutate = checkRole(["owner", "admin", "manager"]);

function actor(req: Request) { return { companyId: req.user.companyId, userId: req.user.userId }; }

function featureEnabled(_req: Request, res: Response, next: () => void) {
  if (process.env.PROGRESS_PAYMENTS_ENABLED !== "true") return res.status(404).json({ error: "Hakediş pilotu etkin değil.", code: "PROGRESS_PAYMENTS_DISABLED" });
  next();
}

const readLimit: RequestHandler = async (req, res, next) => {
  try {
    const result = await consumeRateLimit(`progress:read:${req.user.companyId}:${req.user.userId}`, 120, 60_000);
    if (!result.allowed) return res.status(429).set("Retry-After", String(result.retryAfterSeconds)).json({ error: "Hakediş okuma limiti aşıldı.", code: "PROGRESS_RATE_LIMITED" });
    next();
  } catch (error) { next(error); }
};

const mutateLimit: RequestHandler = async (req, res, next) => {
  try {
    const result = await consumeRateLimit(`progress:mutate:${req.user.companyId}:${req.user.userId}`, 30, 60_000);
    if (!result.allowed) return res.status(429).set("Retry-After", String(result.retryAfterSeconds)).json({ error: "Hakediş yazma limiti aşıldı.", code: "PROGRESS_RATE_LIMITED" });
    next();
  } catch (error) { next(error); }
};

function parse<S extends z.ZodTypeAny>(schema: S, value: unknown, res: Response): z.output<S> | undefined {
  const result = schema.safeParse(value);
  if (!result.success) {
    res.status(400).json({ error: "Geçersiz hakediş isteği.", code: "PROGRESS_VALIDATION_ERROR", issues: result.error.flatten() });
    return undefined;
  }
  return result.data;
}

function handleError(res: Response, error: unknown) {
  if (error instanceof ProgressPaymentServiceError) return res.status(error.status).json({ error: error.message, code: error.code });
  throw error;
}

function idempotencyKey(req: Request, res: Response) {
  const value = req.header("Idempotency-Key")?.trim() ?? "";
  if (!value || value.length > 160) {
    res.status(400).json({ error: "Idempotency-Key zorunludur.", code: "PROGRESS_IDEMPOTENCY_KEY_REQUIRED" });
    return undefined;
  }
  return value;
}

export function registerProgressPaymentRoutes(app: Express, service: ProgressPaymentService = progressPaymentService) {
  const read = [authenticate, featureEnabled, readLimit] as const;
  const write = [authenticate, featureEnabled, requireVerifiedEmail, mutateLimit, canMutate] as const;

  app.get("/api/progress-payments/contracts", ...read, async (req, res) => {
    try { res.json(await service.list(actor(req))); } catch (error) { return handleError(res, error); }
  });
  app.post("/api/progress-payments/contracts", ...write, async (req, res) => {
    const input = parse(createConstructionContractSchema, req.body, res); if (!input) return;
    try { res.status(201).json(await service.createContract(actor(req), input)); } catch (error) { return handleError(res, error); }
  });
  app.get("/api/progress-payments/contracts/:contractId", ...read, async (req, res) => {
    const contractId = parse(uuidSchema, req.params.contractId, res); if (!contractId) return;
    try { res.json(await service.detail(actor(req), contractId)); } catch (error) { return handleError(res, error); }
  });
  app.post("/api/progress-payments/contracts/:contractId/periods", ...write, async (req, res) => {
    const contractId = parse(uuidSchema, req.params.contractId, res); const input = parse(createProgressPeriodSchema, req.body, res); if (!contractId || !input) return;
    try { res.status(201).json(await service.createPeriod(actor(req), contractId, input)); } catch (error) { return handleError(res, error); }
  });
  app.get("/api/progress-payments/periods/:periodId", ...read, async (req, res) => {
    const periodId = parse(uuidSchema, req.params.periodId, res); if (!periodId) return;
    try { res.json(await service.periodDetail(actor(req), periodId)); } catch (error) { return handleError(res, error); }
  });
  app.put("/api/progress-payments/periods/:periodId/draft", ...write, async (req, res) => {
    const periodId = parse(uuidSchema, req.params.periodId, res); const input = parse(saveProgressDraftSchema, req.body, res); if (!periodId || !input) return;
    try { res.json(await service.saveDraft(actor(req), periodId, input)); } catch (error) { return handleError(res, error); }
  });
  app.post("/api/progress-payments/periods/:periodId/measurement-reviews", ...write, async (req, res) => {
    const periodId = parse(uuidSchema, req.params.periodId, res); const input = parse(reviewProgressMeasurementsSchema, req.body, res); const key = idempotencyKey(req, res); if (!periodId || !input || !key) return;
    try { res.json(await service.reviewMeasurements(actor(req), periodId, key, input)); } catch (error) { return handleError(res, error); }
  });
  app.post("/api/progress-payments/periods/:periodId/transitions", ...write, async (req, res) => {
    const periodId = parse(uuidSchema, req.params.periodId, res); const input = parse(progressTransitionSchema, req.body, res); const key = idempotencyKey(req, res); if (!periodId || !input || !key) return;
    try { res.json(await service.transition(actor(req), periodId, key, input)); } catch (error) { return handleError(res, error); }
  });
  app.post("/api/progress-payments/periods/:periodId/corrections", ...write, async (req, res) => {
    const periodId = parse(uuidSchema, req.params.periodId, res); const input = parse(correctProgressPeriodSchema, req.body, res); const key = idempotencyKey(req, res); if (!periodId || !input || !key) return;
    try { res.status(201).json(await service.correct(actor(req), periodId, key, input.expectedVersion, input.reason)); } catch (error) { return handleError(res, error); }
  });
}
