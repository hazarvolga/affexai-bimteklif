import type { Express, RequestHandler } from 'express';
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { tenantOf, withAppTenant } from '../../db/app-tenant';
import { clients } from '../../db/schema';
import { consumeRateLimit } from '../auth/security';
import { authenticate, checkRole, requireVerifiedEmail } from '../middleware/auth';
import { changeClientPrivacy } from '../clients/privacy';

const noImpersonation: RequestHandler = (req, res, next) => req.user.impersonatedBy ? res.status(403).json({ error: 'Temsil oturumunda bu işlem yapılamaz.' }) : next();
const limit: RequestHandler = async (req, res, next) => {
  const result = await consumeRateLimit(`client-privacy:${req.user.userId}`, 60, 60_000);
  return result.allowed ? next() : res.status(429).set('Retry-After', String(result.retryAfterSeconds)).json({ error: 'Çok fazla istek.' });
};
const action = z.strictObject({ action: z.enum(['request', 'hold', 'release', 'mask']) });
export function registerClientPrivacyRoutes(app: Express) {
  const stack = [authenticate, requireVerifiedEmail, noImpersonation, checkRole(['owner', 'admin']), limit];
  app.get('/api/clients/:id/privacy', ...stack, async (req, res) => {
    if (!z.string().uuid().safeParse(req.params.id).success) return res.status(400).json({ error: 'Geçersiz müşteri kimliği.' });
    try {
      const [row] = await withAppTenant(tenantOf(req.user), tx => tx.select({ status: clients.privacyStatus, maskedAt: clients.privacyMaskedAt }).from(clients)
        .where(and(eq(clients.id, req.params.id), eq(clients.companyId, req.user.companyId))), { readOnly: true });
      return row ? res.json(row) : res.status(404).json({ error: 'Müşteri bulunamadı.' });
    } catch { return res.status(500).json({ error: 'Başvuru durumu yüklenemedi.' }); }
  });
  app.post('/api/clients/:id/privacy', ...stack, async (req, res) => {
    if (!z.string().uuid().safeParse(req.params.id).success) return res.status(400).json({ error: 'Geçersiz müşteri kimliği.' });
    const parsed = action.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'Geçersiz işlem.' });
    try {
      const result = await changeClientPrivacy({ ...tenantOf(req.user), impersonatedBy: req.user.impersonatedBy ?? null }, req.params.id, parsed.data.action);
      return result ? res.json(result) : res.status(404).json({ error: 'Müşteri bulunamadı.' });
    } catch (error) {
      if (error instanceof Error && error.message === 'CLIENT_PRIVACY_CONFLICT') return res.status(409).json({ error: 'İşlem mevcut başvuru durumunda uygulanamaz.' });
      if (error instanceof Error && error.message === 'CLIENT_PRIVACY_FORBIDDEN') return res.status(403).json({ error: 'Bu işlem için yetkiniz yok.' });
      return res.status(500).json({ error: 'Müşteri veri işlemi tamamlanamadı.' });
    }
  });
}
