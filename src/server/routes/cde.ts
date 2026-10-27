import type { Express, Request, RequestHandler, Response } from "express";
import { z } from "zod";
import {
  assignCdeMemberSchema,
  createCdeContainerSchema,
  createCdeProjectSchema,
  createCdeRevisionSchema,
  cdeTransitionSchema,
  type CdeDiscipline,
  type CdeProjectRole,
} from "../../contracts/cde";
import type { CdeState, SuitabilityCode } from "../../smartcheck/rules/iso19650";
import { CdeServiceError, cdeService, type CdeService } from "../../services/cde/service";
import { authenticate, checkRole, requireVerifiedEmail } from "../middleware/auth";
import { consumeRateLimit } from "../auth/security";

const uuidParam = z.string().uuid();
const createProjectRole = checkRole(["owner", "admin", "manager"]);
const readRateLimit: RequestHandler = async (req, res, next) => {
  try {
    const result = await consumeRateLimit(`cde:read:${req.user.companyId}:${req.user.userId}`, 180, 60_000);
    if (!result.allowed) return res.status(429).set("Retry-After", String(result.retryAfterSeconds)).json({ error: "CDE okuma limiti aşıldı.", code: "CDE_RATE_LIMITED" });
    next();
  } catch (error) { next(error); }
};
const mutateRateLimit: RequestHandler = async (req, res, next) => {
  try {
    const result = await consumeRateLimit(`cde:mutate:${req.user.companyId}:${req.user.userId}`, 30, 60_000);
    if (!result.allowed) return res.status(429).set("Retry-After", String(result.retryAfterSeconds)).json({ error: "CDE yazma limiti aşıldı.", code: "CDE_RATE_LIMITED" });
    next();
  } catch (error) { next(error); }
};

function actor(req: Request) {
  return { companyId: req.user.companyId, userId: req.user.userId };
}

function parsed<S extends z.ZodTypeAny>(schema: S, value: unknown, res: Response): z.output<S> | undefined {
  const result = schema.safeParse(value);
  if (!result.success) {
    res.status(400).json({ error: "Geçersiz CDE isteği.", code: "CDE_VALIDATION_ERROR", issues: result.error.flatten() });
    return undefined;
  }
  return result.data;
}

function cdeError(res: Response, error: unknown) {
  if (error instanceof CdeServiceError) return res.status(error.status).json({ error: error.message, code: error.code });
  throw error;
}

export function registerCdeRoutes(app: Express, service: CdeService = cdeService) {
  app.post("/api/cde/projects", authenticate, requireVerifiedEmail, mutateRateLimit, createProjectRole, async (req, res) => {
    const input = parsed(createCdeProjectSchema, req.body, res);
    if (!input) return;
    try {
      const result = await service.createProject(actor(req), input as { documentId: string; name: string });
      res.status(result.created ? 201 : 200).json(result);
    } catch (error) { return cdeError(res, error); }
  });

  app.get("/api/cde/projects", authenticate, readRateLimit, async (req, res) => {
    const documentId = req.query.documentId === undefined ? undefined : parsed(uuidParam, req.query.documentId, res);
    if (req.query.documentId !== undefined && !documentId) return;
    try { res.json(await service.listProjects(actor(req), documentId)); }
    catch (error) { return cdeError(res, error); }
  });

  app.get("/api/cde/projects/by-document/:documentId", authenticate, readRateLimit, async (req, res) => {
    const documentId = parsed(uuidParam, req.params.documentId, res);
    if (!documentId) return;
    try { res.json(await service.projectByDocument(actor(req), documentId)); }
    catch (error) { return cdeError(res, error); }
  });

  app.post("/api/cde/projects/:projectId/members", authenticate, requireVerifiedEmail, mutateRateLimit, createProjectRole, async (req, res) => {
    const projectId = parsed(uuidParam, req.params.projectId, res);
    const input = parsed(assignCdeMemberSchema, req.body, res);
    if (!projectId || !input) return;
    try { res.json(await service.assignMember(actor(req), projectId, input as { userId: string; role: CdeProjectRole; discipline: CdeDiscipline })); }
    catch (error) { return cdeError(res, error); }
  });

  app.post("/api/cde/projects/:projectId/containers", authenticate, requireVerifiedEmail, mutateRateLimit, createProjectRole, async (req, res) => {
    const projectId = parsed(uuidParam, req.params.projectId, res);
    const input = parsed(createCdeContainerSchema, req.body, res);
    if (!projectId || !input) return;
    try {
      const result = await service.createContainer(actor(req), projectId, input as { containerCode: string; title: string });
      res.status(result.created ? 201 : 200).json(result);
    } catch (error) { return cdeError(res, error); }
  });

  app.post("/api/cde/containers/:containerId/revisions", authenticate, requireVerifiedEmail, mutateRateLimit, createProjectRole, async (req, res) => {
    const containerId = parsed(uuidParam, req.params.containerId, res);
    const input = parsed(createCdeRevisionSchema, req.body, res);
    if (!containerId || !input) return;
    try {
      const result = await service.createOrReuseRevision(actor(req), containerId, input as { revisionCode: string; processingRunId: string; resultArtifactId: string });
      res.status(result.created ? 201 : 200).json(result);
    } catch (error) { return cdeError(res, error); }
  });

  app.post("/api/cde/containers/:containerId/transitions", authenticate, requireVerifiedEmail, mutateRateLimit, createProjectRole, async (req, res) => {
    const containerId = parsed(uuidParam, req.params.containerId, res);
    const input = parsed(cdeTransitionSchema, req.body, res);
    const idempotencyKey = typeof req.header("Idempotency-Key") === "string" ? req.header("Idempotency-Key")!.trim() : "";
    if (!containerId || !input) return;
    if (!idempotencyKey || idempotencyKey.length > 160) return res.status(400).json({ error: "Idempotency-Key zorunludur.", code: "CDE_IDEMPOTENCY_KEY_REQUIRED" });
    try { res.json(await service.transition(actor(req), containerId, idempotencyKey, input as { action: "approve" | "reject" | "withdraw"; expectedVersion: number; toState?: CdeState; suitabilityCode?: SuitabilityCode; revisionCode?: string; reason?: string })); }
    catch (error) { return cdeError(res, error); }
  });

  app.get("/api/cde/containers/:containerId/history", authenticate, readRateLimit, async (req, res) => {
    const containerId = parsed(uuidParam, req.params.containerId, res);
    if (!containerId) return;
    try { res.json(await service.history(actor(req), containerId)); }
    catch (error) { return cdeError(res, error); }
  });
}
