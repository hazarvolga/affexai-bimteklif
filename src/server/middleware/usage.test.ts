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

test("AI reserves quota before provider execution, including failed attempts, without duplicate audit", async () => {
  const events: string[] = [];
  const middleware = createUsageTracker({ checkQuota: async () => {}, logUsage: async () => { events.push('audit'); },
    reserveAiQuota: async () => { events.push('reserved'); },
  } as any)("AI_QUOTATION_GENERATED");
  const res = response();
  await middleware({ user: { companyId: 'company', userId: 'user' } } as any, res as any, () => { events.push('provider'); });
  res.emit('finish');
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(events, ['reserved', 'provider']);
});

test("AI reservation failure never reaches provider", async () => {
  const middleware = createUsageTracker({ checkQuota: async () => {}, logUsage: async () => {},
    reserveAiQuota: async () => { throw new QuotaError(403, 'AI_QUOTA_EXCEEDED', 'Monthly AI quota exceeded'); },
  } as any)("AI_QUOTATION_GENERATED");
  const res = response();
  await middleware({ user: { companyId: 'company', userId: 'user' } } as any, res as any, () => assert.fail('provider must not execute'));
  assert.equal(res.statusCode, 403);
});

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
  const middleware = createUsageTracker({ checkQuota: async () => assert.fail("not quote creation"), logUsage: async () => { throw new Error("private details"); } })("DOCUMENT_EXPORTED");
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

for (const feature of ["PDF_GENERATED", "CRM_ACTION_EXECUTED", "REGULATION_CHECK_RUN", "PROFIT_ANALYSIS_RUN"]) {
  test(`${feature} reserves package quota before work and releases it only when the response fails`, async () => {
    const events: string[] = [];
    const middleware = createUsageTracker({ checkQuota: async () => assert.fail("not quote creation"),
      logUsage: async () => { events.push("audit"); },
      reserveFeatureQuota: async (_c, _u, reserved) => { events.push(`reserve:${reserved}`); return { id: "r1" }; },
      releaseFeatureQuota: async (_c, id) => { events.push(`release:${id}`); },
    })(feature);
    for (const status of [200, 404]) {
      const res = response();
      await middleware({ user: { companyId: "company", userId: "actor" } } as any, res as any, () => { events.push("work"); });
      res.statusCode = status;
      res.emit("finish");
    }
    await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(events, [`reserve:${feature}`, "work", `reserve:${feature}`, "work", "release:r1"]);
  });
}

test("metered quota denial blocks the work with the feature's code", async () => {
  const middleware = createUsageTracker({ checkQuota: async () => {}, logUsage: async () => {},
    reserveFeatureQuota: async () => { throw new QuotaError(403, "PDF_QUOTA_EXCEEDED", "Monthly feature quota exceeded", { limit: 10, current: 10, period: "2026-10" }); },
    releaseFeatureQuota: async () => assert.fail("nothing to release"),
  })("PDF_GENERATED");
  const res = response();
  await middleware({ user: { companyId: "company", userId: "actor" } } as any, res as any, () => assert.fail("must not generate"));
  assert.equal(res.statusCode, 403);
  assert.deepEqual(res.body, { error: "Monthly feature quota exceeded", code: "PDF_QUOTA_EXCEEDED", limit: 10, current: 10, period: "2026-10" });
});
