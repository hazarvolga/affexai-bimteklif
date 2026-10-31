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

test("pilot application conversion provisions a real company, user, and membership", { timeout: 30_000 }, async (t) => {
  if (await skipIfDatabaseUnavailable(t)) return;
  assert.equal(process.env.AUTH_EMAIL_WEBHOOK_URL, "", "integration must never send external auth email");
  const [{ createApiApp }, schema, dbModule, { AuthService }] = await Promise.all([
    import("../app"), import("../../db/schema"), import("../../db"), import("../../services/auth/authService"),
  ]);
  const { eq } = await import("drizzle-orm");
  const db = dbModule.db;
  const suffix = crypto.randomUUID();

  const [adminCompany] = await db.insert(schema.companies).values({ name: `Admin Co ${suffix}` }).returning();
  const [adminUser] = await db.insert(schema.users).values({ email: `pilot-admin-${suffix}@example.test`, fullName: "Pilot Admin", emailVerified: new Date(), isSuperAdmin: true }).returning();
  await db.insert(schema.memberships).values({ companyId: adminCompany.id, userId: adminUser.id, role: "owner" });
  const [viewerUser] = await db.insert(schema.users).values({ email: `pilot-viewer-${suffix}@example.test`, fullName: "Pilot Viewer", emailVerified: new Date() }).returning();
  await db.insert(schema.memberships).values({ companyId: adminCompany.id, userId: viewerUser.id, role: "viewer" });
  const ownerToken = AuthService.generateToken({ userId: adminUser.id, companyId: adminCompany.id, role: "owner" });
  const viewerToken = AuthService.generateToken({ userId: viewerUser.id, companyId: adminCompany.id, role: "viewer" });
  const [ownerUser] = await db.insert(schema.users).values({ email: `pilot-owner-${suffix}@example.test`, fullName: "Regular Owner", emailVerified: new Date() }).returning();
  await db.insert(schema.memberships).values({ companyId: adminCompany.id, userId: ownerUser.id, role: "owner" });
  const regularOwnerToken = AuthService.generateToken({ userId: ownerUser.id, companyId: adminCompany.id, role: "owner" });

  const [existingCollisionUser] = await db.insert(schema.users).values({ emailVerified: new Date(), email: `pilot-collision-${suffix}@example.test`, fullName: "Existing User" }).returning();

  const [application] = await db.insert(schema.pilotApplications).values({ fullName: `Pilot Contact ${suffix}`, companyName: `Pilot Firma ${suffix}`, email: `pilot-contact-${suffix}@example.test`, consentAt: new Date() }).returning();
  const [collisionApplication] = await db.insert(schema.pilotApplications).values({ fullName: `Collision Contact ${suffix}`, companyName: `Collision Firma ${suffix}`, email: existingCollisionUser.email, consentAt: new Date() }).returning();

  const server = http.createServer(createApiApp());
  t.after(() => new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
    server.closeAllConnections();
  }));
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const base = `http://127.0.0.1:${typeof address === "object" && address ? address.port : 0}`;
  const request = (path: string, init: RequestInit = {}, token = ownerToken) => fetch(`${base}${path}`, { ...init, method: init.method ?? "POST", headers: { Authorization: `Bearer ${token}`, ...(init.headers ?? {}) } });

  let provisionedCompanyId = "";
  let provisionedUserId = "";
  {
    const forbidden = await request(`/api/pilot-applications/${application.id}/convert`, {}, viewerToken);
    assert.equal(forbidden.status, 403);
    assert.equal((await request(`/api/pilot-applications/${application.id}/convert`, {}, regularOwnerToken)).status, 403);

    const converted = await request(`/api/pilot-applications/${application.id}/convert`);
    assert.equal(converted.status, 201);
    const convertedBody = await converted.json() as { application: { status: string; provisionedCompanyId: string; provisionedUserId: string }; company: { id: string; name: string }; user: { id: string; email: string }; setPasswordUrl?: string };
    assert.equal(convertedBody.application.status, "converted");
    assert.equal(convertedBody.company.name, application.companyName);
    assert.equal(convertedBody.user.email, application.email);
    assert.ok(convertedBody.setPasswordUrl, "expected a dev setPasswordUrl when no email webhook is configured");
    provisionedCompanyId = convertedBody.company.id;
    provisionedUserId = convertedBody.user.id;

    const [companyRow] = await db.select().from(schema.companies).where(eq(schema.companies.id, provisionedCompanyId));
    assert.equal(companyRow.name, application.companyName);
    const [membershipRow] = await db.select().from(schema.memberships).where(eq(schema.memberships.userId, provisionedUserId));
    assert.equal(membershipRow.companyId, provisionedCompanyId);
    assert.equal(membershipRow.role, "owner");
    const [subscriptionRow] = await db.select().from(schema.subscriptions).where(eq(schema.subscriptions.companyId, provisionedCompanyId));
    assert.equal(subscriptionRow.plan, "starter");

    const secondAttempt = await request(`/api/pilot-applications/${application.id}/convert`);
    assert.equal(secondAttempt.status, 409);

    const collisionAttempt = await request(`/api/pilot-applications/${collisionApplication.id}/convert`);
    assert.equal(collisionAttempt.status, 409);
  }
});
