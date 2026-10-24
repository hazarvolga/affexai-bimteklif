import { readFileSync } from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import * as Sentry from '@sentry/node';
import type { ErrorEvent } from '@sentry/node';

export type ServiceName = 'app' | 'worker' | 'ifc-worker';

const SAFE_HEADERS = new Set(['user-agent', 'x-request-id', 'content-type', 'content-length']);
let enabled = false;

const SAFE_ERROR_CODE = /^[A-Z0-9_]{2,64}$/i;

/** Keep SQL text, bound values, row details and nested causes out of reporting sinks. */
export function sanitizeErrorForReporting(error: unknown): Readonly<{ name: string; code?: string }> {
  const candidate = error && typeof error === 'object' ? error as Record<string, unknown> : undefined;
  const name = typeof candidate?.name === 'string' && candidate.name.length <= 64
    ? candidate.name
    : 'Error';
  const code = typeof candidate?.code === 'string' && SAFE_ERROR_CODE.test(candidate.code)
    ? candidate.code
    : undefined;
  return code ? Object.freeze({ name, code }) : Object.freeze({ name });
}

/** Hash request/actor correlation values before they become telemetry tags. */
export function hashReportingIdentifier(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length === 0) return undefined;
  return crypto.createHash('sha256').update(value).digest('hex').slice(0, 16);
}

/** The image's build stamp beats a runtime env value that can go stale between deploys (P0-4). */
export function readBuildRevision(env: Record<string, string | undefined> = process.env, file = path.resolve('dist/build-info.json')) {
  try {
    const stamp = JSON.parse(readFileSync(file, 'utf8')) as { revision?: unknown };
    if (typeof stamp.revision === 'string' && stamp.revision.trim()) return { revision: stamp.revision.trim(), revisionSource: 'build' as const };
  } catch {
    // No stamp in dev/test images; fall through to env.
  }
  return env.SOURCE_COMMIT ? { revision: env.SOURCE_COMMIT, revisionSource: 'env' as const } : { revision: null, revisionSource: null };
}

/** Strips anything that could hold credentials or personal data before an event leaves the server. */
export function scrubEvent<T extends Pick<ErrorEvent, 'request' | 'user'>>(event: T): T {
  const request = event.request && {
    ...event.request,
    url: event.request.url?.split('?')[0],
    query_string: undefined,
    cookies: undefined,
    data: undefined,
    headers: Object.fromEntries(Object.entries(event.request.headers ?? {}).filter(([name]) => SAFE_HEADERS.has(name.toLowerCase()))),
  };
  const user = event.user?.id ? { id: event.user.id } : undefined;
  return { ...event, request, user };
}

/** No-op without SENTRY_DSN, so local and CI runs never send events. */
export function initErrorTracking(service: ServiceName, env: Record<string, string | undefined> = process.env): boolean {
  if (enabled || !env.SENTRY_DSN) return enabled;
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV ?? 'development',
    release: readBuildRevision(env).revision ?? undefined,
    serverName: service,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    beforeSend: event => scrubEvent(event),
  });
  Sentry.setTag('service', service);
  enabled = true;
  return true;
}

export function captureError(error: unknown, context: Record<string, string | number | undefined> = {}): void {
  if (!enabled) return;
  Sentry.withScope(scope => {
    for (const [key, value] of Object.entries(context)) if (value !== undefined) scope.setTag(key, String(value));
    Sentry.captureException(sanitizeErrorForReporting(error));
  });
}

/** Flushes pending events before a crashing process exits. */
export async function flushErrorTracking(timeoutMs = 2000): Promise<void> {
  if (enabled) await Sentry.flush(timeoutMs);
}
