import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";
import { createUsageTracker, PLAN_LIMITS } from "./usage";
import { PLAN_LIMITS as canonicalLimits } from "../../services/billing/limits";
import { QuotaError } from "../../services/billing/quota";

function response() {
  return Object.assign(new EventEmitter(), { statusCode: 200, body: undefined as unknown,
    status(code: number) { this.statusCode = code; return this; },
    json(body: unknown) { this.body = body; return this; } });
}

test("usage DB/preflight failure responds 503 without calling next", async () => {
  const middleware = createUsageTracker({ checkQuota: async () => { throw new Error("private db connection details"); }, logUsage: async () => {} })("QUOTATION_CREATED");
  const res = response();
  let next = false;
  await middleware({ user: { companyId: "company", userId: "actor" } } as any, res as any, () => { next = true; });
  assert.equal(next, false);
  assert.equal(res.statusCode, 503);
  assert.deepEqual(res.body, { error: "Quotation quota is temporarily unavailable", code: "QUOTA_UNAVAILABLE" });
  assert.equal(res.listenerCount("finish"), 0);
});

test("quota denial returns 403 and preserves zero limits", async () => {
  const middleware = createUsageTracker({ checkQuota: async () => { throw new QuotaError(403, "QUOTA_EXCEEDED", "Monthly quotation quota exceeded", { limit: 0, current: 0, period: "2026-10" }); }, logUsage: async () => {} })("QUOTATION_CREATED");
  const res = response();
  await middleware({ user: { companyId: "company" } } as any, res as any, () => assert.fail("must not next"));
  assert.equal(res.statusCode, 403);
  assert.deepEqual(res.body, { error: "Monthly quotation quota exceeded", code: "QUOTA_EXCEEDED", limit: 0, current: 0, period: "2026-10" });
});

test("successful quote attaches audit only; failed responses do not log", async () => {
  const calls: unknown[] = [];
  const middleware = createUsageTracker({ checkQuota: async () => {}, logUsage: async (...args) => { calls.push(args); } })("QUOTATION_CREATED");
  for (const status of [200, 201, 400, 500]) {
    const res = response();
    await middleware({ user: { companyId: "company", userId: "actor" } } as any, res as any, () => {});
    res.statusCode = status;
    res.emit("finish");
  }
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(calls, [["company", "actor", "QUOTATION_CREATED"], ["company", "actor", "QUOTATION_CREATED"]]);
});

test("detached audit rejection is guarded and unrelated features do not consume quote quota", async (t) => {
  const logged = t.mock.method(console, "error", () => {});
  const middleware = createUsageTracker({ checkQuota: async () => assert.fail("not quote creation"), logUsage: async () => { throw new Error("private details"); } })("PDF_GENERATED");
  const res = response();
  let next = false;
  await middleware({ user: { companyId: "company", userId: "actor" } } as any, res as any, () => { next = true; });
  res.emit("finish");
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(next, true);
  assert.equal(res.statusCode, 200);
  assert.equal(logged.mock.callCount(), 1);
  assert.equal(JSON.stringify(logged.mock.calls[0].arguments).includes("private details"), false);
  assert.equal(PLAN_LIMITS, canonicalLimits);
});
