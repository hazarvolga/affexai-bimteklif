import assert from "node:assert/strict";
import test from "node:test";
import type pg from "pg";

import { ProgressPaymentService, type ProgressPaymentTenantTransactionRunner } from "./service";

const actor = {
  companyId: "11111111-1111-4111-8111-111111111111",
  userId: "22222222-2222-4222-8222-222222222222",
};

function fixture(responses: Array<{ rows?: unknown[]; rowCount?: number }> = []) {
  const queries: Array<{ text: string; values?: unknown[] }> = [];
  const client = {
    async query(text: string, values?: unknown[]) {
      queries.push({ text, values });
      const response = responses.shift() ?? { rows: [], rowCount: 0 };
      return { rows: response.rows ?? [], rowCount: response.rowCount ?? response.rows?.length ?? 0 };
    },
  } as unknown as pg.PoolClient;
  const pool = { query() { throw new Error("public service entrypoints must not query the pool directly"); } } as unknown as pg.Pool;
  const contexts: unknown[] = [];
  const runner: ProgressPaymentTenantTransactionRunner = async (_pool, context, work) => {
    assert.equal(_pool, pool);
    contexts.push(context);
    return work(client);
  };
  return { service: new ProgressPaymentService(pool, runner), queries, contexts };
}

test("read entrypoints bind actor context and reuse one checked-out client", async () => {
  const list = fixture([{ rows: [] }]);
  assert.deepEqual(await list.service.list(actor), []);
  assert.deepEqual(list.contexts, [actor]);

  const detail = fixture([{ rows: [{ id: "contract" }] }, { rows: [] }, { rows: [] }, { rows: [] }]);
  assert.deepEqual(await detail.service.detail(actor, "contract"), { contract: { id: "contract" }, items: [], periods: [], variations: [] });
  assert.deepEqual(detail.contexts, [actor]);

  const period = fixture([{ rows: [{ id: "period" }] }, { rows: [] }, { rows: [] }, { rows: [] }, { rows: [] }]);
  const result = await period.service.periodDetail(actor, "period");
  assert.equal((result.period as { id: string }).id, "period");
  assert.deepEqual(period.contexts, [actor]);
});

test("createContract does not open a nested transaction for its detail response", async () => {
  const contract = { id: "33333333-3333-4333-8333-333333333333" };
  const scope = fixture([
    { rows: [contract] },
    { rows: [], rowCount: 1 },
    { rows: [contract] },
    { rows: [] },
    { rows: [] },
    { rows: [] },
  ]);
  const result = await scope.service.createContract(actor, {
    contractNumber: "C-1",
    projectName: "Fixture",
    currency: "TRY",
    regime: "unit_price",
    initialAmount: "10.00",
    sourceDocumentHash: "a".repeat(64),
    items: [{ itemCode: "I-1", description: "Item", unit: "m", contractQuantity: "1.0000", unitPrice: "10.00", sourceHash: "b".repeat(64) }],
  });
  assert.equal((result.contract as { id: string }).id, contract.id);
  assert.deepEqual(scope.contexts, [actor]);
  assert.equal(scope.queries.filter(({ text }) => /\bBEGIN\b|\bCOMMIT\b|\bROLLBACK\b/i.test(text)).length, 0);
});
