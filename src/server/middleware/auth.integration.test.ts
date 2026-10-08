import assert from "node:assert/strict";
import crypto from "node:crypto";
import http from "node:http";
import test from "node:test";
import dotenv from "dotenv";
import { skipIfDatabaseUnavailable } from "../routes/test-db-reachability";
import { useTestIsolation } from "../routes/test-isolation";

dotenv.config({ path: ".env.local" });
dotenv.config();
useTestIsolation();

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-teklifpro";

test("authenticate does not reject a token issued the same second as a password change", { timeout: 30_000 }, async (t) => {
  if (await skipIfDatabaseUnavailable(t)) return;
  const [{ createApiApp }, schema, dbModule, jwtModule] = await Promise.all([
    import("../app"), import("../../db/schema"), import("../../db"), import("jsonwebtoken"),
  ]);
  const jwt = jwtModule.default;
  const { eq } = await import("drizzle-orm");
  const db = dbModule.db;
  const suffix = crypto.randomUUID();

  const [company] = await db.insert(schema.companies).values({ name: `Auth Timing Co ${suffix}` }).returning();
  const [user] = await db.insert(schema.users).values({ email: `auth-timing-${suffix}@example.test`, fullName: "Timing User" }).returning();
  await db.insert(schema.memberships).values({ companyId: company.id, userId: user.id, role: "owner" });

  // Pick a passwordChangedAt that lands well inside a second (.900) so a same-second
  // iat is unambiguous, then persist it with the DB's real millisecond precision.
  const changeSecondEpoch = Math.floor(Date.now() / 1000);
  const passwordChangedAt = new Date(changeSecondEpoch * 1000 + 900);
  await db.update(schema.users).set({ passwordChangedAt }).where(eq(schema.users.id, user.id));

  const signWithIat = (iatSeconds: number) =>
    jwt.sign({ userId: user.id, companyId: company.id, role: "owner", iat: iatSeconds }, JWT_SECRET, { expiresIn: "7d" });

  const sameSecondToken = signWithIat(changeSecondEpoch);
  const priorSecondToken = signWithIat(changeSecondEpoch - 1);
  const laterSecondToken = signWithIat(changeSecondEpoch + 1);

  const server = http.createServer(createApiApp());
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const base = `http://127.0.0.1:${typeof address === "object" && address ? address.port : 0}`;
  const meRequest = (token: string) => fetch(`${base}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } });

  try {
    // Regression: iat (second precision) truncated below passwordChangedAt (ms precision)
    // used to fail-close a legitimate same-second post-reset login.
    const sameSecond = await meRequest(sameSecondToken);
    assert.equal(sameSecond.status, 200, "a token issued in the same second as the password change should stay valid");

    const laterSecond = await meRequest(laterSecondToken);
    assert.equal(laterSecond.status, 200, "a token issued after the password change should stay valid");

    const priorSecond = await meRequest(priorSecondToken);
    assert.equal(priorSecond.status, 401, "a token issued before the password change must still be rejected");
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await db.delete(schema.memberships).where(eq(schema.memberships.userId, user.id));
    await db.delete(schema.users).where(eq(schema.users.id, user.id));
    await db.delete(schema.companies).where(eq(schema.companies.id, company.id));
  }
});
