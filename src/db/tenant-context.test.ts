import assert from "node:assert/strict";
import test from "node:test";
import type pg from "pg";

import { withTenantDrizzleTransaction, withTenantTransaction } from "./tenant-context";

const COMPANY_ID = "11111111-1111-4111-8111-111111111111";
const USER_ID = "22222222-2222-4222-8222-222222222222";

type RecordedQuery = { text: string; values: readonly unknown[] };

function fakePool(options: { failCommit?: boolean; failContext?: boolean; failRollback?: boolean; rejectRole?: boolean } = {}) {
  const queries: RecordedQuery[] = [];
  let connectCount = 0;
  let releaseCount = 0;
  let releasedWith: Error | undefined;
  const client = {
    async query(input: string | { text: string; values?: readonly unknown[] }, values: readonly unknown[] = []) {
      const text = typeof input === "string" ? input : input.text;
      const params = typeof input === "string" ? values : input.values ?? [];
      queries.push({ text, values: params });
      if (options.failContext && /set_config/i.test(text)) throw new Error("context rejected");
      if (options.failCommit && /^\s*commit\s*$/i.test(text)) throw new Error("commit rejected");
      if (options.failRollback && /^\s*rollback\s*$/i.test(text)) throw new Error("rollback rejected");
      if (/set_config/i.test(text)) return { rows: options.rejectRole ? [] : [{}], rowCount: options.rejectRole ? 0 : 1 };
      return { rows: [], rowCount: 0 };
    },
    release(error?: Error) { releaseCount += 1; releasedWith = error; },
  } as unknown as pg.PoolClient;
  const pool = {
    async connect() { connectCount += 1; return client; },
  } as unknown as pg.Pool;
  return {
    pool,
    client,
    queries,
    get connectCount() { return connectCount; },
    get releaseCount() { return releaseCount; },
    get releasedWith() { return releasedWith; },
  };
}

test("tenant transaction binds company and user with transaction-local PostgreSQL settings", async () => {
  const fixture = fakePool();
  let callbackClient: pg.PoolClient | undefined;

  const result = await withTenantTransaction(
    fixture.pool,
    { companyId: COMPANY_ID, userId: USER_ID },
    async (client) => {
      callbackClient = client;
      return "scoped-result";
    },
  );

  assert.equal(result, "scoped-result");
  assert.equal(callbackClient, fixture.client);
  assert.equal(fixture.connectCount, 1);
  assert.equal(fixture.releaseCount, 1);
  assert.match(fixture.queries[0]?.text ?? "", /^\s*begin\s*$/i);
  const contextQueries = fixture.queries.filter(({ text }) => /set_config/i.test(text));
  assert.ok(contextQueries.length >= 1, "tenant context must be bound with set_config");
  const contextSql = contextQueries.map(({ text }) => text).join("\n");
  assert.match(contextSql, /bimmetraj\.company_id/);
  assert.match(contextSql, /bimmetraj\.user_id/);
  assert.match(contextSql, /current_user\s*=\s*'bimmetraj_app'/i);
  assert.match(contextSql, /session_user\s*=\s*'bimmetraj_app'/i);
  assert.match(contextSql, /not\s+role\.rolsuper/i);
  assert.match(contextSql, /not\s+role\.rolbypassrls/i);
  assert.match(contextSql, /not\s+role\.rolcreaterole/i);
  assert.match(contextSql, /not\s+role\.rolcreatedb/i);
  assert.match(contextSql, /not\s+role\.rolreplication/i);
  assert.match(contextSql, /not\s+exists\s*\(select\s+1\s+from\s+pg_auth_members\s+membership\s+where\s+membership\.member\s*=\s*role\.oid\)/i);
  assert.match(contextSql, /set_config\s*\([^)]*,\s*[^,]+,\s*true\s*\)/i, "context must be transaction-local");
  assert.equal(contextSql.match(/set_config\s*\([^)]*,\s*[^,]+,\s*true\s*\)/gi)?.length, 2, "both tenant GUCs must be transaction-local");
  const parameters = contextQueries.flatMap(({ values }) => values);
  assert.ok(parameters.includes(COMPANY_ID));
  assert.ok(parameters.includes(USER_ID));
  assert.match(fixture.queries.at(-1)?.text ?? "", /^\s*commit\s*$/i);
});

