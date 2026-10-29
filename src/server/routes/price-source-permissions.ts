import type { Express, RequestHandler } from 'express';
import { and, asc, eq, gt, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db';
import { tenantOf, withAppTenant } from '../../db/app-tenant';
import { priceSources, pricingDataSources } from '../../db/schema';
import { consumeRateLimit } from '../auth/security';
import { authenticate, checkRole, checkSuperAdmin, requireVerifiedEmail } from '../middleware/auth';
import { captureError } from '../observability/error-tracking';
import { parseSourceReviewEvidence } from '../pricing/source-review-policy';
import { reviewGlobalPriceSource, reviewTenantPriceSource } from '../pricing/source-review';

const input = z.discriminatedUnion('action', [
  z.strictObject({ action: z.literal('verify'), reference: z.string().max(2048), scope: z.string().max(2000), allowsQuotations: z.literal(true) }),
  z.strictObject({ action: z.literal('revoke') }),
]);
const noImpersonation: RequestHandler = (req, res, next) => req.user.impersonatedBy ? res.status(403).json({ error: 'Temsil oturumunda izin incelemesi yapılamaz.', code: 'IMPERSONATION_FORBIDDEN' }) : next();
const limit: RequestHandler = async (req, res, next) => {
  const result = await consumeRateLimit(`source-permission:${req.user.userId}`, 60, 60_000);
  return result.allowed ? next() : res.status(429).set('Retry-After', String(result.retryAfterSeconds)).json({ error: 'Çok fazla izin inceleme isteği.' });
};
const publicReview = (source: typeof priceSources.$inferSelect | typeof pricingDataSources.$inferSelect) => ({
  id: source.id, name: source.name, reviewStatus: source.reviewStatus,
  reviewEvidenceReference: source.reviewEvidenceReference, reviewScope: source.reviewScope,
  reviewAllowsQuotations: source.reviewAllowsQuotations, reviewedByUserId: source.reviewedByUserId,
  reviewedAt: source.reviewedAt,
});

export function registerPriceSourcePermissionRoutes(app: Express): void {
  const tenantStack = [authenticate, requireVerifiedEmail, noImpersonation, checkRole(['owner', 'admin']), limit];
  const globalStack = [authenticate, requireVerifiedEmail, noImpersonation, checkSuperAdmin(), limit];
  // A separate cursor endpoint preserves the legacy /sources array contract.
  app.get('/api/pricing/source-permission-reviews', ...tenantStack, async (req, res) => {
    const query = z.object({ q: z.string().trim().max(100).optional(), cursor: z.string().uuid().optional() }).strict().safeParse(req.query);
    if (!query.success) return res.status(400).json({ error: 'Geçersiz arama veya sayfa bilgisi.' });
    try {
      const { q, cursor } = query.data;
      const rows = await withAppTenant(tenantOf(req.user), tx => tx.select({ id: priceSources.id, name: priceSources.name, reviewStatus: priceSources.reviewStatus })
        .from(priceSources).where(and(eq(priceSources.companyId, req.user.companyId), cursor ? gt(priceSources.id, cursor) : undefined,
          q ? sql`position(lower(${q}) in lower(${priceSources.name} || ' ' || coalesce(${priceSources.sourceDocumentIdentifier}, ''))) > 0` : undefined))
        .orderBy(asc(priceSources.id)).limit(31), { readOnly: true });
      const page = rows.slice(0, 30);
      return res.json({ items: page, nextCursor: rows.length > 30 ? page.at(-1)!.id : null });
    } catch (error) { captureError(error, { area: 'source-permission', action: 'list' }); return res.status(500).json({ error: 'Fiyat kaynakları yüklenemedi.' }); }
  });
  for (const mode of ['tenant', 'global'] as const) {
    const base = mode === 'tenant' ? '/api/pricing/sources/:id/permission-review' : '/api/admin/pricing-sources/:id/permission-review';
    const stack = mode === 'tenant' ? tenantStack : globalStack;
    app.get(base, ...stack, async (req, res) => {
      if (!z.string().uuid().safeParse(req.params.id).success) return res.status(400).json({ error: 'Geçersiz kaynak kimliği.' });
      try {
        const [source] = mode === 'tenant'
          ? await withAppTenant(tenantOf(req.user), tx => tx.select().from(priceSources).where(and(eq(priceSources.id, req.params.id), eq(priceSources.companyId, req.user.companyId))))
          : await db.select().from(pricingDataSources).where(eq(pricingDataSources.id, req.params.id));
        if (!source) return res.status(404).json({ error: 'Kaynak bulunamadı.' });
        return res.json(publicReview(source));
      } catch (error) { captureError(error, { area: 'source-permission', action: 'read' }); return res.status(500).json({ error: 'İzin incelemesi yüklenemedi.' }); }
    });
    app.patch(base, ...stack, async (req, res) => {
      if (!z.string().uuid().safeParse(req.params.id).success) return res.status(400).json({ error: 'Geçersiz kaynak kimliği.' });
      const parsed = input.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: 'Geçerli inceleme kararı ve teklif kullanım izni gereklidir.' });
      let change: { action: 'verify'; evidence: ReturnType<typeof parseSourceReviewEvidence> } | { action: 'revoke' };
      try { change = parsed.data.action === 'verify' ? { action: 'verify', evidence: parseSourceReviewEvidence(parsed.data) } : { action: 'revoke' }; }
      catch { return res.status(400).json({ error: 'Sorgu parametresi içermeyen HTTPS belge bağlantısı ve kullanım kapsamı gereklidir.' }); }
      try {
        const actor = { userId: req.user.userId, impersonatedBy: req.user.impersonatedBy ?? null };
        const found = mode === 'tenant' ? await reviewTenantPriceSource({ ...tenantOf(req.user), ...actor }, req.params.id, change) : await reviewGlobalPriceSource(actor, req.params.id, change);
        return found ? res.json({ success: true }) : res.status(404).json({ error: 'Kaynak bulunamadı.' });
      } catch (error) {
        if (error instanceof Error && error.message === 'PRICE_SOURCE_REVIEW_FORBIDDEN') return res.status(403).json({ error: 'İzin incelemesi için yetkiniz yok.' });
        captureError(error, { area: 'source-permission', action: change.action }); return res.status(500).json({ error: 'İzin incelemesi kaydedilemedi.' });
      }
    });
  }
}
