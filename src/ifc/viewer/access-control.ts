import type { RequestHandler } from "express";
import { consumeRateLimit } from "../../server/auth/security";
import { createAdmission } from "../../smartcheck/import/admission";

type RateLimitConsumer = typeof consumeRateLimit;

export const acquireViewerContext = createAdmission(2);
export const acquireViewerContent = createAdmission(1);

export function createViewerAdmissionMiddleware(acquire: () => () => void): RequestHandler {
  return (_req, res, next) => {
    let release: () => void;
    try {
      release = acquire();
    } catch {
      return res.status(503).set("Retry-After", "5").json({
        error: "IFC 3B inceleme kapasitesi dolu.",
        code: "IFC_VIEWER_BUSY",
      });
    }
    let released = false;
    const releaseOnce = () => {
      if (released) return;
      released = true;
      release();
      res.off("finish", releaseOnce);
      res.off("close", releaseOnce);
    };
    res.once("finish", releaseOnce);
    res.once("close", releaseOnce);
    next();
  };
}

export function createViewerRateLimit(kind: "context" | "content", consume: RateLimitConsumer = consumeRateLimit): RequestHandler {
  const limit = kind === "context" ? 10 : 5;
  return async (req, res, next) => {
    const result = await consume(`smartcheck:viewer-${kind}:${req.user.companyId}:${req.user.userId}`, limit, 60_000);
    if (!result.allowed) {
      return res.status(429).set("Retry-After", String(result.retryAfterSeconds)).json({
        error: "IFC 3B inceleme istek sınırı aşıldı.",
        code: "IFC_VIEWER_RATE_LIMITED",
      });
    }
    next();
  };
}

export async function withViewerAdmission<T>(acquire: () => () => void, work: () => Promise<T>): Promise<T> {
  const release = acquire();
  try {
    return await work();
  } finally {
    release();
  }
}
