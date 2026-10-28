import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QuoteAiEvidence } from './QuoteAiEvidence';

test('AI evidence displays original values and changed field names with a review warning', () => {
  const html = renderToStaticMarkup(React.createElement(QuoteAiEvidence, { evidence: { original: { description: 'Beton', unit: 'm3', quantity: 2, unitPrice: 100 }, changedFields: ['quantity'] }, currency: 'TRY' }));
  assert.match(html, /Beton/);
  assert.match(html, /Miktar/);
  assert.match(html, /kontrol/i);
  assert.match(html, /100/);
  assert.match(html, /para birimi belirtilmedi/i);
  assert.doesNotMatch(html, /TRY/);
  assert.equal(renderToStaticMarkup(React.createElement(QuoteAiEvidence, { evidence: null, currency: 'TRY' })), '');
});
