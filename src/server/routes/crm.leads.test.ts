import assert from "node:assert/strict";
import test from "node:test";
import { authenticate } from "../middleware/auth";
import { QuotaError } from "../../services/billing/quota-policy";
import { registerCrmRoutes } from "./crm";

const actor = { companyId: "11111111-1111-4111-8111-111111111111", userId: "22222222-2222-4222-8222-222222222222" };
const canMutate = () => undefined;

function routes(service: any) {
  const handlers = new Map<string, Function[]>();
  const app: any = {
    get(path: string, ...fns: Function[]) { handlers.set(`GET ${path}`, fns); },
    post(path: string, ...fns: Function[]) { handlers.set(`POST ${path}`, fns); },
  };
  registerCrmRoutes(app, {} as any, canMutate, service);
  return handlers;
}
function response() { return { statusCode: 200, body: undefined as unknown, status(code: number) { this.statusCode = code; return this; }, json(body: unknown) { this.body = body; return this; } }; }

test("lead routes retain auth/mutation gates and delegate sanitized data to the tenant service", async () => {
  const calls: unknown[] = [];
  const service = {
    async list(received: unknown, pagination: unknown) { calls.push(["list", received, pagination]); return [{ id: "lead-a" }]; },
    async create(received: unknown, input: unknown) { calls.push(["create", received, input]); return { id: "lead-b", status: "new" }; },
  };
  const registered = routes(service);
  const get = registered.get("GET /api/crm/leads")!;
  const post = registered.get("POST /api/crm/leads")!;
  assert.deepEqual(get.slice(0, 1), [authenticate]);
  assert.deepEqual(post.slice(0, 2), [authenticate, canMutate]);
  assert.equal(post.length, 3, "lead POST must not retain detached usage middleware");
  const listed = response();
  await get.at(-1)!({ user: actor, query: { limit: "2", offset: "3" } }, listed, assert.fail);
  assert.deepEqual(listed.body, [{ id: "lead-a" }]);
  const created = response();
  await post.at(-1)!({ user: actor, body: { name: "  Ada  ", email: "", phone: " 555 ", source: null } }, created, assert.fail);
  assert.equal(created.statusCode, 201);
  assert.deepEqual(calls, [
    ["list", actor, { limit: 2, offset: 3 }],
    ["create", actor, { name: "Ada", email: null, phone: "555", source: null }],
  ]);
});

test("lead handlers reject tenant/status/unknown fields, controls, bad emails and noncanonical pagination", async () => {
  const service = { async list() { assert.fail("list must not run"); }, async create() { assert.fail("create must not run"); } };
  const registered = routes(service);
  for (const body of [
    {}, { name: "A", companyId: actor.companyId }, { name: "A", status: "won" }, { name: "A", extra: true },
    { name: "A\nB" }, { name: "A\n" }, { name: "A", email: "bad" }, { name: "A", email: "a@b.test\n" }, { name: "A", phone: "x\u0000" },
  ]) {
    const res = response();
    await registered.get("POST /api/crm/leads")!.at(-1)!({ user: actor, body }, res, assert.fail);
    assert.equal(res.statusCode, 400);
  }
  for (const query of [{ limit: "0" }, { limit: "201" }, { limit: "1.5" }, { limit: "1x" }, { limit: ["1"] }, { offset: "-1" }, { offset: "1001" }, { offset: "1.0" }, { extra: "1" }]) {
    const res = response();
    await registered.get("GET /api/crm/leads")!.at(-1)!({ user: actor, query }, res, assert.fail);
    assert.equal(res.statusCode, 400, JSON.stringify(query));
  }
});

test("lead handlers fail closed with 403 when an authenticated session has no tenant", async () => {
  const service = { async list() { assert.fail("list must not run"); }, async create() { assert.fail("create must not run"); } };
  const registered = routes(service);
  for (const [key, request] of [
    ["GET /api/crm/leads", { user: { ...actor, companyId: null }, query: {} }],
    ["POST /api/crm/leads", { user: { ...actor, companyId: null }, body: { name: "A" } }],
  ] as const) {
    const res = response(); await registered.get(key)!.at(-1)!(request, res, assert.fail);
    assert.equal(res.statusCode, 403); assert.deepEqual(res.body, { error: "Company is required", code: "COMPANY_REQUIRED" });
  }
});

test("lead handlers preserve typed quota errors and forward unexpected failures", async () => {
  const quota = routes({ async list() { return []; }, async create() { throw new QuotaError(403, "CRM_QUOTA_EXCEEDED", "Monthly feature quota exceeded", { current: 1, limit: 1, period: "2026-10" }); } });
  const quotaResponse = response();
  await quota.get("POST /api/crm/leads")!.at(-1)!({ user: actor, body: { name: "A" } }, quotaResponse, assert.fail);
  assert.equal(quotaResponse.statusCode, 403);
  assert.deepEqual(quotaResponse.body, { error: "Monthly feature quota exceeded", code: "CRM_QUOTA_EXCEEDED", current: 1, limit: 1, period: "2026-10" });

  const failure = new Error("private database detail");
  const unexpected = routes({ async list() { return []; }, async create() { throw failure; } });
  let forwarded: unknown;
  await unexpected.get("POST /api/crm/leads")!.at(-1)!({ user: actor, body: { name: "A" } }, response(), (error: unknown) => { forwarded = error; });
  assert.equal(forwarded, failure);
});
