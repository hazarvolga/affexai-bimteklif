import assert from "node:assert/strict";
import crypto from "node:crypto";
import http from "node:http";
import test from "node:test";
import dotenv from "dotenv";
import { eq } from "drizzle-orm";
import { skipIfDatabaseUnavailable } from "../../server/routes/test-db-reachability";
import { useTestIsolation } from "../../server/routes/test-isolation";

dotenv.config({ path: ".env.local" });
dotenv.config();
useTestIsolation();

test("Tenant IFC plan-based limits, planless policy, and fail-closed behavior", { timeout: 30_000 }, async (t) => {
  if (await skipIfDatabaseUnavailable(t)) return;
  process.env.SMARTCHECK_IMPORT_ENABLED = "true";

  const [
    { createApiApp },
    schema,
    dbModule,
    { AuthService },
    { fetchTenantIfcLimits, IfcNotAvailableError, IfcLimitsUnavailableError }
  ] = await Promise.all([
    import("../../server/app"),
    import("../../db/schema"),
    import("../../db"),
    import("../../services/auth/authService"),
    import("./config"),
  ]);

  const db = dbModule.db;
  const suffix = crypto.randomUUID();

  // Create two plans: 50MB (cheaper) and 100MB (more expensive)
  const [plan50] = await db.insert(schema.plans).values({
    name: `50MB Plan ${suffix}`,
    monthlyPrice: 1000,
    monthlyQuoteLimit: 50,
    monthlyIfcLimit: 10,
    ifcMaxFileMb: 50,
    ifcMaxConcurrent: 1,
    isActive: true,
  }).returning();

  const [plan100] = await db.insert(schema.plans).values({
    name: `100MB Plan ${suffix}`,
    monthlyPrice: 2000,
    monthlyQuoteLimit: 100,
    monthlyIfcLimit: 25,
    ifcMaxFileMb: 100,
    ifcMaxConcurrent: 2,
    isActive: true,
  }).returning();

  // Create two companies
  const [companyA] = await db.insert(schema.companies).values({
    name: `Company 50MB ${suffix}`,
  }).returning();

  const [companyB] = await db.insert(schema.companies).values({
    name: `Company 100MB ${suffix}`,
  }).returning();

  // Company A subscribes to 50MB plan
  await db.insert(schema.subscriptions).values({
    companyId: companyA.id,
    planId: plan50.id,
    plan: "starter",
    status: "active",
    bonusIfcLimit: 0,
    currentPeriodStart: new Date("2020-01-01T00:00:00Z"),
  });

  // Company B subscribes to 100MB plan
  await db.insert(schema.subscriptions).values({
    companyId: companyB.id,
    planId: plan100.id,
    plan: "pro",
    status: "active",
    bonusIfcLimit: 5,
    currentPeriodStart: new Date("2020-01-01T00:00:00Z"),
  });

  const [userA] = await db.insert(schema.users).values({
    email: `usera-${suffix}@example.test`,
    fullName: "User A",
    emailVerified: new Date(),
  }).returning();
  await db.insert(schema.memberships).values({ companyId: companyA.id, userId: userA.id, role: "owner" });

  const [userB] = await db.insert(schema.users).values({
    email: `userb-${suffix}@example.test`,
    fullName: "User B",
    emailVerified: new Date(),
  }).returning();
  await db.insert(schema.memberships).values({ companyId: companyB.id, userId: userB.id, role: "owner" });

  const tokenA = AuthService.generateToken({ userId: userA.id, companyId: companyA.id, role: "owner" });
  const tokenB = AuthService.generateToken({ userId: userB.id, companyId: companyB.id, role: "owner" });

  const app = createApiApp();
  const server = http.createServer(app);
  t.after(() => server.close());
  await new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(undefined)));
  const address = server.address();
  const base = `http://127.0.0.1:${typeof address === "object" && address ? address.port : 0}`;

  await t.test("two different plans enforce 50MB vs 100MB; bonus increases monthly quota; plan change updates immediately", async () => {
    const limitsA = await fetchTenantIfcLimits(companyA.id);
    assert.strictEqual(limitsA.maxFileBytes, 50 * 1024 * 1024);
    assert.strictEqual(limitsA.maxConcurrent, 1);
    assert.strictEqual(limitsA.monthlyLimit, 10);

    const limitsB = await fetchTenantIfcLimits(companyB.id);
    assert.strictEqual(limitsB.maxFileBytes, 100 * 1024 * 1024);
    assert.strictEqual(limitsB.maxConcurrent, 2);
    // 25 from plan + 5 bonus = 30
    assert.strictEqual(limitsB.monthlyLimit, 30);

    // 60 MB file upload attempt for Company A (50MB limit) -> rejected with 400
    const sixtyMb = 60 * 1024 * 1024;
    const resA = await fetch(`${base}/api/smartcheck/documents/uploads`, {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenA}`, "Content-Type": "application/json" },
      body: JSON.stringify({ fileName: "project.ifc", mimeType: "model/ifc", fileSizeBytes: sixtyMb }),
    });
    assert.strictEqual(resA.status, 400);

    // Same 60 MB file upload attempt for Company B (100MB limit) -> accepted with 201
    const resB = await fetch(`${base}/api/smartcheck/documents/uploads`, {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenB}`, "Content-Type": "application/json" },
      body: JSON.stringify({ fileName: "project.ifc", mimeType: "model/ifc", fileSizeBytes: sixtyMb }),
    });
    assert.strictEqual(resB.status, 201);
    const bodyB = await resB.json() as { maxFileSizeBytes: number };
    assert.strictEqual(bodyB.maxFileSizeBytes, 100 * 1024 * 1024);

    // Now upgrade Company A from 50MB plan to 100MB plan
    await db.update(schema.subscriptions).set({
      planId: plan100.id,
      bonusIfcLimit: 10,
    }).where(eq(schema.subscriptions.companyId, companyA.id));

    // Verify Company A now immediately gets the 100MB limit and 35 monthly quota (25 + 10)
    const upgradedLimitsA = await fetchTenantIfcLimits(companyA.id);
    assert.strictEqual(upgradedLimitsA.maxFileBytes, 100 * 1024 * 1024);
    assert.strictEqual(upgradedLimitsA.maxConcurrent, 2);
    assert.strictEqual(upgradedLimitsA.monthlyLimit, 35);

    // 60 MB upload for Company A now succeeds!
    const resAUpgraded = await fetch(`${base}/api/smartcheck/documents/uploads`, {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenA}`, "Content-Type": "application/json" },
      body: JSON.stringify({ fileName: "project.ifc", mimeType: "model/ifc", fileSizeBytes: sixtyMb }),
    });
    assert.strictEqual(resAUpgraded.status, 201);
  });

  await t.test("planless company receives the limits of the lowest-priced active plan", async () => {
    // Create Company C without planId
    const [companyC] = await db.insert(schema.companies).values({
      name: `Planless Company ${suffix}`,
    }).returning();

    await db.insert(schema.subscriptions).values({
      companyId: companyC.id,
      planId: null, // Planless!
      plan: "starter",
      status: "active",
      bonusIfcLimit: 0,
      currentPeriodStart: new Date("2020-01-01T00:00:00Z"),
    });

    const limitsC = await fetchTenantIfcLimits(companyC.id);
    // Lowest active plan is plan50 (monthlyPrice: 1000 vs 2000)
    assert.strictEqual(limitsC.maxFileBytes, 50 * 1024 * 1024);
    assert.strictEqual(limitsC.maxConcurrent, 1);
    assert.strictEqual(limitsC.monthlyLimit, 10);
  });

  await t.test("planless company with NO active plans gets 403 IFC_NOT_AVAILABLE", async () => {
    // Deactivate all plans
    await db.update(schema.plans).set({ isActive: false });

    // Company C (planless) should fail with IfcNotAvailableError
    const [companyD] = await db.insert(schema.companies).values({
      name: `Planless Inactive ${suffix}`,
    }).returning();
    await db.insert(schema.subscriptions).values({
      companyId: companyD.id,
      planId: null,
      status: "active",
      currentPeriodStart: new Date("2020-01-01T00:00:00Z"),
    });

    await assert.rejects(
      () => fetchTenantIfcLimits(companyD.id),
      (err: any) => err instanceof IfcNotAvailableError && err.status === 403 && err.code === "IFC_NOT_AVAILABLE"
    );

    // Also via HTTP upload endpoint
    const [userD] = await db.insert(schema.users).values({
      email: `userd-${suffix}@example.test`,
      fullName: "User D",
      emailVerified: new Date(),
    }).returning();
    await db.insert(schema.memberships).values({ companyId: companyD.id, userId: userD.id, role: "owner" });
    const tokenD = AuthService.generateToken({ userId: userD.id, companyId: companyD.id, role: "owner" });

    const resD = await fetch(`${base}/api/smartcheck/documents/uploads`, {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenD}`, "Content-Type": "application/json" },
      body: JSON.stringify({ fileName: "project.ifc", mimeType: "model/ifc", fileSizeBytes: 1024 }),
    });
    assert.strictEqual(resD.status, 403);
    const bodyD = await resD.json() as { code: string };
    assert.strictEqual(bodyD.code, "IFC_NOT_AVAILABLE");

    // Restore plan activity
    await db.update(schema.plans).set({ isActive: true });
  });

  await t.test("DB error fails closed (returns 503 IFC_LIMITS_UNAVAILABLE, never expands limits)", async () => {
    // Mock dbClient to simulate a DB query failure
    const brokenDb = {
      select: () => {
        throw new Error("POSTGRES_CONNECTION_TERMINATED");
      },
    };

    await assert.rejects(
      () => fetchTenantIfcLimits(companyA.id, brokenDb),
      (err: any) => err instanceof IfcLimitsUnavailableError && err.status === 503 && err.code === "IFC_LIMITS_UNAVAILABLE"
    );
  });
});
