import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('frozen Docker install includes workspace overrides and skips lifecycle scripts', () => {
  const dockerfile = readFileSync(new URL('../../../Dockerfile', import.meta.url), 'utf8');
  const install = dockerfile.indexOf('RUN pnpm install --frozen-lockfile --ignore-scripts');
  assert.ok(install > 0);
  assert.match(dockerfile.slice(0, install), /COPY package\.json pnpm-lock\.yaml pnpm-workspace\.yaml \.\//);
});
