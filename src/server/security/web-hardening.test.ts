import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import http from 'node:http';
import { canonicalHostRedirect, contentSecurityPolicy, robotsTxt, sitemapXml } from './web-hardening';

test('CSP locks scripts to self and only opens the origins the app really uses', () => {
  const policy = contentSecurityPolicy({ SMARTCHECK_S3_ENDPOINT: 'https://acct.r2.cloudflarestorage.com' });
  const directives = Object.fromEntries(policy.split('; ').map(part => [part.split(' ')[0], part.split(' ').slice(1)]));
  assert.deepEqual(directives['script-src'], ["'self'"]);
  assert.deepEqual(directives['object-src'], ["'none'"]);
  assert.deepEqual(directives['frame-ancestors'], ["'none'"]);
  assert.ok(directives['connect-src'].includes('https://acct.r2.cloudflarestorage.com'));
  assert.ok(directives['connect-src'].includes('https://*.acct.r2.cloudflarestorage.com'), 'virtual-hosted bucket uploads');
  assert.ok(directives['connect-src'].includes('https://firestore.googleapis.com'), 'academy Firebase');
  assert.ok(!policy.includes("'unsafe-eval'"));
  assert.ok(!contentSecurityPolicy({}).includes('undefined'));
  assert.ok(!contentSecurityPolicy({ SMARTCHECK_S3_ENDPOINT: 'not a url' }).includes('not a url'));
});

test('www requests are redirected permanently to the apex with path and query kept', async t => {
  const app = express();
  app.use(canonicalHostRedirect('https://bimmetraj.com'));
  app.get('*', (_req, res) => { res.send('apex'); });
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  t.after(() => new Promise<void>(resolve => server.close(() => resolve())));
  const port = (server.address() as any).port;
  const get = (path: string, host: string) => new Promise<{ status: number; location?: string }>((resolve, reject) => {
    http.get({ host: '127.0.0.1', port, path, headers: { Host: host } }, res => { res.resume(); resolve({ status: res.statusCode!, location: res.headers.location }); }).on('error', reject);
  });
  assert.deepEqual(await get('/pricing?ref=x', 'www.bimmetraj.com'), { status: 301, location: 'https://bimmetraj.com/pricing?ref=x' });
  assert.equal((await get('/pricing', 'bimmetraj.com')).status, 200);
  assert.equal((await get('/', 'evil.example')).status, 200, 'never redirects to attacker-controlled hosts');
});

test('sitemap lists public pages on the canonical origin and robots points to it', () => {
  const xml = sitemapXml('https://bimmetraj.com');
  assert.match(xml, /^<\?xml version="1.0" encoding="UTF-8"\?>/);
  for (const page of ['https://bimmetraj.com/', 'https://bimmetraj.com/pricing', 'https://bimmetraj.com/smartcheck']) assert.ok(xml.includes(`<loc>${page}</loc>`), page);
  assert.ok(!xml.includes('/app'));
  assert.ok(!xml.includes('/login'));
  assert.ok(!xml.includes('/academy'), 'Academy is out of scope while ACADEMY_ENABLED is false');
  const robots = robotsTxt('https://bimmetraj.com');
  assert.match(robots, /Sitemap: https:\/\/bimmetraj.com\/sitemap.xml/);
  assert.match(robots, /Disallow: \/app\//);
  assert.match(robots, /Disallow: \/api\//);
});
