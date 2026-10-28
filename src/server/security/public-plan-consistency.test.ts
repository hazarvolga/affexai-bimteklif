import assert from 'node:assert/strict';
import test from 'node:test';
import { canonicalPlans } from '../../services/billing/plan-catalog';
import { injectRouteMeta } from './route-meta';
import { llmsTxt } from './web-hardening';

const shell = '<html><head><title>x</title><meta name="description" content="x" /><script id="site-jsonld" type="application/ld+json">{}</script></head><body><div id="root"></div></body></html>';
const origin = 'https://bimmetraj.com';

test('published plan snapshot controls pricing, llms and JSON-LD; hidden plans are absent', () => {
  const trial = canonicalPlans.find(plan => plan.isTrial)!;
  const hidden = canonicalPlans.find(plan => !plan.isTrial)!;
  const html = injectRouteMeta(shell, { pathname: '/pricing', origin, publicPlans: [trial] });
  const llms = llmsTxt(origin, [trial]);
  assert.ok(html.includes(trial.name));
  assert.ok(llms.includes(trial.name));
  assert.ok(!html.includes(hidden.name));
  assert.ok(!llms.includes(hidden.name));
  const graph = JSON.parse(html.match(/<script id="site-jsonld"[^>]*>([\s\S]*?)<\/script>/)![1])['@graph'];
  const app = graph.find((item: { '@type': string }) => item['@type'] === 'SoftwareApplication');
  assert.equal(app.offers.offerCount, '1');
});

test('unavailable or empty catalog does not expose static offers', () => {
  const html = injectRouteMeta(shell, { pathname: '/pricing', origin, publicPlans: [] });
  const llms = llmsTxt(origin, []);
  for (const plan of canonicalPlans) {
    assert.ok(!html.includes(plan.name));
    assert.ok(!llms.includes(`**${plan.name}**`));
  }
  const graph = JSON.parse(html.match(/<script id="site-jsonld"[^>]*>([\s\S]*?)<\/script>/)![1])['@graph'];
  assert.equal('offers' in graph.find((item: { '@type': string }) => item['@type'] === 'SoftwareApplication'), false);
});
