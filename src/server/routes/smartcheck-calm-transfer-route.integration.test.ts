import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import dotenv from "dotenv";
import { skipIfDatabaseUnavailable } from "./test-db-reachability";
import { useTestIsolation } from "./test-isolation";

dotenv.config({ path: ".env.local" });
dotenv.config();
useTestIsolation();

async function routeHandler(path: string) {
  const { registerSmartCheckRoutes } = await import("./smartcheck");
  const routes = new Map<string, Function>();
  const app: any = Object.fromEntries(["get", "post", "patch", "put"].map((method) => [method,
    (route: string, ...handlers: Function[]) => routes.set(`${method} ${route}`, handlers.at(-1)!),
  ]));
  registerSmartCheckRoutes(app);
  return routes.get(`post /api/smartcheck/documents/:id/${path}`)!;
}

function response() {
  return { statusCode: 200, body: undefined as any,
    status(code: number) { this.statusCode = code; return this; },
    json(body: unknown) { this.body = body; return this; },
  };
}

test("both Calm transfer routes reach the service and map its refusal for a viewer", async (t) => {
  if (await skipIfDatabaseUnavailable(t, "Calm transfer route service test")) return;
  const [{ db }, schema] = await Promise.all([import("../../db"), import("../../db/schema")]);
  const suffix = crypto.randomUUID();
  const [company] = await db.insert(schema.companies).values({ name: `Calm route ${suffix}` }).returning();
  const [viewer] = await db.insert(schema.users).values({ email: `calm-route-${suffix}@example.test`, fullName: "Calm Viewer", emailVerified: new Date() }).returning();
  await db.insert(schema.memberships).values({ companyId: company.id, userId: viewer.id, role: "viewer" });
  const lines = { "duvar-fayans": "55555555-5555-4555-8555-555555555555" };
  for (const [path, body] of [
    ["transfer-calm-to-quotation", { quotationId: "33333333-3333-4333-8333-333333333333", priceSnapshotIdsByCalmLineId: lines }],
    ["transfer-calm-to-new-quotation", { clientName: "Örnek Yapı A.Ş.", projectName: "Konut", priceSnapshotIdsByCalmLineId: lines }],
  ] as const) {
    const res = response();
    await (await routeHandler(path))({ params: { id: "11111111-1111-4111-8111-111111111111" }, headers: {}, get: () => `attempt-${path}`,
      user: { companyId: company.id, userId: viewer.id, role: "viewer" }, body }, res);
    assert.equal(res.statusCode, 403, path);
    assert.equal(res.body.code, "CALM_TRANSFER_ACTOR_NOT_AUTHORIZED", path);
  }
});
