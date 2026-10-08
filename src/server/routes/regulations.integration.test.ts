import assert from "node:assert/strict";
import crypto from "node:crypto";
import http from "node:http";
import test from "node:test";
import dotenv from "dotenv";
import { skipIfDatabaseUnavailable } from "./test-db-reachability";
import { useTestIsolation } from "./test-isolation";

dotenv.config({ path: ".env.local" });
dotenv.config();
useTestIsolation();

test("regulation alerts are tenant-scoped", { timeout: 30_000 }, async (t) => {
  if (await skipIfDatabaseUnavailable(t)) return;
  const [{ createApiApp }, schema, dbModule, { AuthService }] = await Promise.all([
    import("../app"), import("../../db/schema"), import("../../db"), import("../../services/auth/authService"),
  ]);
  const { and, eq } = await import("drizzle-orm");
  const db = dbModule.db;
  const suffix = crypto.randomUUID();
  const [companyA, companyB] = await Promise.all([
    db.insert(schema.companies).values({ name: `Regulation Isolation A ${suffix}` }).returning(),
    db.insert(schema.companies).values({ name: `Regulation Isolation B ${suffix}` }).returning(),
  ]).then(([a, b]) => [a[0], b[0]] as const);
  const [userA] = await db.insert(schema.users).values({ email: `regulation-a-${suffix}@example.test`, fullName: "Regulation Tenant A", emailVerified: new Date() }).returning();
  const [userB] = await db.insert(schema.users).values({ email: `regulation-b-${suffix}@example.test`, fullName: "Regulation Tenant B", emailVerified: new Date() }).returning();
  await db.insert(schema.memberships).values([{ companyId: companyA.id, userId: userA.id, role: "owner" }, { companyId: companyB.id, userId: userB.id, role: "owner" }]);
  const tokenA = AuthService.generateToken({ userId: userA.id, companyId: companyA.id, role: "owner" });
  const tokenB = AuthService.generateToken({ userId: userB.id, companyId: companyB.id, role: "owner" });
  const [alertA] = await db.insert(schema.regulationAlerts).values({ companyId: companyA.id, title: `Tenant A alert ${suffix}`, category: "legal", effectiveDate: new Date("2026-08-01"), impactLevel: "low", summary: "A only", affectedModules: ["mechanical"] }).returning();
  const [alertB] = await db.insert(schema.regulationAlerts).values({ companyId: companyB.id, title: `Tenant B alert ${suffix}`, category: "tax", effectiveDate: new Date("2026-08-02"), impactLevel: "medium", summary: "B only", affectedModules: ["electrical"] }).returning();
  const server = http.createServer(createApiApp());
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const base = `http://127.0.0.1:${typeof address === "object" && address ? address.port : 0}`;
  const request = (token: string) => fetch(`${base}/api/regulations/alerts`, { headers: { Authorization: `Bearer ${token}` } });
  try {
    const [responseA, responseB] = await Promise.all([request(tokenA), request(tokenB)]);
    assert.equal(responseA.status, 200);
    assert.equal(responseB.status, 200);
    const [alertsA, alertsB] = await Promise.all([responseA.json() as Promise<Array<{ id: string; companyId: string }>>, responseB.json() as Promise<Array<{ id: string; companyId: string }>>]);
    assert.deepEqual(alertsA.map((alert) => alert.id), [alertA.id]);
    assert.deepEqual(alertsB.map((alert) => alert.id), [alertB.id]);
    assert.ok(alertsA.every((alert) => alert.companyId === companyA.id));
    assert.ok(alertsB.every((alert) => alert.companyId === companyB.id));
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await db.delete(schema.regulationAlerts).where(and(eq(schema.regulationAlerts.id, alertA.id), eq(schema.regulationAlerts.companyId, companyA.id)));
    await db.delete(schema.regulationAlerts).where(and(eq(schema.regulationAlerts.id, alertB.id), eq(schema.regulationAlerts.companyId, companyB.id)));
    await db.delete(schema.memberships).where(eq(schema.memberships.userId, userA.id));
    await db.delete(schema.memberships).where(eq(schema.memberships.userId, userB.id));
    await db.delete(schema.users).where(eq(schema.users.id, userA.id));
    await db.delete(schema.users).where(eq(schema.users.id, userB.id));
    await db.delete(schema.companies).where(eq(schema.companies.id, companyA.id));
    await db.delete(schema.companies).where(eq(schema.companies.id, companyB.id));
  }
});
