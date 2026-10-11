import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PgDialect } from 'drizzle-orm/pg-core';
import { db } from '../../db';
import { authenticate } from '../middleware/auth';
import { registerCompanyRoutes } from './company';

function handlers() {
  let companyHandlers: any[] = [];
  const app: any = {
    get(path: string, ...route: any[]) { if (path === '/api/company') companyHandlers = route; },
    post() {},
    patch() {},
  };
  registerCompanyRoutes(app);
  assert.equal(companyHandlers[0], authenticate);
  return companyHandlers;
}

function response() {
  return { statusCode: 200, body: undefined as any, status(code: number) { this.statusCode = code; return this; }, json(body: unknown) { this.body = body; return this; } };
}

test('company rejects anonymous requests before reading company data', async () => {
  const [guard] = handlers();
  const res = response();
  let passed = false;
  await guard({ headers: {} }, res, () => { passed = true; });
  assert.equal(res.statusCode, 401);
  assert.equal(passed, false);
});

test('company rejects tenantless sessions without a company query', async (t) => {
  const query = t.mock.method(db.query.companies, 'findFirst', async () => { throw new Error('must not query'); });
  const res = response();
  await handlers()[1]({ user: { companyId: null, isSuperAdmin: true } }, res);
  assert.equal(res.statusCode, 403);
  assert.equal(query.mock.callCount(), 0);
});

test('company lookup uses only session tenant and an explicit minimal DTO projection', async (t) => {
  const companyId = '22222222-2222-4222-8222-222222222222';
  const dto = { id: companyId, name: 'Own workspace', logoUrl: null, defaultCurrency: 'TRY', defaultVatRate: 20 };
  t.mock.method(db.query.companies, 'findFirst', async (query: any) => {
    const sql = new PgDialect().sqlToQuery(query.where);
    assert.deepEqual(sql.params, [companyId]);
    assert.match(sql.sql, /"companies"\."id" =/);
    assert.deepEqual(query.columns, { id: true, name: true, logoUrl: true, defaultCurrency: true, defaultVatRate: true });
    return dto;
  });
  const res = response();
  await handlers()[1]({ user: { companyId }, query: { companyId: 'other-tenant' } }, res);
  assert.deepEqual(res.body, dto);
});

test('company query failure returns a generic error and absent company returns null', async (t) => {
  const query = t.mock.method(db.query.companies, 'findFirst', async (): Promise<any> => { throw new Error('private database details'); });
  const res = response();
  await handlers()[1]({ user: { companyId: 'tenant' } }, res);
  assert.equal(res.statusCode, 500);
  assert.deepEqual(res.body, { error: 'Failed to fetch company' });
  query.mock.mockImplementation(async () => undefined);
  const missing = response();
  await handlers()[1]({ user: { companyId: 'tenant' } }, missing);
  assert.equal(missing.body, null);
});
