import assert from 'node:assert/strict';
import test from 'node:test';
import { PgDialect } from 'drizzle-orm/pg-core';
import { db } from '../../db';
import { registerCrmRoutes } from './crm';
import { authenticate } from '../middleware/auth';

test.before(() => { test.mock.method(db.$client, 'query', (() => { throw new Error('No database access in CRM unit tests'); }) as any); });
test.after(async () => { await db.$client.end(); });

const companyId = '11111111-1111-4111-8111-111111111111';
const dealId = '22222222-2222-4222-8222-222222222222';
const userId = '33333333-3333-4333-8333-333333333333';
const mutate = () => {};
function routes() {
  const handlers = new Map<string, Function[]>();
  const app: any = { get: (path: string, ...fns: Function[]) => handlers.set(`GET ${path}`, fns), post: (path: string, ...fns: Function[]) => handlers.set(`POST ${path}`, fns) };
  registerCrmRoutes(app, {} as any, mutate);
  return handlers;
}
function response() { return { code: 200, body: undefined as any, status(code: number) { this.code = code; return this; }, json(body: any) { this.body = body; return this; } }; }

test('CRM detail uses session tenant and returns 404 for a foreign deal', async t => {
  t.mock.method(db.query.deals, 'findFirst', (async (config: any) => {
    const query = new PgDialect().sqlToQuery(config.where);
    assert.equal(query.sql, '("deals"."id" = $1 and "deals"."company_id" = $2)');
    assert.deepEqual(query.params, [dealId, companyId]);
    return undefined;
  }) as any);
  const handler = routes().get('GET /api/crm/deals/:id')!;
  assert.ok(handler);
  assert.equal(handler[0], authenticate);
  const res = response();
  await handler.at(-1)!({ params: { id: dealId }, user: { companyId }, query: { companyId: 'foreign' } }, res);
  assert.equal(res.code, 404);
});

for (const path of ['/api/crm/activities', '/api/crm/deals/update-stage']) {
  test(`${path} validates before writes and rejects foreign deal without inserting activity`, async t => {
    let writes = 0;
    const tx: any = {
      select: () => ({ from: () => ({ where: (condition: any) => ({ for: async () => {
        const query = new PgDialect().sqlToQuery(condition);
        assert.equal(query.sql, '("deals"."id" = $1 and "deals"."company_id" = $2)');
        assert.deepEqual(query.params, [dealId, companyId]);
        return [];
      } }) }) }),
      insert: () => { writes++; throw new Error('must not write'); },
      update: () => { writes++; throw new Error('must not write'); },
    };
    const transaction = t.mock.method(db, 'transaction', (async (fn: any) => fn(tx)) as any);
    const handler = routes().get(`POST ${path}`)!;
    assert.equal(handler[0], authenticate);
    assert.equal(handler[1], mutate);
    const invalid = response();
    await handler.at(-1)!({ body: {}, user: { companyId, userId } }, invalid);
    assert.equal(invalid.code, 400);
    assert.equal(transaction.mock.callCount(), 0);
    const missing = response();
    await handler.at(-1)!({ body: { dealId, description: 'note', stage: 'won' }, user: { companyId, userId } }, missing);
    assert.equal(missing.code, 404);
    assert.equal(writes, 0);
  });
}
