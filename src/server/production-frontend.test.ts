import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { registerProductionFrontend } from './app';

test('production static serving keeps frontend assets and SPA while rejecting server artifacts and maps', async t => {
  const root = await mkdtemp(path.join(tmpdir(), 'teklifpro-public-assets-'));
  await mkdir(path.join(root, 'assets'));
  const files: Record<string, string> = {
    'index.html': '<html>Frontend shell</html>', 'favicon.svg': '<svg>favicon</svg>',
    'assets/index-abc.js': 'window.app = true;', 'assets/index-abc.css': 'body{color:black}',
    'assets/font-abc.woff2': 'frontend font',
    'server.cjs': 'PRIVATE_SERVER_ARTIFACT', 'server.cjs.map': 'PRIVATE_SOURCE_MAP',
    'worker.mjs': 'PRIVATE_WORKER', 'ifc-worker.mjs': 'PRIVATE_IFC_WORKER',
    'release-cli.mjs': 'PRIVATE_MIGRATION', 'spreadsheet-worker.cjs': 'PRIVATE_PARSER',
    'assets/index-abc.js.map': 'PRIVATE_FRONTEND_SOURCE_MAP',
    'arbitrary-private.json': '{"internal":true}',
  };
  await Promise.all(Object.entries(files).map(([name, content]) => writeFile(path.join(root, name), content)));
  const app = express();
  registerProductionFrontend(app, root);
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  t.after(async () => {
    server.closeAllConnections();
    await new Promise<void>(resolve => server.close(() => resolve()));
    await rm(root, { recursive: true, force: true });
  });
  const base = `http://127.0.0.1:${(server.address() as any).port}`;
  for (const name of ['server.cjs', 'server.cjs.map', 'worker.mjs', 'ifc-worker.mjs', 'release-cli.mjs', 'spreadsheet-worker.cjs', 'assets/index-abc.js.map', 'arbitrary-private.json', 'server%2ecjs', 'assets/%2e%2e%2fserver.cjs']) {
    for (const method of ['GET', 'HEAD']) {
      const response = await fetch(`${base}/${name}`, { method });
      assert.equal(response.status, 404, `${method} ${name}`);
      assert.equal((await response.text()).includes('PRIVATE_'), false);
    }
  }
  for (const name of ['favicon.svg', 'assets/index-abc.js', 'assets/index-abc.css', 'assets/font-abc.woff2']) {
    const response = await fetch(`${base}/${name}`);
    assert.equal(response.status, 200, name);
    assert.equal(await response.text(), files[name]);
    if (name.startsWith('assets/')) assert.match(response.headers.get('cache-control') ?? '', /immutable/);
  }
  for (const route of ['/', '/index.html', '/app/quotes/123', '/smartcheck', '/academy/allplan/lessons/example']) {
    const response = await fetch(base + route);
    assert.equal(response.status, 200, route);
    assert.equal(await response.text(), files['index.html']);
  }
  for (const unknownRoute of ['/bu-sayfa-yok-404', '/quotes/123']) {
    const response = await fetch(base + unknownRoute);
    assert.equal(response.status, 404, unknownRoute);
    assert.equal(await response.text(), files['index.html']);
  }
});

test('production frontend serves sitemap.xml and robots.txt for the canonical origin', async t => {
  const root = await mkdtemp(path.join(tmpdir(), 'teklifpro-seo-'));
  await writeFile(path.join(root, 'index.html'), '<html>shell</html>');
  const previous = process.env.PUBLIC_APP_URL;
  process.env.PUBLIC_APP_URL = 'https://bimmetraj.com';
  const app = express();
  registerProductionFrontend(app, root);
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  t.after(async () => {
    if (previous === undefined) delete process.env.PUBLIC_APP_URL; else process.env.PUBLIC_APP_URL = previous;
    await new Promise<void>(resolve => server.close(() => resolve()));
    await rm(root, { recursive: true, force: true });
  });
  const base = `http://127.0.0.1:${(server.address() as any).port}`;
  const sitemap = await fetch(`${base}/sitemap.xml`);
  assert.equal(sitemap.status, 200);
  assert.match(sitemap.headers.get('content-type') ?? '', /xml/);
  assert.match(await sitemap.text(), /<loc>https:\/\/bimmetraj.com\/pricing<\/loc>/);
  assert.match(await (await fetch(`${base}/robots.txt`)).text(), /Sitemap: https:\/\/bimmetraj.com\/sitemap.xml/);
  const llms = await fetch(`${base}/llms.txt`);
  assert.equal(llms.status, 200);
  assert.match(llms.headers.get('content-type') ?? '', /text\/plain/);
  assert.match(await llms.text(), /# BIMMetraj \(TeklifPro\)/);
});

