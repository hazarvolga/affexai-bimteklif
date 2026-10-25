import type { Express, RequestHandler, Response } from 'express';
import { z } from 'zod';
import { tenantOf } from '../../db/app-tenant';
import { authenticate } from '../middleware/auth';
import { editManualQuotation, editQuotationInput, loadEditableQuotation } from '../../services/quotations/edit';
import { QuotationIntegrityError } from '../../services/quotations/integrity';

function editError(error: unknown, res: Response) {
  if (error instanceof QuotationIntegrityError) return res.status(error.status).json({ error: error.message });
  return res.status(500).json({ error: 'Teklif düzenlemesi tamamlanamadı. Değişiklikler kaydedilmedi.' });
}

export function registerQuotationEditRoutes(app: Express, canMutate: RequestHandler) {
  app.get('/api/quotations/:id/edit', authenticate, canMutate, async (req, res) => {
    if (!z.string().uuid().safeParse(req.params.id).success) return res.status(400).json({ error: 'Geçersiz teklif.' });
    try {
      res.json(await loadEditableQuotation(tenantOf(req.user), req.params.id));
    } catch (error) { editError(error, res); }
  });
  app.patch('/api/quotations/:id/edit', authenticate, canMutate, async (req, res) => {
    const parsed = editQuotationInput.safeParse(req.body);
    if (!parsed.success || !z.string().uuid().safeParse(req.params.id).success) {
      return res.status(400).json({ error: 'Teklif alanlarını kontrol edin.' });
    }
    try {
      res.json(await editManualQuotation(tenantOf(req.user), req.params.id, parsed.data));
    } catch (error) { editError(error, res); }
  });
}
