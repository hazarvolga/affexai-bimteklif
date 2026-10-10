import crypto from "node:crypto";
import type { Request, Response, NextFunction } from "express";

const SENSITIVE_KEYS = new Set([
  "password",
  "passwordhash",
  "token",
  "refreshtoken",
  "secret",
  "authorization",
  "apikey",
  "geminiapikey",
  "openaiapikey",
  "webhooksecret",
  "jwtsecret",
  "cookie",
]);

export function redactSensitive(obj: unknown, depth = 0): unknown {
  if (depth > 5 || obj === null || obj === undefined) return obj;
  if (typeof obj === "string") return obj;
  if (Array.isArray(obj)) return obj.map((item) => redactSensitive(item, depth + 1));
  if (typeof obj === "object") {
    const redacted: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (SENSITIVE_KEYS.has(key.toLowerCase().replace(/[_-]/g, ""))) {
        redacted[key] = "[REDACTED]";
      } else {
        redacted[key] = redactSensitive(value, depth + 1);
      }
    }
    return redacted;
  }
  return obj;
}

export const logger = {
  info(msg: string, meta?: Record<string, unknown>) {
    const payload = {
      level: "info",
      timestamp: new Date().toISOString(),
      message: msg,
      ...(meta ? (redactSensitive(meta) as Record<string, unknown>) : {}),
    };
    if (process.env.NODE_ENV === "production") {
      console.log(JSON.stringify(payload));
    } else {
      console.log(`[INFO] ${msg}`, meta ? meta : "");
    }
  },
  warn(msg: string, meta?: Record<string, unknown>) {
    const payload = {
      level: "warn",
      timestamp: new Date().toISOString(),
      message: msg,
      ...(meta ? (redactSensitive(meta) as Record<string, unknown>) : {}),
    };
    if (process.env.NODE_ENV === "production") {
      console.warn(JSON.stringify(payload));
    } else {
      console.warn(`[WARN] ${msg}`, meta ? meta : "");
    }
  },
  error(msg: string, error?: unknown, meta?: Record<string, unknown>) {
    const errObj = error instanceof Error
      ? { name: error.name, message: error.message, stack: process.env.NODE_ENV === "production" ? undefined : error.stack }
      : error;
    const payload = {
      level: "error",
      timestamp: new Date().toISOString(),
      message: msg,
      error: errObj,
      ...(meta ? (redactSensitive(meta) as Record<string, unknown>) : {}),
    };
    if (process.env.NODE_ENV === "production") {
      console.error(JSON.stringify(payload));
    } else {
      console.error(`[ERROR] ${msg}`, error, meta ? meta : "");
    }
  },
};

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const reqId = (req.headers["x-request-id"] as string) || crypto.randomUUID();
  (req as any).id = reqId;
  res.setHeader("X-Request-Id", reqId);
  next();
}
