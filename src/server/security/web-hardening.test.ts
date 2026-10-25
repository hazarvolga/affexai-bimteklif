import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import http from 'node:http';
import { AI_SEARCH_CRAWLERS, AI_TRAINING_CRAWLERS, aiTrainingPolicyFromEnv, canonicalHostRedirect, contentSecurityPolicy, isKnownSpaRoute, llmsTxt, robotsTxt, securityTxt, sitemapXml } from './web-hardening';

test('CSP locks scripts to self (+ Cloudflare Insights beacon) and only opens the origins the app really uses', () => {
  const policy = contentSecurityPolicy({ SMARTCHECK_S3_ENDPOINT: 'https://acct.r2.cloudflarestorage.com' });
  const directives = Object.fromEntries(policy.split('; ').map(part => [part.split(' ')[0], part.split(' ').slice(1)]));
  assert.deepEqual(directives['script-src'], ["'self'", 'https://static.cloudflareinsights.com']);
  assert.deepEqual(directives['style-src'], ["'self'", "'unsafe-inline'"]);
  assert.deepEqual(directives['font-src'], ["'self'", 'data:']);
  assert.deepEqual(directives['object-src'], ["'none'"]);
  assert.deepEqual(directives['frame-ancestors'], ["'none'"]);
  assert.ok(directives['connect-src'].includes('https://cloudflareinsights.com'));
  assert.ok(directives['connect-src'].includes('https://acct.r2.cloudflarestorage.com'));
  assert.ok(directives['connect-src'].includes('https://*.acct.r2.cloudflarestorage.com'), 'virtual-hosted bucket uploads');
  assert.ok(!directives['connect-src'].includes('https://firestore.googleapis.com'), 'academy Firebase omitted while ACADEMY_ENABLED is false');
  assert.ok(!policy.includes('fonts.googleapis.com'), 'KVKK/SEC-3: no external Google Fonts in CSP');
  assert.ok(!policy.includes('fonts.gstatic.com'), 'KVKK/SEC-3: no external Google Fonts in CSP');
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

test('sitemap lists public pages on the canonical origin and robots/llms/security.txt point to it', () => {
  const xml = sitemapXml('https://bimmetraj.com');
  assert.match(xml, /^<\?xml version="1.0" encoding="UTF-8"\?>/);
  for (const page of ['https://bimmetraj.com/', 'https://bimmetraj.com/pricing', 'https://bimmetraj.com/smartcheck', 'https://bimmetraj.com/bim-sozlugu']) assert.ok(xml.includes(`<loc>${page}</loc>`), page);
  assert.equal(xml.includes('<lastmod>'), false, 'SEO-03: sayfa başına gerçek tarih yokken lastmod yazılmaz');
  assert.ok(!xml.includes('/app'));
  assert.ok(!xml.includes('/login'));
  assert.ok(!xml.includes('/academy'), 'Academy is out of scope while ACADEMY_ENABLED is false');
  const robots = robotsTxt('https://bimmetraj.com');
  assert.match(robots, /Sitemap: https:\/\/bimmetraj.com\/sitemap.xml/);
  assert.match(robots, /Disallow: \/app\//);
  assert.match(robots, /Disallow: \/api\//);
  const secTxt = securityTxt('https://bimmetraj.com');
  assert.match(secTxt, /Contact: mailto:info@bimmetraj\.com/);
  assert.match(secTxt, /Canonical: https:\/\/bimmetraj\.com\/\.well-known\/security\.txt/);
  const llms = llmsTxt('https://bimmetraj.com');
  assert.match(llms, /# BIMMetraj \(TeklifPro\)/);
  assert.match(llms, /RG 33331 e-PYS/);
  assert.match(llms, /https:\/\/bimmetraj\.com\/bim-sozlugu/);

  // BUG-3 / SEO-2: known SPA routes vs unknown 404 paths
  assert.equal(isKnownSpaRoute('/'), true);
  assert.equal(isKnownSpaRoute('/bim-sozlugu'), true);
  assert.equal(isKnownSpaRoute('/app/smartcheck'), true);
  assert.equal(isKnownSpaRoute('/admin/leads'), true);
  assert.equal(isKnownSpaRoute('/olmayan-sayfa-xyz'), false);
  for (const p of [
    '/hesaplayicilar',
    '/hesaplayicilar/kik-asiri-dusuk-teklif',
    '/hesaplayicilar/fiyat-farki-4735',
  ]) {
    assert.equal(isKnownSpaRoute(p), true, p);
    assert.ok(xml.includes(`<loc>https://bimmetraj.com${p}</loc>`), `sitemap: ${p}`);
    assert.ok(llms.includes(`https://bimmetraj.com${p}`), `llms.txt: ${p}`);
  }
  assert.equal(isKnownSpaRoute('/hesaplayicilar/olmayan'), false);
  // Denetim P0-3: kaynak doğrulaması bitmeyen hesaplayıcılar yayında olmamalı
  for (const p of ['/hesaplayicilar/kat-karsiligi-ve-kentsel-donusum', '/hesaplayicilar/yambis-muteahhitlik-grubu']) {
    assert.equal(isKnownSpaRoute(p), false, p);
    assert.equal(xml.includes(p), false, `sitemap: ${p}`);
    assert.equal(llms.includes(p), false, `llms.txt: ${p}`);
  }
  assert.equal(llms.includes('L3 CANLI'), false);
});


/** robots.txt'yi tarayıcı grubu → kurallar eşlemesine çevirir (ardışık User-agent satırları tek gruptur). */
function robotsGroups(robots: string): Map<string, string[]> {
  const groups = new Map<string, string[]>();
  let agents: string[] = [];
  let collectingAgents = false;
  for (const line of robots.split('\n')) {
    const [field, ...rest] = line.split(':');
    const value = rest.join(':').trim();
    if (field === 'User-agent') {
      if (!collectingAgents) agents = [];
      agents.push(value);
      groups.set(value, []);
      collectingAgents = true;
    } else if (field === 'Disallow' || field === 'Allow') {
      for (const agent of agents) groups.get(agent)!.push(`${field}: ${value}`);
      collectingAgents = false;
    }
  }
  return groups;
}

test('GEO-01: robots.txt names AI search and training crawlers and keeps private routes closed for each', () => {
  const groups = robotsGroups(robotsTxt('https://bimmetraj.com'));
  const privateRules = ['Disallow: /app/', 'Disallow: /admin/', 'Disallow: /api/'];
  for (const agent of ['*', ...AI_SEARCH_CRAWLERS, ...AI_TRAINING_CRAWLERS]) {
    assert.deepEqual(groups.get(agent), privateRules, agent);
  }
  assert.ok(AI_SEARCH_CRAWLERS.includes('OAI-SearchBot') && AI_TRAINING_CRAWLERS.includes('GPTBot'));
});

test('GEO-01: ROBOTS_AI_TRAINING=disallow closes the site only for training crawlers', () => {
  assert.equal(aiTrainingPolicyFromEnv(undefined), 'allow');
  assert.equal(aiTrainingPolicyFromEnv('yes'), 'allow');
  assert.equal(aiTrainingPolicyFromEnv(' Disallow '), 'disallow');
  const robots = robotsTxt('https://bimmetraj.com', 'disallow');
  const groups = robotsGroups(robots);
  for (const agent of AI_TRAINING_CRAWLERS) assert.deepEqual(groups.get(agent), ['Disallow: /'], agent);
  for (const agent of ['*', ...AI_SEARCH_CRAWLERS]) assert.equal(groups.get(agent)?.includes('Disallow: /'), false, agent);
  assert.match(robots, /Sitemap: https:\/\/bimmetraj\.com\/sitemap\.xml/);
});
