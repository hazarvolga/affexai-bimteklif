import assert from 'node:assert/strict';
import test from 'node:test';
import { replaceWithDemo } from './quote-demo-replacement';

test('demo replacement clears customer, prior rows and all source-specific state', () => {
  const state = {
    formData: { clientId: 'real-client', projectName: 'real project', notes: 'real notes', currency: 'EUR' },
    items: [{ description: 'real IFC row', aiEvidenceToken: 'signed-token', sourceReference: 'IFC source' }],
    ifcTransferNotice: { importedItems: 1 }, preBimNotice: { itemCount: 1 },
    excelImportNotice: { fileName: 'real.xlsx' }, aiResult: { lineItems: ['AI output'] }, description: 'real AI prompt',
  };
  const result = replaceWithDemo(state, { projectName: 'Demo', notes: 'Demo notes', currency: 'TRY' }, [{ description: 'sample', aiEvidenceToken: '', sourceReference: '' }]);
  assert.equal(result.formData.clientId, '');
  assert.equal(result.formData.projectName, 'Demo');
  assert.deepEqual(result.items, [{ description: 'sample', aiEvidenceToken: '', sourceReference: '' }]);
  assert.equal(result.ifcTransferNotice, null);
  assert.equal(result.preBimNotice, null);
  assert.equal(result.excelImportNotice, null);
  assert.equal(result.aiResult, null);
  assert.equal(result.description, '');
  assert.equal(state.formData.clientId, 'real-client');
  assert.equal(state.items[0].aiEvidenceToken, 'signed-token');
  assert.equal(state.excelImportNotice.fileName, 'real.xlsx');
  assert.equal(state.ifcTransferNotice.importedItems, 1);
  assert.equal(state.preBimNotice.itemCount, 1);
  assert.deepEqual(state.aiResult.lineItems, ['AI output']);
  assert.equal(state.description, 'real AI prompt');
});

test('example quotes cannot be saved even after choosing a real customer', async () => {
  const { maySaveQuote } = await import('./quote-demo-replacement');
  assert.equal(maySaveQuote({ demoLoaded: true, clientId: 'real-client', projectName: 'Project' }), false);
  assert.equal(maySaveQuote({ demoLoaded: false, clientId: '', projectName: 'Project' }), false);
  assert.equal(maySaveQuote({ demoLoaded: false, clientId: 'real-client', projectName: 'Project' }), true);
});

test('demo confirmation explains that the example cannot be saved', async () => {
  const { readFile } = await import('node:fs/promises');
  const source = await readFile(new URL('./CreateQuote.tsx', import.meta.url), 'utf8');
  const message = source.match(/<DialogDescription>([^<]+)<\/DialogDescription>/)?.[1] ?? '';
  assert.match(message, /demo (?:taslağı )?kaydedilemez/i);
  assert.match(message, /gerçek teklif.*yeni teklif/i);
  assert.doesNotMatch(message, /kaydetmek için müşteriyi yeniden seç/i);
});
