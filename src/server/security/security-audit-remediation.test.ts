import assert from "node:assert/strict";
import test from "node:test";
import zlib from "node:zlib";
import { DATABASE_PUBLIC_RESTRICTED_TABLE_ACL } from "../../../scripts/database-roles/contract";
import { validateProductionEnvironment } from "../config/production";
import { extractPdfTextPureNode } from "../crawler/csb-pdf-parser";
import { checkSuperAdmin, createAuthenticate } from "../middleware/auth";
import { AuthService } from "../../services/auth/authService";
import { AIProviderRouter } from "../../services/ai/providers/providerRouter";
import { GeminiProvider } from "../../services/ai/providers/geminiProvider";
import type { AIProvider, AIQuotationInput } from "../../services/ai/providers/types";

function createMockRes() {
  const res: { statusCode: number; body: unknown; status: (code: number) => typeof res; json: (payload: unknown) => typeof res } = {
    statusCode: 200,
    body: undefined,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
  return res;
}

test("checkSuperAdmin requires isSuperAdmin, verified email, and non-impersonated session", async () => {
  const middleware = checkSuperAdmin();

  // Unverified email super-admin is rejected
  const unverifiedRes = createMockRes();
  let nextCalled = false;
  await middleware(
    {
      user: {
        userId: "u-1",
        companyId: "c-1",
        role: "owner",
        isSuperAdmin: true,
        emailVerified: false,
      },
    } as any,
    unverifiedRes as any,
    () => {
      nextCalled = true;
    },
  );
  assert.equal(nextCalled, false);
  assert.equal(unverifiedRes.statusCode, 403);

  // Impersonated session is rejected even if isSuperAdmin=true
  const impersonatedRes = createMockRes();
  await middleware(
    {
      user: {
        userId: "u-1",
        companyId: "c-1",
        role: "owner",
        isSuperAdmin: true,
        emailVerified: true,
        impersonatedBy: "admin-1",
      },
    } as any,
    impersonatedRes as any,
    () => {
      nextCalled = true;
    },
  );
  assert.equal(nextCalled, false);
  assert.equal(impersonatedRes.statusCode, 403);

  // Verified, non-impersonated super-admin passes
  const validRes = createMockRes();
  await middleware(
    {
      user: {
        userId: "u-1",
        companyId: "c-1",
        role: "owner",
        isSuperAdmin: true,
        emailVerified: true,
      },
    } as any,
    validRes as any,
    () => {
      nextCalled = true;
    },
  );
  assert.equal(nextCalled, true);
});

test("createAuthenticate forces read-only mode on impersonated sessions and blocks mutating HTTP methods", async () => {
  const impersonationToken = AuthService.generateToken({
    userId: "11111111-1111-4111-8111-111111111111",
    companyId: "22222222-2222-4222-8222-222222222222",
    role: "owner",
    isSuperAdmin: true,
    impersonatedBy: "33333333-3333-4333-8333-333333333333",
    readOnly: false, // Even if token claims readOnly=false, middleware must enforce read-only
  } as any);

  const authMiddleware = createAuthenticate({
    async findUser() {
      return {
        email: "target@example.test",
        emailVerified: new Date(),
        passwordChangedAt: null,
        isSuperAdmin: true,
      };
    },
    async findMembership() {
      return {
        role: "owner",
      };
    },
    async isImpersonationRevoked() {
      return false;
    },
  });

  // POST request during impersonation is blocked with 403
  const postReq: any = {
    method: "POST",
    headers: { authorization: `Bearer ${impersonationToken}` },
  };
  const postRes = createMockRes();
  let postNext = false;
  await authMiddleware(postReq, postRes as any, () => {
    postNext = true;
  });
  assert.equal(postNext, false);
  assert.equal(postRes.statusCode, 403);

  // GET request during impersonation succeeds with readOnly=true and isSuperAdmin=false
  const getReq: any = {
    method: "GET",
    headers: { authorization: `Bearer ${impersonationToken}` },
  };
  const getRes = createMockRes();
  let getNext = false;
  await authMiddleware(getReq, getRes as any, () => {
    getNext = true;
  });
  assert.equal(getNext, true);
  assert.equal(getReq.user.readOnly, true);
  assert.equal(getReq.user.isSuperAdmin, false);
});

test("GeminiProvider enforces 128 KB UTF-8 input cap and AIProviderRouter does not fallback on AI_INPUT_TOO_LARGE", async () => {
  const gemini = new GeminiProvider("dummy-key");
  const oversizedInput: AIQuotationInput = {
    inputText: "A".repeat(130 * 1024),
    industryId: "residential",
    plugin: {},
  };

  await assert.rejects(
    () => gemini.generateQuotation(oversizedInput),
    (err: any) => err?.message === "AI_INPUT_TOO_LARGE",
  );

  let fallbackCalled = false;
  const primaryProvider: AIProvider = {
    name: "primary",
    isConfigured: () => true,
    async generateQuotation() {
      const error = new Error("AI girdisi izin verilen boyutu aşıyor.") as Error & { code?: string; statusCode?: number };
      error.code = "AI_INPUT_TOO_LARGE";
      error.statusCode = 413;
      throw error;
    },
    async improveQuotation() {
      throw new Error("not used");
    },
  };
  const secondaryProvider: AIProvider = {
    name: "secondary",
    isConfigured: () => true,
    async generateQuotation() {
      fallbackCalled = true;
      return {
        projectType: "Residential",
        confidence: 0.9,
        industryId: "residential",
        lineItems: [],
        assumptions: [],
        riskFlags: [],
        riskLevel: "low",
      };
    },
    async improveQuotation() {
      fallbackCalled = true;
      return [];
    },
  };

  const router = new AIProviderRouter([primaryProvider, secondaryProvider]);
  await assert.rejects(
    () => router.generateQuotation({ inputText: "test", industryId: "residential", plugin: {} }),
    (err: any) => err?.code === "AI_INPUT_TOO_LARGE",
  );
  assert.equal(fallbackCalled, false);
});

test("extractPdfTextPureNode safely skips oversized FlateDecode streams (zip bomb protection)", () => {
  // Compress 20 MiB of zeros (exceeds 16 MiB per-stream maxOutputLength)
  const compressedBomb = zlib.deflateSync(Buffer.alloc(20 * 1024 * 1024, 0x41));
  const validStream = zlib.deflateSync(Buffer.from("BT (01.101 Pozlu Betonarme) Tj ET", "latin1"));

  const pdfBuffer = Buffer.concat([
    Buffer.from("%PDF-1.4\n1 0 obj\n<< /Filter /FlateDecode >>\nstream\n", "latin1"),
    compressedBomb,
    Buffer.from("\nendstream\nendobj\n2 0 obj\n<< /Filter /FlateDecode >>\nstream\n", "latin1"),
    validStream,
    Buffer.from("\nendstream\nendobj\n%%EOF", "latin1"),
  ]);

  const extracted = extractPdfTextPureNode(pdfBuffer);
  assert.match(extracted, /01\.101 Pozlu Betonarme/);
});

test("validateProductionEnvironment allows worker runtime without JWT_SECRET when requireControlDatabase is false", () => {
  const env = {
    NODE_ENV: "production",
    DATABASE_URL: "postgresql://bimmetraj_worker:StrongWorkerPass_0123456789abcdef@db:5432/teklifpro",
    PUBLIC_APP_URL: "https://bimmetraj.com",
    AUTH_EMAIL_DELIVERY_MODE: "disabled",
  } as unknown as NodeJS.ProcessEnv;

  const workerResult = validateProductionEnvironment(env, { requireControlDatabase: false });
  assert.equal(workerResult.valid, true);
  assert.deepEqual(workerResult.errors, []);

  const appResult = validateProductionEnvironment(env, { requireControlDatabase: true });
  assert.equal(appResult.valid, false);
  assert.equal(appResult.errors.some((e) => e.includes("JWT_SECRET")), true);
});

test("DATABASE_PUBLIC_RESTRICTED_TABLE_ACL denies bimmetraj_worker access to rate_limit_buckets, cost_components, quotation_financials, and DELETE on pricing staging", () => {
  assert.deepEqual(DATABASE_PUBLIC_RESTRICTED_TABLE_ACL.rate_limit_buckets.bimmetraj_worker, []);
  assert.deepEqual(DATABASE_PUBLIC_RESTRICTED_TABLE_ACL.cost_components.bimmetraj_worker, []);
  assert.deepEqual(DATABASE_PUBLIC_RESTRICTED_TABLE_ACL.quotation_financials.bimmetraj_worker, []);
  assert.equal(DATABASE_PUBLIC_RESTRICTED_TABLE_ACL.pricing_data_sources.bimmetraj_worker.includes("DELETE" as never), false);
  assert.equal(DATABASE_PUBLIC_RESTRICTED_TABLE_ACL.price_feed_staging.bimmetraj_worker.includes("DELETE" as never), false);
});
