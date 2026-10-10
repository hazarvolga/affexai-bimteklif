import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import dotenv from "dotenv";
import { skipIfDatabaseUnavailable } from "./test-db-reachability";
import { useTestIsolation } from "./test-isolation";

dotenv.config({ path: ".env.local" });
dotenv.config();
useTestIsolation();

test("SmartCheck Complete Upload Checks", { timeout: 30_000 }, async (t) => {
  if (await skipIfDatabaseUnavailable(t)) return;
  process.env.SMARTCHECK_IMPORT_ENABLED = "true";
  const [{ createApiApp }, schema, dbModule, { AuthService }, storage] = await Promise.all([
    import("../app"), import("../../db/schema"), import("../../db"), import("../../services/auth/authService"), import("../../smartcheck/import/storage")
  ]);
  const db = dbModule.db;
  
  const suffix = crypto.randomUUID();
  const [company] = await db.insert(schema.companies).values({ name: `HTTP Integration ${suffix}`, smartcheckMaxWastePercent: "20" }).returning();
  await db.insert(schema.subscriptions).values({
    companyId: company.id, plan: "starter", status: "active", currentPeriodStart: new Date("2020-01-01T00:00:00Z"),
  });
  const [user] = await db.insert(schema.users).values({ email: `http-upload-${suffix}@example.test`, fullName: "Upload Tenant", emailVerified: new Date() }).returning();
  await db.insert(schema.memberships).values({ companyId: company.id, userId: user.id, role: "owner" });

  const app = createApiApp();
  const token = AuthService.generateToken({ userId: user.id, companyId: company.id, role: 'owner' });
  const reqAuth = { Authorization: `Bearer ${token}` };

  const adapter = storage.createStorageAdapter();
  const { Readable } = await import('node:stream');

  async function mockUpload(size: number, expectedHash: string, originalFileName: string, realSize: number, realHash: string) {
    const key = `test-${crypto.randomUUID()}`;
    const [doc] = await db.insert(schema.documents).values({
      companyId: company.id, uploadedByUserId: user.id,
      originalFileName, displayName: originalFileName, mimeType: 'application/octet-stream',
      fileSizeBytes: size, storageKey: key, checksumSha256: expectedHash
    }).returning();
    
    // Write the actual real file size/hash
    const content = Buffer.alloc(realSize, 'x');
    await adapter.put(key, content, 'application/octet-stream');
    
    return { doc, key, content };
  }

  const http = await import("node:http");
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(undefined)));
  const address = server.address();
  const base = `http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}`;
  
  const fetch = async (path: string, init: RequestInit) => {
    return globalThis.fetch(`${base}${path}`, init);
  };
  
  t.after(() => server.close());

    await t.test("limit overrun for IFC is rejected with 400", async () => {
    const { SMARTCHECK_MAX_IFC_FILE_BYTES: limit } = await import('../../smartcheck/import/config');
    const { doc, key } = await mockUpload(limit + 10, 'a'.repeat(64), 'test.ifc', limit + 10, 'realhash');
    const res = await fetch(`/api/smartcheck/documents/${doc.id}/complete`, { method: "POST", headers: { ...reqAuth, "Content-Type": "application/json" }, body: JSON.stringify({ checksumSha256: doc.checksumSha256 }) });
    assert.strictEqual(res.status, 400);
    const body = await res.json();
    assert.strictEqual(body.error, "Dosya boyutu geçersiz.");
  });

  await t.test("checksum mismatch is rejected with 422 and file deleted", async () => {
    const realContent = Buffer.from("a,b,c\n1,2,3");
    const realHash = crypto.createHash('sha256').update(realContent).digest('hex');
    const { doc, key } = await mockUpload(realContent.length, 'b'.repeat(64), 'test.csv', realContent.length, realHash);
    
    await adapter.put(key, realContent, 'text/csv');
    
    const res = await fetch(`/api/smartcheck/documents/${doc.id}/complete`, { method: "POST", headers: { ...reqAuth, "Content-Type": "application/json" }, body: JSON.stringify({ checksumSha256: doc.checksumSha256 }) });
    console.log('RES STATUS', res.status); const b = await res.json(); console.log('RES BODY', b); assert.strictEqual(res.status, 422);
    
    const freshDoc = await db.select().from(schema.documents).where((await import('drizzle-orm')).eq(schema.documents.id, doc.id)).then(r => r[0]);
    assert.strictEqual(freshDoc.status, 'failed');
    
    let exists = true;
    try {
      await adapter.get(key, { maxBytes: 1 });
    } catch {
      exists = false;
    }
    assert.strictEqual(exists, false, 'File should be deleted from storage');
  });
  
  await t.test("chunk accumulation works for valid small files", async () => {
    const realContent = Buffer.from("a,b,c\n1,2,3");
    const realHash = crypto.createHash('sha256').update(realContent).digest('hex');
    const { doc, key } = await mockUpload(realContent.length, realHash, 'test.csv', realContent.length, realHash);
    
    const oldGetStream = adapter.getStream;
    adapter.getStream = async (storageKey: string) => {
      return Readable.from((async function* () {
        for (let i = 0; i < realContent.length; i += 2) {
          yield realContent.subarray(i, i + 2);
        }
      })());
    };
    
    await adapter.put(key, realContent, 'text/csv');
    const res = await fetch(`/api/smartcheck/documents/${doc.id}/complete`, { method: "POST", headers: { ...reqAuth, "Content-Type": "application/json" }, body: JSON.stringify({ checksumSha256: doc.checksumSha256 }) });
    if (oldGetStream) adapter.getStream = oldGetStream;
    
    assert.strictEqual(res.status, 200);
  });
});
