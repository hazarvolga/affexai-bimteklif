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

test("invitation accept verifies the token, provisions a membership, and rejects re-use", { timeout: 30_000 }, async (t) => {
  if (await skipIfDatabaseUnavailable(t)) return;
  const [{ createApiApp }, schema, dbModule] = await Promise.all([
    import("../app"), import("../../db/schema"), import("../../db"),
  ]);
  const { and, eq } = await import("drizzle-orm");
  const db = dbModule.db;
  const suffix = crypto.randomUUID();

  const [company] = await db.insert(schema.companies).values({ name: `Invite Co ${suffix}` }).returning();
  const [inviter] = await db.insert(schema.users).values({ email: `inviter-${suffix}@example.test`, fullName: "Inviter" }).returning();
  await db.insert(schema.memberships).values({ companyId: company.id, userId: inviter.id, role: "owner" });

  const [validInvite] = await db.insert(schema.invitations).values({
    companyId: company.id, email: `invitee-${suffix}@example.test`, role: "manager",
    token: crypto.randomBytes(16).toString("hex"), invitedBy: inviter.id,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
  }).returning();
  const [expiredInvite] = await db.insert(schema.invitations).values({
    companyId: company.id, email: `expired-${suffix}@example.test`, role: "viewer",
    token: crypto.randomBytes(16).toString("hex"), invitedBy: inviter.id,
    expiresAt: new Date(Date.now() - 60 * 60 * 1000),
  }).returning();
  const [looseRoleInvite] = await db.insert(schema.invitations).values({
    companyId: company.id, email: `loose-role-${suffix}@example.test`,
    token: crypto.randomBytes(16).toString("hex"), invitedBy: inviter.id,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
  }).returning();
  assert.equal(looseRoleInvite.role, "member", "expected the schema default role for this regression case");

  const server = http.createServer(createApiApp());
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const base = `http://127.0.0.1:${typeof address === "object" && address ? address.port : 0}`;

  const acceptedUserIds: string[] = [];
  try {
    // Regression: eq(invitations.acceptedAt, null) compiles to `= NULL`, which never
    // matches in Postgres. A fresh, unaccepted invite must still be found here.
    const verify = await fetch(`${base}/api/invitations/${validInvite.token}`);
    assert.equal(verify.status, 200);
    const verifyBody = await verify.json() as { id: string };
    assert.equal(verifyBody.id, validInvite.id);

    const expiredAccept = await fetch(`${base}/api/invitations/${expiredInvite.token}/accept`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fullName: "Late Comer" }),
    });
    assert.equal(expiredAccept.status, 400);

    const accept = await fetch(`${base}/api/invitations/${validInvite.token}/accept`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fullName: "Invitee Person" }),
    });
    assert.equal(accept.status, 200);
    const acceptedUser = await accept.json() as { id: string; email: string };
    assert.equal(acceptedUser.email, validInvite.email);
    acceptedUserIds.push(acceptedUser.id);

    const [membershipRow] = await db.select().from(schema.memberships)
      .where(and(eq(schema.memberships.userId, acceptedUser.id), eq(schema.memberships.companyId, company.id)));
    assert.ok(membershipRow, "expected accept to create a memberships row attaching the user to the invite's company");
    assert.equal(membershipRow.role, "manager", "membership role should carry the invitation's role through");

    const reAccept = await fetch(`${base}/api/invitations/${validInvite.token}/accept`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fullName: "Invitee Person Again" }),
    });
    assert.equal(reAccept.status, 400, "an already-accepted invite must not be acceptable twice");

    const looseRoleAccept = await fetch(`${base}/api/invitations/${looseRoleInvite.token}/accept`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fullName: "Loose Role Person" }),
    });
    assert.equal(looseRoleAccept.status, 200, "an invite with the schema-default 'member' role (not a valid membership role enum value) must still be accepted safely");
    const looseRoleUser = await looseRoleAccept.json() as { id: string };
    acceptedUserIds.push(looseRoleUser.id);
    const [looseMembershipRow] = await db.select().from(schema.memberships)
      .where(and(eq(schema.memberships.userId, looseRoleUser.id), eq(schema.memberships.companyId, company.id)));
    assert.equal(looseMembershipRow.role, "viewer", "an invalid/loose invitation role should fall back to the least-privileged membership role");
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    for (const userId of acceptedUserIds) {
      await db.delete(schema.memberships).where(eq(schema.memberships.userId, userId));
      await db.delete(schema.users).where(eq(schema.users.id, userId));
    }
    await db.delete(schema.invitations).where(eq(schema.invitations.id, validInvite.id));
    await db.delete(schema.invitations).where(eq(schema.invitations.id, expiredInvite.id));
    await db.delete(schema.invitations).where(eq(schema.invitations.id, looseRoleInvite.id));
    await db.delete(schema.memberships).where(eq(schema.memberships.userId, inviter.id));
    await db.delete(schema.users).where(eq(schema.users.id, inviter.id));
    await db.delete(schema.companies).where(eq(schema.companies.id, company.id));
  }
});