test("tenant transaction fails closed unless PostgreSQL confirms the restricted app role", async () => {
  const fixture = fakePool({ rejectRole: true });
  let workCalled = false;
  await assert.rejects(
    withTenantTransaction(fixture.pool, { companyId: COMPANY_ID, userId: USER_ID }, async () => { workCalled = true; }),
    /restricted bimmetraj_app database role/i,
  );
  assert.equal(workCalled, false);
  assert.match(fixture.queries.at(-1)?.text ?? "", /^\s*rollback\s*$/i);
  assert.equal(fixture.releaseCount, 1);
});

test("invalid context fails before a connection is checked out", async () => {
  for (const context of [
    { companyId: "", userId: USER_ID },
    { companyId: "not-a-uuid", userId: USER_ID },
    { companyId: COMPANY_ID, userId: "" },
    { companyId: COMPANY_ID, userId: "not-a-uuid" },
  ]) {
    const fixture = fakePool();
    await assert.rejects(
      withTenantTransaction(fixture.pool, context, async () => undefined),
      /company|user|uuid|context/i,
    );
    assert.equal(fixture.connectCount, 0);
    assert.equal(fixture.releaseCount, 0);
  }
});

test("callback failure rolls back and releases the checked-out connection", async () => {
  const fixture = fakePool();
  const expected = new Error("business failure");

  await assert.rejects(
    withTenantTransaction(fixture.pool, { companyId: COMPANY_ID, userId: USER_ID }, async () => {
      throw expected;
    }),
    expected,
  );

  assert.equal(fixture.releaseCount, 1);
  assert.match(fixture.queries.at(-1)?.text ?? "", /^\s*rollback\s*$/i);
  assert.equal(fixture.queries.some(({ text }) => /^\s*commit\s*$/i.test(text)), false);
});

test("context setup and commit failures roll back before releasing the connection", async () => {
  for (const options of [{ failContext: true }, { failCommit: true }]) {
    const fixture = fakePool(options);
    await assert.rejects(
      withTenantTransaction(fixture.pool, { companyId: COMPANY_ID, userId: USER_ID }, async () => "unused"),
      /context rejected|commit rejected/,
    );
    assert.equal(fixture.releaseCount, 1);
    assert.match(fixture.queries.at(-1)?.text ?? "", /^\s*rollback\s*$/i);
  }
});

test("rollback failure discards the pooled connection while preserving the original error", async () => {
  const fixture = fakePool({ failRollback: true });
  const expected = new Error("business failure");
  await assert.rejects(
    withTenantTransaction(fixture.pool, { companyId: COMPANY_ID, userId: USER_ID }, async () => { throw expected; }),
    expected,
  );
  assert.equal(fixture.releaseCount, 1);
  assert.match(fixture.releasedWith?.message ?? "", /rollback rejected/);
});

test("Drizzle tenant helper uses the same checked-out client after transaction-local context binding", async () => {
  const fixture = fakePool();
  let callbackCalled = false;

  const result = await withTenantDrizzleTransaction(fixture.pool, { companyId: COMPANY_ID, userId: USER_ID }, async (database) => {
    callbackCalled = Boolean(database);
    return "drizzle-scoped-result";
  });

  assert.equal(result, "drizzle-scoped-result");
  assert.equal(callbackCalled, true);
  assert.equal(fixture.connectCount, 1);
  assert.equal(fixture.releaseCount, 1);
  assert.match(fixture.queries[0]?.text ?? "", /^\s*begin\s*$/i);
  assert.equal(fixture.queries.filter(({ text }) => /set_config/i.test(text)).length, 1);
  assert.match(fixture.queries.at(-1)?.text ?? "", /^\s*commit\s*$/i);
});
