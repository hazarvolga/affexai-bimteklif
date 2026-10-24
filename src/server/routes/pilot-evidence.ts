import type { Express, NextFunction, Request, RequestHandler, Response } from "express";
import { consumeRateLimit } from "../auth/security";
import { authenticate, checkRole, requireVerifiedEmail } from "../middleware/auth";
import { PilotEvidenceService, PilotEvidenceServiceError } from "../../services/pilot-evidence/service";

const canOperatePilot = checkRole(["owner", "admin", "manager"]);
export type PilotEvidenceRateLimiter = typeof consumeRateLimit;
function textValue(value: unknown, maxLength: number) { return typeof value === "string" ? value.trim().slice(0, maxLength) : ""; }
function parseDate(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" && !(value instanceof Date)) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}
function utcDateOnly(value: Date) { return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate())); }
function integerValue(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : undefined;
}
const actor = (req: Request) => ({ companyId: req.user.companyId, userId: req.user.userId, role: req.user.role });
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const validCaseId: RequestHandler = (req, res, next) => uuidPattern.test(req.params.id)
  ? next()
  : res.status(400).json({ error: "Geçersiz pilot case kimliği.", code: "PILOT_CASE_ID_INVALID" });
function sendServiceError(res: Response, error: PilotEvidenceServiceError) {
  return res.status(error.status).json({ error: error.message, code: error.code });
}
const handled = (handler: (req: Request, res: Response) => Promise<unknown>): RequestHandler => async (req, res, next: NextFunction) => {
  try { await handler(req, res); }
  catch (error) { if (error instanceof PilotEvidenceServiceError) sendServiceError(res, error); else next(error); }
};

export function registerPilotEvidenceRoutes(app: Express, service: PilotEvidenceService = new PilotEvidenceService(), consumePilotRateLimit: PilotEvidenceRateLimiter = consumeRateLimit) {
  const featureGateNext: RequestHandler = async (req, res, next) => {
    try {
      if (await service.isEnabled(actor(req))) return next();
      return res.status(404).json({ error: "SmartCheck pilot kapsamında etkin değil.", code: "SMARTCHECK_IMPORT_DISABLED" });
    } catch (error) { return next(error); }
  };
  const rateLimit: RequestHandler = async (req, res, next) => {
    try {
      const result = await consumePilotRateLimit(`smartcheck-pilot:${req.user.companyId}:${req.user.userId}`, 60, 60_000);
      if (!result.allowed) return res.status(429).set("Retry-After", String(result.retryAfterSeconds)).json({ error: "Çok fazla pilot ölçüm isteği." });
      return next();
    } catch (error) { return next(error); }
  };
  const readStack = [authenticate, featureGateNext, rateLimit, canOperatePilot];
  const mutateStack = [authenticate, requireVerifiedEmail, featureGateNext, rateLimit, canOperatePilot];

  app.get("/api/smartcheck/pilot-cases", ...readStack, handled(async (req, res) => { res.json(await service.list(actor(req))); }));
  app.post("/api/smartcheck/pilot-cases", ...mutateStack, handled(async (req, res) => {
    const documentId = textValue(req.body?.documentId, 80);
    const pilotId = textValue(req.body?.pilotId, 120);
    const customerReference = textValue(req.body?.customerReference, 255);
    const projectReference = textValue(req.body?.projectReference, 255);
    const discipline = textValue(req.body?.discipline, 80) || "MEP";
    const permissionReference = textValue(req.body?.permissionReference, 255);
    const permissionGrantedAt = parseDate(req.body?.permissionGrantedAt);
    const retentionUntil = parseDate(req.body?.retentionUntil);
    const expectedRowCount = integerValue(req.body?.expectedRowCount);
    const parsedWorkflowStartedAt = parseDate(req.body?.workflowStartedAt);
    if (parsedWorkflowStartedAt === undefined) return void res.status(400).json({ error: "Geçersiz workflow başlangıç zamanı." });
    const workflowStartedAt = parsedWorkflowStartedAt ?? new Date();
    if (!documentId || !pilotId || !customerReference || !projectReference || !permissionReference || !permissionGrantedAt || !retentionUntil || expectedRowCount === undefined) return void res.status(400).json({ error: "Pilot kimliği, kaynak doküman, izin, retention ve beklenen satır sayısı zorunludur." });
    if (expectedRowCount <= 0) return void res.status(400).json({ error: "Beklenen satır sayısı sıfırdan büyük olmalıdır." });
    const today = utcDateOnly(new Date());
    const permissionDate = utcDateOnly(permissionGrantedAt);
    const retentionDate = utcDateOnly(retentionUntil);
    if (permissionDate > today) return void res.status(400).json({ error: "İzin tarihi gelecekte olamaz." });
    if (retentionDate < permissionDate) return void res.status(400).json({ error: "Retention tarihi izin tarihinden önce olamaz." });
    if (retentionDate < today) return void res.status(400).json({ error: "Retention tarihi pilot kabul tarihini kapsamalıdır." });
    res.status(201).json(await service.create(actor(req), { documentId, pilotId, customerReference, projectReference, discipline, permissionReference, permissionGrantedAt, retentionUntil, expectedRowCount, workflowStartedAt }));
  }));
  app.get("/api/smartcheck/pilot-cases/:id", ...readStack, validCaseId, handled(async (req, res) => { res.json(await service.detail(actor(req), req.params.id)); }));
  app.post("/api/smartcheck/pilot-cases/:id/measure", ...mutateStack, validCaseId, handled(async (req, res) => {
    const measurementKey = textValue(req.body?.measurementKey, 120);
    if (!measurementKey) return void res.status(400).json({ error: "measurementKey zorunludur.", code: "MEASUREMENT_KEY_REQUIRED" });
    const requestedCompletion = parseDate(req.body?.workflowCompletedAt);
    if (requestedCompletion === undefined) return void res.status(400).json({ error: "Geçersiz workflow tamamlanma zamanı." });
    const complete = req.body?.complete === true;
    res.status(201).json(await service.measure(actor(req), req.params.id, { measurementKey, complete, notes: textValue(req.body?.notes, 2000) || null, workflowCompletedAt: requestedCompletion }));
  }));
  app.patch("/api/smartcheck/pilot-cases/:id/review", ...mutateStack, validCaseId, handled(async (req, res) => {
    const decision = textValue(req.body?.decision, 30);
    if (decision !== "approved" && decision !== "rejected" && decision !== "accepted_exception") return void res.status(400).json({ error: "Reviewer kararı approved, rejected veya accepted_exception olabilir." });
    const notes = textValue(req.body?.notes, 2000) || null;
    if ((decision === "rejected" || decision === "accepted_exception") && !notes) return void res.status(400).json({ error: "Red veya istisna kararında gerekçe zorunludur." });
    res.json(await service.review(actor(req), req.params.id, { decision, notes }));
  }));
  app.get("/api/smartcheck/pilot-metrics", ...readStack, handled(async (req, res) => { res.json(await service.metrics(actor(req))); }));
}
