import test from 'node:test';
import assert from 'node:assert/strict';
import { canPreviewIfcInBrowser } from './browser-preview';
test('browser preview accepts up to 25 MiB and rejects larger or invalid sizes', () => {
  assert.equal(canPreviewIfcInBrowser(25 * 1024 * 1024), true);
  for (const size of [25 * 1024 * 1024 + 1, NaN, Infinity, -1]) assert.equal(canPreviewIfcInBrowser(size), false);
});
