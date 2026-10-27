import assert from 'node:assert/strict';
import test from 'node:test';
import { usageDisplay, usageLabels } from './billing-usage';

test('quota display handles zero, null and unenforced limits without inventing alerts', () => {
  assert.deepEqual(usageDisplay({ current: 0, limit: 0, enforced: true }), { percentage: 0, limitLabel: '0', alert: 'exhausted' });
  assert.deepEqual(usageDisplay({ current: 4, limit: null, enforced: false }), { percentage: null, limitLabel: 'Belirtilmedi', alert: null });
  assert.equal(usageDisplay({ current: 90, limit: 100, enforced: false }).alert, null);
  assert.equal(usageDisplay({ current: 80, limit: 100, enforced: true }).alert, 'near');
  assert.equal(usageDisplay({ current: 120, limit: 100, enforced: true }).percentage, 100);
  assert.equal(usageDisplay({ current: 1, limit: null, enforced: true, available: false }).alert, 'unavailable');
  assert.equal(usageDisplay({ current: 1, limit: 100, enforced: true, available: false }).alert, 'unavailable');
  assert.equal(usageDisplay({ current: 0, limit: 999999, enforced: true }).limitLabel, '999.999');
});

test('usageLabels covers all backend metered features with Turkish labels', () => {
  assert.equal(usageLabels.QUOTATION_CREATED, 'Teklif');
  assert.equal(usageLabels.AI_QUOTATION_GENERATED, 'AI Teklif Üretimi');
  // PDF/A pre-checks are counted separately; this card measures quotation PDFs only.
  assert.equal(usageLabels.PDF_GENERATED, 'Teklif PDF Çıktısı');
  assert.equal(usageLabels.REGULATION_CHECK_RUN, 'Mevzuat Denetimi');
  assert.equal(usageLabels.PROFIT_ANALYSIS_RUN, 'Kârlılık Analizi');
  assert.equal(usageLabels.IFC_IMPORTED, 'IFC Model Analizi');
});

