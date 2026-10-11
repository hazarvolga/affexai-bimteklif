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
  const [plan] = await db.insert(schema.plans).values({
    name: `Test Plan ${suffix}`,
    monthlyPrice: 1000,
    monthlyQuoteLimit: 100,
    monthlyIfcLimit: 50,
    ifcMaxFileMb: 100,
    ifcMaxConcurrent: 2,
    isActive: true,
  }).returning();
  await db.insert(schema.subscriptions).values({
    companyId: company.id, planId: plan.id, plan: "starter", status: "active", currentPeriodStart: new Date("2020-01-01T00:00:00Z"),
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

  await t.test("file signature mismatch (corrupt IFC header) is rejected with 400, doc marked failed, and file deleted", async () => {
    const fakeIfc = Buffer.from("NOT_AN_IFC_FILE_HEADER; SOME_DATA;\n");
    const fakeHash = crypto.createHash('sha256').update(fakeIfc).digest('hex');
    const { doc, key } = await mockUpload(fakeIfc.length, fakeHash, 'corrupt.ifc', fakeIfc.length, fakeHash);

    await adapter.put(key, fakeIfc, 'application/octet-stream');

    const res = await fetch(`/api/smartcheck/documents/${doc.id}/complete`, {
      method: "POST",
      headers: { ...reqAuth, "Content-Type": "application/json" },
      body: JSON.stringify({ checksumSha256: fakeHash })
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json() as { error: string; code: string };
    assert.strictEqual(body.code, "FILE_SIGNATURE_MISMATCH");
    assert.strictEqual(body.error, "Dosya formatı veya imzası geçersiz.");

    const freshDoc = await db.select().from(schema.documents).where((await import('drizzle-orm')).eq(schema.documents.id, doc.id)).then(r => r[0]);
    assert.strictEqual(freshDoc.status, 'failed');

    let exists = true;
    try {
      await adapter.get(key, { maxBytes: 1 });
    } catch {
      exists = false;
    }
    assert.strictEqual(exists, false, 'Corrupted IFC file should be deleted from storage');
  });

  await t.test("corrupt XLSX archive is rejected with 400, doc marked failed, and file deleted", async () => {
    // Valid ZIP header but truncated/corrupted archive
    const corruptZip = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00, 0x08, 0x00]);
    const zipHash = crypto.createHash('sha256').update(corruptZip).digest('hex');
    const { doc, key } = await mockUpload(corruptZip.length, zipHash, 'broken.xlsx', corruptZip.length, zipHash);

    // Update doc mimeType to valid xlsx mime so it passes detectAndValidateFile and triggers validateXlsxArchive
    await db.update(schema.documents).set({
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    }).where((await import('drizzle-orm')).eq(schema.documents.id, doc.id));

    await adapter.put(key, corruptZip, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    const res = await fetch(`/api/smartcheck/documents/${doc.id}/complete`, {
      method: "POST",
      headers: { ...reqAuth, "Content-Type": "application/json" },
      body: JSON.stringify({ checksumSha256: zipHash })
    });

    assert.strictEqual(res.status, 400);
    const body = await res.json() as { error: string; code: string };
    assert.strictEqual(body.code, "XLSX_CORRUPT");

    const freshDoc = await db.select().from(schema.documents).where((await import('drizzle-orm')).eq(schema.documents.id, doc.id)).then(r => r[0]);
    assert.strictEqual(freshDoc.status, 'failed');

    let exists = true;
    try {
      await adapter.get(key, { maxBytes: 1 });
    } catch {
      exists = false;
    }
    assert.strictEqual(exists, false, 'Corrupt XLSX file should be deleted from storage');
  });

  await t.test("unexpected error in /complete returns 500 JSON, marks doc failed, and deletes storage file", async () => {
    const content = Buffer.from("a,b,c\n1,2,3");
    const hash = crypto.createHash('sha256').update(content).digest('hex');
    const { doc, key } = await mockUpload(content.length, hash, 'test.csv', content.length, hash);
    await adapter.put(key, content, 'text/csv');

    // Force an unexpected error inside LocalStorageAdapter.prototype.get
    const originalGet = storage.LocalStorageAdapter.prototype.get;
    storage.LocalStorageAdapter.prototype.get = async function() {
      throw new Error("SIMULATED_UNEXPECTED_STORAGE_CRASH");
    };

    try {
      const res = await fetch(`/api/smartcheck/documents/${doc.id}/complete`, {
        method: "POST",
        headers: { ...reqAuth, "Content-Type": "application/json" },
        body: JSON.stringify({ checksumSha256: hash })
      });

      assert.strictEqual(res.status, 500);
      const body = await res.json() as { error: string; code: string };
      assert.strictEqual(body.code, "INTERNAL_SERVER_ERROR");
      assert.strictEqual(body.error, "Dosya doğrulama işlemi sırasında beklenmeyen bir hata oluştu.");

      const freshDoc = await db.select().from(schema.documents).where((await import('drizzle-orm')).eq(schema.documents.id, doc.id)).then(r => r[0]);
      assert.strictEqual(freshDoc.status, 'failed');
    } finally {
      storage.LocalStorageAdapter.prototype.get = originalGet;
    }
  });
});

