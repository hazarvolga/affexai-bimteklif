import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'node:path';
import express from 'express';
import { canonicalPlans } from '../../services/billing/plan-catalog';
import type { readPublicPlans } from '../../services/billing/public-plans';

// Importing the application constructs the DB pool, but the injected loader below
// ensures these HTTP tests never connect to that database.
process.env.DATABASE_URL ||= 'postgresql://unused:unused@127.0.0.1:1/teklifpro_http_test';
const { registerProductionFrontend } = await import('../app');

test('production frontend exposes the injected catalog and fails closed when it is unavailable', async () => {
  const previousUrl = process.env.PUBLIC_APP_URL;
  process.env.PUBLIC_APP_URL = 'https://bimmetraj.com';
  const visible = canonicalPlans.find(plan => plan.isTrial)!;
  const hidden = canonicalPlans.find(plan => !plan.isTrial)!;
  let calls = 0;
  let unavailable = false;
  const app = express();
  registerProductionFrontend(app, path.resolve('.'), {
    loadPublicPlans: async () => {
      calls++;
      if (unavailable) throw new Error('test catalog unavailable');
      return [visible] as Awaited<ReturnType<typeof readPublicPlans>>;
    },
  });
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}`;
  try {
    const home = await fetch(`${base}/`);
    assert.equal(home.status, 200);
    assert.equal(calls, 0, 'unrelated HTML must not query the catalog');

    for (const route of ['/pricing', '/llms.txt', '/llms-full.txt']) {
      const response = await fetch(`${base}${route}`);
      assert.equal(response.status, 200, route);
      const body = await response.text();
      assert.ok(body.includes(visible.name), route);
      assert.ok(!body.includes(hidden.name), route);
      assert.match(response.headers.get('cache-control') ?? '', route === '/pricing' ? /no-cache/ : /no-store/);
    }

    unavailable = true;
    for (const route of ['/pricing', '/llms.txt', '/llms-full.txt']) {
      const response = await fetch(`${base}${route}`);
      assert.equal(response.status, 503, route);
      assert.match(response.headers.get('cache-control') ?? '', /no-store/);
      assert.ok(!(await response.text()).includes(visible.name), route);
    }
    const callsBeforeHome = calls;
    assert.equal((await fetch(`${base}/`)).status, 200);
    assert.equal(calls, callsBeforeHome, 'home remains available during catalog failure');
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    if (previousUrl === undefined) delete process.env.PUBLIC_APP_URL;
    else process.env.PUBLIC_APP_URL = previousUrl;
  }
});
