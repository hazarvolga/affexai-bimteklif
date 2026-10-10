import type { Express } from "express";
import { authenticate, checkSuperAdmin } from "../middleware/auth";
import { pilotService, ApiError } from "../../services/pilot/PilotService";
import { pilotRepository } from "../../services/pilot/PilotRepository";
import { consumeRateLimit } from "../auth/security";


function clean(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function errorHandler(error: unknown, res: any) {
  if (error instanceof ApiError) {
    return res.status(error.statusCode).json({ error: error.message });
  }
  console.error('Unexpected error:', error);
  return res.status(500).json({ error: 'Internal server error' });
}

export function registerPilotRoutes(app: Express) {
  app.get("/api/pilot-applications/metrics", authenticate, checkSuperAdmin(), async (_req, res) => {
    try {
      const metrics = await pilotRepository.getMetrics();
      return res.json(metrics);
    } catch (error) {
      return errorHandler(error, res);
    }
  });

  app.get("/api/pilot-applications", authenticate, checkSuperAdmin(), async (_req, res) => {
    try {
      const applications = await pilotRepository.findAll();
      return res.json(applications);
    } catch (error) {
      return errorHandler(error, res);
    }
  });

  app.patch("/api/pilot-applications/:id", authenticate, checkSuperAdmin(), async (req, res) => {
    try {
      const status = req.body?.status ? clean(req.body.status, 30) : undefined;
      const paymentStatus = req.body?.paymentStatus ? clean(req.body.paymentStatus, 30) : undefined;
      const offerAmount = req.body?.offerAmount ? clean(req.body.offerAmount, 30) : undefined;

      const application = await pilotService.updateApplication(req.params.id, { status, paymentStatus, offerAmount });
      return res.json(application);
    } catch (error) {
      return errorHandler(error, res);
    }
  });

  app.post("/api/pilot-applications/:id/convert", authenticate, checkSuperAdmin(), async (req, res) => {
    try {
      const result = await pilotService.convertToTenant(req.params.id);
      return res.status(201).json(result);
    } catch (error) {
      return errorHandler(error, res);
    }
  });

  app.post("/api/pilot-applications", async (req, res) => {

    try {
      const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";

      const rate = await consumeRateLimit(`pilot-app:${ip}`, 5, 3600_000);
      if (!rate.allowed) {
        return res.status(429).set("Retry-After", String(rate.retryAfterSeconds)).json({ error: "Çok fazla başvuru yapıldı. Lütfen daha sonra tekrar deneyin." });
      }

      const fullName = clean(req.body?.fullName, 120);
      const companyName = clean(req.body?.companyName, 160);
      const email = clean(req.body?.email, 240).toLowerCase();
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!fullName || !companyName || !email || !emailRegex.test(email)) {
        throw new ApiError(400, "Eksik veya geçersiz bilgi.");
      }
      
      const application = await pilotRepository.create({ fullName, companyName, email });
      return res.status(201).json(application);
    } catch (error) {
      return errorHandler(error, res);
    }
  });
}

