import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

test('Coolify resolves the reviewed seccomp profile from its deployment checkout', () => {
  const compose = readFileSync(new URL('../../../compose.coolify.yaml', import.meta.url), 'utf8');
  assert.match(compose, /seccomp=\$\{CHROMIUM_SECCOMP_PROFILE:-\.\/deploy\/chromium-seccomp\.json\}/);
  assert.ok(existsSync(new URL('../../../deploy/chromium-seccomp.json', import.meta.url)));
});

test('frozen Docker install includes workspace overrides and skips lifecycle scripts', () => {
  const dockerfile = readFileSync(new URL('../../../Dockerfile', import.meta.url), 'utf8');
  const install = dockerfile.indexOf('RUN pnpm install --frozen-lockfile --ignore-scripts');
  assert.ok(install > 0);
  assert.match(dockerfile.slice(0, install), /COPY package\.json pnpm-lock\.yaml pnpm-workspace\.yaml \.\//);
});

test('Dockerfile referenced source files and entrypoints exist in the repository', () => {
  const repoRoot = path.resolve(new URL('../../../', import.meta.url).pathname);
  const dockerfile = readFileSync(path.join(repoRoot, 'Dockerfile'), 'utf8');

  // Verify no non-existent *.entry.ts files are referenced
  assert.equal(dockerfile.includes('.entry.ts'), false, 'Dockerfile must not reference nonexistent *.entry.ts files');

  // Extract paths after esbuild command
  const esbuildMatches = [...dockerfile.matchAll(/esbuild\s+([^\s]+)/g)].map(m => m[1]);
  assert.ok(esbuildMatches.length >= 3, 'Must find at least 3 esbuild entrypoints');

  for (const entryPath of esbuildMatches) {
    const fullPath = path.join(repoRoot, entryPath);
    assert.ok(existsSync(fullPath), `Source entrypoint referenced in Dockerfile must exist: ${entryPath}`);
  }

  // Extract explicit COPY sources that are not stage references
  const copyMatches = [...dockerfile.matchAll(/COPY\s+(?:--[^\s]+\s+)*([^\s]+)\s+([^\s]+)/g)]
    .map(m => m[1])
    .filter(src => !src.startsWith('.') && !src.startsWith('/'));

  for (const copySrc of copyMatches) {
    const fullPath = path.join(repoRoot, copySrc);
    assert.ok(existsSync(fullPath), `COPY source referenced in Dockerfile must exist: ${copySrc}`);
  }
});
