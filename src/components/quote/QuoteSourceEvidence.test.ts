import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QuoteSourceEvidence } from './QuoteSourceEvidence';

test('renders captured quantity and price separately from current quote values', () => {
  const html = renderToStaticMarkup(React.createElement(QuoteSourceEvidence, { quantitySource: 'document', priceSource: 'snapshot', verificationStatus: 'unverified', quantity: '4', unit: 'm3', unitPrice: '200', currency: 'TRY', evidence: { quantity: [{ quantity: '3.5', unit: 'm3', sourceCellRange: 'IFC#32', reviewStatus: 'accepted_exception' }], price: [{ amount: '100', currency: 'TRY', unit: 'm3' }] } }));
  assert.match(html, /Bu sayı nasıl oluştu/); assert.match(html, /3\.5/); assert.match(html, /200/); assert.match(html, /100/); assert.match(html, /IFC#32/); assert.match(html, /İstisna/); assert.match(html, /İncelenmemiş/);
});

test('does not invent evidence for manual and legacy rows', () => {
  const html = renderToStaticMarkup(React.createElement(QuoteSourceEvidence, { quantitySource: 'manual', priceSource: 'manual', verificationStatus: 'unverified', quantity: '1', unit: 'adet', unitPrice: '0', currency: 'TRY', evidence: { quantity: [], price: [] } }));
  assert.match(html, /Manuel/); assert.match(html, /Bilinmiyor/); assert.doesNotMatch(html, /onaylanmış kaynak/);
});

test('identifies AI and market sources and pending review explicitly', () => {
  const html = renderToStaticMarkup(React.createElement(QuoteSourceEvidence, { quantitySource: 'ai_estimate', priceSource: 'market', verificationStatus: 'needs_review', quantity: '1', unit: 'adet', unitPrice: '12', currency: 'TRY', evidence: { quantity: [], price: [] } }));
  assert.match(html, /AI tahmini/); assert.match(html, /Piyasa/); assert.match(html, /İnceleme gerekli/);
});
