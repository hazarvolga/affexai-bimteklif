import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';
import { PgDialect } from 'drizzle-orm/pg-core';
import { db } from '../../db';
import { registerAdminRoutes } from '../routes/admin';

const now = '2026-11-01T00:30:00Z';
const row = (overrides = {}) => ({
  id: 'tenant', name: 'Legacy', created_at: now, owner_email: 'owner@example.test',
  subscription_id: 'subscription', subscription_status: 'active', legacy_plan: 'starter',
  plan_id: null, linked_plan_id: null, plan_name: null, monthly_quote_limit: null,
  plan_active: null, bonus_quote_limit: 2, current_period_start: '2020-01-01T00:00:00Z',
  current_period_end: null, current_usage: '7', invalid_usage: false, ...overrides,
});

async function read(t: TestContext, rows: unknown[]) {
  const queries: { sql: string; params: unknown[] }[] = [];
  const execute = async (query: any) => {
    const compiled = new PgDialect().sqlToQuery(query);
    queries.push(compiled);
    return { rows: compiled.sql.includes('clock_timestamp()') ? [{ now }] : rows };
  };
  t.mock.method(db, 'execute', execute as any);
  t.mock.method(db, 'transaction', (async (callback: any, options: unknown) => {
    assert.deepEqual(options, { isolationLevel: 'repeatable read', accessMode: 'read only' });
    return callback({ execute });
  }) as any);
  let handler: any;
  const app: any = {
    use(prefix: string, router: any) {
      if (prefix === '/api/admin' && router?.stack) {
        for (const layer of router.stack) {
          if (layer.route?.path === '/tenants') {
            handler = layer.route.stack.at(-1)?.handle;
          }
        }
      }
    },
    get(path: string, ...handlers: any[]) { if (path === '/api/admin/tenants') handler = handlers.at(-1); },
    post() {},
    patch() {}
  };
  registerAdminRoutes(app);
  const res: any = { statusCode: 200, body: undefined, status(code: number) { this.statusCode = code; return this; }, json(body: unknown) { this.body = body; return this; } };
  await handler({}, res);
  return { res, queries };
}

test('admin tenant quota uses authoritative legacy allowance and numeric summed usage', async t => {
  const { res } = await read(t, [row()]);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body[0].quota_limit, 22);
  assert.equal(res.body[0].current_usage, 7);
  assert.equal(res.body[0].plan_name, 'starter');
  assert.equal(res.body[0].quota_available, true);
});

test('admin tenant query aggregates duplicates before joining and uses DB-clock UTC month', async t => {
  const { res, queries } = await read(t, [row()]);
  const query = queries.find(query => /FROM companies c/.test(query.sql))!;
  assert.match(query.sql, /SUM\(quote_count\)/i);
  assert.match(query.sql, /GROUP BY company_id/i);
  assert.ok(query.params.includes('2026-11'));
  assert.doesNotMatch(query.sql, /CURRENT_DATE/i);
  assert.equal(res.body[0].quota_period, '2026-11');
});

test('admin preserves zero and distinguishes absent, inactive and expired entitlements', async t => {
  const linked = { plan_id: 'plan', linked_plan_id: 'plan', plan_name: 'Zero', monthly_quote_limit: 0, plan_active: true, bonus_quote_limit: 0 };
  const { res } = await read(t, [row(linked), row({ subscription_id: null }), row({ subscription_status: 'canceled' }), row({ ...linked, plan_active: false }), row({ current_period_end: now })]);
  assert.equal(res.body[0].quota_limit, 0);
  assert.equal(res.body[0].quota_reason, 'QUOTA_EXCEEDED');
  assert.equal(res.body[1].quota_limit, null);
  assert.equal(res.body[1].quota_reason, 'SUBSCRIPTION_REQUIRED');
  assert.equal(res.body[2].quota_reason, 'SUBSCRIPTION_INACTIVE');
  assert.equal(res.body[3].quota_reason, 'PLAN_UNAVAILABLE');
  assert.equal(res.body[4].quota_reason, 'SUBSCRIPTION_INACTIVE');
  assert.ok(res.body.every((tenant: any) => tenant.quota_available === false));
});

test('admin does not fabricate quota stats from corrupt historic counters', async t => {
  const { res } = await read(t, [row({ invalid_usage: true })]);
  assert.equal(res.statusCode, 503);
  assert.deepEqual(res.body, { error: 'Tenant quota stats unavailable' });
});
