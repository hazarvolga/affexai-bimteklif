import type { Express, RequestHandler } from 'express';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { getControlDatabase } from '../../db/control-plane';
import { authenticate, checkSuperAdmin } from '../middleware/auth';

const positionSchema = z.object({
  at: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}$/).refine(value => {
    const date = new Date(`${value}Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 19) === value.slice(0, 19);
  }),
  id: z.string().uuid(),
}).strict();
type AuditQuery = { limit: number; cursor?: z.infer<typeof positionSchema> };

export function parseAuditQuery(query: unknown): AuditQuery {
  const input = z.object({ limit: z.string().regex(/^[1-9]\d{0,2}$/).optional(), cursor: z.string().min(1).max(512).optional() }).strict().parse(query);
  const limit = Number(input.limit ?? 25);
  if (limit > 100) throw new Error('Invalid audit page size');
  if (!input.cursor) return { limit };
  const decoded = Buffer.from(input.cursor, 'base64url');
  if (decoded.toString('base64url') !== input.cursor) throw new Error('Invalid audit cursor');
  return { limit, cursor: positionSchema.parse(JSON.parse(decoded.toString('utf8'))) };
}

const detailFields = {
  id: z.string().uuid(), planId: z.string().uuid().nullable(), companyId: z.string().uuid(),
  monthlyQuoteLimit: z.number().int().safe(), monthlyPrice: z.number().int().safe(), bonusQuoteLimit: z.number().int().safe(),
  isActive: z.boolean(), status: z.enum(['active', 'past_due', 'canceled', 'trialing', 'unpaid', 'incomplete', 'incomplete_expired', 'paused']),
  plan: z.enum(['starter', 'professional', 'enterprise']), billingCycle: z.enum(['monthly', 'yearly']),
};
type SafeSnapshot = Record<string, string | number | boolean | null>;

function safeSnapshot(value: unknown): SafeSnapshot | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return Object.fromEntries(Object.entries(detailFields).flatMap(([key, validator]) => {
    const parsed = validator.safeParse((value as Record<string, unknown>)[key]);
    return parsed.success ? [[key, parsed.data]] : [];
  }));
}

export function safeAuditDetails(value: unknown) {
  const details = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return { before: safeSnapshot(details.before), after: safeSnapshot(details.after) };
}

/** Unknown event names are retained only when they look like bounded machine codes. */
export function safeAuditAction(value: unknown): string {
  return typeof value === 'string' && /^[a-z][a-z0-9_]*(?:[._-][a-z0-9_]+)*$/.test(value) && value.length <= 80 && !/(?:secret|password|token|cookie|bearer|iban|api_key|sk_live|sk_test)/i.test(value) ? value : 'other';
}

export function safeAuditTarget(value: unknown, action?: string): { type: string; id: string } | null {
  const object = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
  if (action === 'plan.created' || action === 'plan.updated') {
    const plan = safeSnapshot(object.after);
    if (typeof plan?.id === 'string') return { type: 'plan', id: plan.id };
  }
  for (const [key, type] of [['newRunId', 'run'], ['runId', 'run'], ['requestId', 'payment'], ['stagingId', 'staging'], ['sourceId', 'source'], ['targetUserId', 'user'], ['documentId', 'document']] as const) {
    const id = z.string().uuid().safeParse(object[key]);
    if (id.success) return { type, id: id.data };
  }
  return null;
}

function safeDisplayName(value: unknown): string | null {
  return typeof value === 'string' && value.trim() && value.length <= 160 && !/[\u0000-\u001f\u007f]/.test(value) ? value.trim() : null;
}

interface AuditRow { id: string; adminId: string; targetCompanyId: string | null; action: string; createdAt: string; details: unknown; actorName?: string | null; companyName?: string | null }
export interface AuditItem extends Omit<AuditRow, 'details'> { details: ReturnType<typeof safeAuditDetails>; target: ReturnType<typeof safeAuditTarget> }
export interface AuditPage { items: AuditItem[]; nextCursor: string | null }

async function readAuditRows({ limit, cursor }: AuditQuery): Promise<AuditRow[]> {
  // Preserve PostgreSQL microseconds in the keyset; JS Date would lose precision.
  const where = cursor ? sql`where (a.created_at,a.id) < (${cursor.at}::timestamp,${cursor.id}::uuid)` : sql``;
  const result = await getControlDatabase().db.execute<any>(sql`
    select a.id, a.admin_id as "adminId", a.target_company_id as "targetCompanyId", a.action, a.details,
      u.full_name as "actorName", c.name as "companyName", to_char(a.created_at,'YYYY-MM-DD"T"HH24:MI:SS.US') as "createdAt"
    from admin_audit_logs a left join users u on u.id = a.admin_id left join companies c on c.id = a.target_company_id
    ${where} order by a.created_at desc,a.id desc limit ${limit + 1}`);
  return result.rows;
}

export function registerAdminLogRoutes(app: Express, dependencies: { authenticate?: RequestHandler; read?: typeof readAuditRows } = {}) {
  app.get('/api/admin/logs', dependencies.authenticate ?? authenticate, checkSuperAdmin(), async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    let query: AuditQuery;
    try { query = parseAuditQuery(req.query); }
    catch { return res.status(400).json({ error: 'Invalid audit pagination' }); }
    try {
      const rows = await (dependencies.read ?? readAuditRows)(query);
      const visible = rows.slice(0, query.limit);
      const last = visible.at(-1);
      const items = visible.map((row): AuditItem => ({
        id: row.id, adminId: row.adminId, targetCompanyId: row.targetCompanyId, createdAt: row.createdAt,
        action: safeAuditAction(row.action), actorName: safeDisplayName(row.actorName), companyName: safeDisplayName(row.companyName), target: safeAuditTarget(row.details, row.action),
        details: safeAuditDetails(row.details),
      }));
      const nextCursor = rows.length > query.limit && last
        ? Buffer.from(JSON.stringify({ at: last.createdAt, id: last.id })).toString('base64url') : null;
      return res.json({ items, nextCursor } satisfies AuditPage);
    } catch {
      return res.status(500).json({ error: 'Audit logs could not be loaded' });
    }
  });
}
