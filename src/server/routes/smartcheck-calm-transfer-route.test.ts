import assert from "node:assert/strict";
import test from "node:test";
import { registerSmartCheckRoutes } from "./smartcheck";

function routeHandler() {
  const routes = new Map<string, Function>();
  const app: any = Object.fromEntries(["get", "post", "patch", "put"].map((method) => [method,
    (path: string, ...handlers: Function[]) => routes.set(`${method} ${path}`, handlers.at(-1)!),
  ]));
  registerSmartCheckRoutes(app);
  return routes.get("post /api/smartcheck/documents/:id/transfer-calm-to-quotation")!;
}

function response() {
  return { statusCode: 200, body: undefined as any,
    status(code: number) { this.statusCode = code; return this; },
    json(body: unknown) { this.body = body; return this; },
  };
}

test("Calm transfer route requires Idempotency-Key before database access", async () => {
  const res = response();
  await routeHandler()({ params: { id: "11111111-1111-4111-8111-111111111111" }, headers: {}, get: () => undefined,
    user: { companyId: "company", userId: "user", role: "owner" }, body: {} }, res);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.code, "CALM_TRANSFER_IDEMPOTENCY_KEY_REQUIRED");
});

test("Calm transfer route rejects body document identity and malformed strict payload", async () => {
  const res = response();
  await routeHandler()({ params: { id: "11111111-1111-4111-8111-111111111111" }, headers: { "idempotency-key": "attempt" }, get: () => "attempt",
    user: { companyId: "company", userId: "user", role: "owner" }, body: {
      sourceDocumentId: "22222222-2222-4222-8222-222222222222",
      quotationId: "33333333-3333-4333-8333-333333333333",
      priceSnapshotIdsByCalmLineId: { "duvar-fayans": "55555555-5555-4555-8555-555555555555" },
    } }, res);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.code, "CALM_TRANSFER_REQUEST_INVALID");
});
