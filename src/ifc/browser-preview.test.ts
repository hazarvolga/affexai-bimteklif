import test from 'node:test';
import assert from 'node:assert/strict';
import { canPreviewIfcInBrowser } from './browser-preview';
test('browser preview accepts up to 50 MiB and rejects larger or invalid sizes', () => {
  assert.equal(canPreviewIfcInBrowser(50 * 1024 * 1024), true);
  for (const size of [50 * 1024 * 1024 + 1, NaN, Infinity, -1]) assert.equal(canPreviewIfcInBrowser(size), false);
});
