import assert from "node:assert/strict";
import { test } from "node:test";
import { authenticate } from "../middleware/auth";
import { CompanyIndustrySettingsServiceError } from "../../services/company-industry-settings/service";
import { registerCompanyRoutes } from "./company";

function routes(service: any) {
  let getRoute: any[] = [];
  let postRoute: any[] = [];
  const app: any = {
    get(path: string, ...handlers: any[]) { if (path === "/api/company/industry-settings") getRoute = handlers; },
    post(path: string, ...handlers: any[]) { if (path === "/api/company/industry-settings") postRoute = handlers; },
    patch() {},
  };
  registerCompanyRoutes(app, service);
  return { getRoute, postRoute };
}

function response() {
  return {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) { this.statusCode = code; return this; },
    json(body: unknown) { this.body = body; return this; },
  };
}

const actor = { companyId: "11111111-1111-4111-8111-111111111111", userId: "22222222-2222-4222-8222-222222222222", role: "owner" };

test("industry settings routes preserve auth/role gates and use the injected tenant service", async () => {
  const calls: unknown[] = [];
  const service = {
    async list(received: unknown) { calls.push(["list", received]); return [{ industryId: "construction", isEnabled: true }]; },
    async setEnabled(received: unknown, input: unknown) { calls.push(["set", received, input]); return { industryId: "construction", isEnabled: false }; },
  };
  const { getRoute, postRoute } = routes(service);
  assert.equal(getRoute[0], authenticate);
  assert.equal(postRoute[0], authenticate);
  assert.equal(typeof postRoute[1], "function");

  const getResponse = response();
  await getRoute[1]({ user: actor }, getResponse, () => assert.fail("unexpected next"));
  assert.deepEqual(getResponse.body, [{ industryId: "construction", isEnabled: true }]);

  const postResponse = response();
  await postRoute[2]({ user: actor, body: { industryId: "construction", isEnabled: false } }, postResponse, () => assert.fail("unexpected next"));
  assert.deepEqual(postResponse.body, { success: true, setting: { industryId: "construction", isEnabled: false } });
  assert.deepEqual(calls, [["list", actor], ["set", actor, { industryId: "construction", isEnabled: false }]]);
});

test("industry setting mutation rejects malformed, coercible, tenant-forging, and extra input", async () => {
  const service = { async list() { return []; }, async setEnabled() { assert.fail("service must not run"); } };
  const handler = routes(service).postRoute[2];
  for (const body of [
    {},
    { industryId: "UPPER", isEnabled: true },
    { industryId: "construction", isEnabled: "true" },
    { industryId: "construction", isEnabled: true, companyId: actor.companyId },
    { industryId: "construction", isEnabled: true, unexpected: 1 },
  ]) {
    const res = response();
    await handler({ user: actor, body }, res, () => assert.fail("unexpected next"));
    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.body, { error: "Geçersiz sektör ayarı.", code: "INDUSTRY_SETTING_INPUT_INVALID" });
  }
});

test("industry setting typed failures are safe and unexpected failures reach error middleware", async () => {
  const typed = routes({
    async list() { return []; },
    async setEnabled() { throw new CompanyIndustrySettingsServiceError(404, "INDUSTRY_NOT_FOUND", "Sektör bulunamadı."); },
  }).postRoute[2];
  const typedResponse = response();
  await typed({ user: actor, body: { industryId: "missing", isEnabled: true } }, typedResponse, () => assert.fail("unexpected next"));
  assert.equal(typedResponse.statusCode, 404);
  assert.deepEqual(typedResponse.body, { error: "Sektör bulunamadı.", code: "INDUSTRY_NOT_FOUND" });

  const failure = new Error("private database detail");
  const unexpected = routes({ async list() { throw failure; }, async setEnabled() { return {}; } }).getRoute[1];
  const unexpectedResponse = response();
  let forwarded: unknown;
  await unexpected({ user: actor }, unexpectedResponse, (error: unknown) => { forwarded = error; });
  assert.equal(forwarded, failure);
  assert.equal(unexpectedResponse.body, undefined);
});

test("industry settings reject tenantless sessions before invoking the service", async () => {
  const service = { async list() { assert.fail("service must not run"); }, async setEnabled() { assert.fail("service must not run"); } };
  const { getRoute, postRoute } = routes(service);
  for (const [handler, body] of [[getRoute[1], undefined], [postRoute[2], { industryId: "residential", isEnabled: true }]] as const) {
    const res = response();
    await handler({ user: { ...actor, companyId: "" }, body }, res, () => assert.fail("unexpected next"));
    assert.equal(res.statusCode, 403);
    assert.deepEqual(res.body, { error: "Şirket üyeliği gereklidir.", code: "COMPANY_MEMBERSHIP_REQUIRED" });
  }
});
