import type { Express, Request, RequestHandler, Response } from 'express';
import { z } from 'zod';
import { tenantOf } from '../../db/app-tenant';
import { authenticate } from '../middleware/auth';
import { editManualQuotation, editQuotationInput, loadEditableQuotation } from '../../services/quotations/edit';
import { QuotationIntegrityError } from '../../services/quotations/integrity';
import { captureError, hashReportingIdentifier, sanitizeErrorForReporting } from '../observability/error-tracking';

function editError(error: unknown, req: Request, res: Response) {
  if (error instanceof QuotationIntegrityError) return res.status(error.status).json({ error: error.message });
  const safeError = sanitizeErrorForReporting(error);
  const context = { area: 'quotation-edit', method: req.method, tenant: hashReportingIdentifier(req.user?.companyId),
    actor: hashReportingIdentifier(req.user?.userId), quotation: hashReportingIdentifier(req.params.id) };
  console.error('Quotation edit failed:', safeError, context);
  captureError(safeError, context);
  return res.status(500).json({ error: 'Teklif düzenlemesi tamamlanamadı. Değişiklikler kaydedilmedi.' });
}

export function registerQuotationEditRoutes(app: Express, canMutate: RequestHandler) {
  app.get('/api/quotations/:id/edit', authenticate, canMutate, async (req, res) => {
    if (!z.string().uuid().safeParse(req.params.id).success) return res.status(400).json({ error: 'Geçersiz teklif.' });
    try {
      res.json(await loadEditableQuotation(tenantOf(req.user), req.params.id));
    } catch (error) { editError(error, req, res); }
  });
  app.patch('/api/quotations/:id/edit', authenticate, canMutate, async (req, res) => {
    const parsed = editQuotationInput.safeParse(req.body);
    if (!parsed.success || !z.string().uuid().safeParse(req.params.id).success) {
      return res.status(400).json({ error: 'Teklif alanlarını kontrol edin.' });
    }
    try {
      res.json(await editManualQuotation(tenantOf(req.user), req.params.id, parsed.data, { impersonatedBy: req.user.impersonatedBy }));
    } catch (error) { editError(error, req, res); }
  });
}
