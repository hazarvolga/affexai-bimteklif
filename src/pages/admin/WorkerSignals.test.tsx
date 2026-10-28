import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { WorkerSignals } from './WorkerSignals';

test('unknown, expired and observed heartbeat do not claim worker health or OCI verification', () => {
  assert.match(renderToStaticMarkup(<WorkerSignals signals={null} />), /Bilinmiyor/);
  const html = renderToStaticMarkup(<WorkerSignals signals={[{ kind: 'worker', lastSeen: null, activeInstances: 0, revision: null, revisionSource: null }, { kind: 'ifc-worker', lastSeen: '2026-10-28T10:00:00.000Z', activeInstances: 0, revision: 'abc', revisionSource: 'build' }]} />);
  assert.match(html, /Sinyal yok/); assert.match(html, /Süresi geçmiş/); assert.match(html, /OCI/); assert.doesNotMatch(html, /Sağlıklı/);
});
