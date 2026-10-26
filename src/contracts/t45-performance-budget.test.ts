import assert from "node:assert/strict";
import crypto from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";
import test from "node:test";
import ExcelJS from "exceljs";
import { and, eq } from "drizzle-orm";

import { PERFORMANCE_BUDGETS } from "../server/config/performance-budgets";
import { readIfcEnvironmentLimits } from "../server/config/ifc-limits";
import { MAX_XLSX_BYTES, parseParcelXlsx } from "../lib/pre-bim-xlsx";
import { MAX_QUOTE_IMPORT_BYTES } from "../lib/quote-excel-import";
import { parseQuoteXlsx } from "../lib/quote-xlsx";
import { inspectDocument, parseDocument } from "../smartcheck/import/spreadsheet-runner";
import {
  hashReportingIdentifier,
  sanitizeErrorForReporting,
  scrubEvent,
} from "../server/observability/error-tracking";
import { AIProviderRouter } from "../services/ai/providers/providerRouter";
import { readAIResponse } from "../services/ai/providers/response-limit";
import { skipIfDatabaseUnavailable } from "../server/routes/test-db-reachability";
import { createTestIsolation } from "../server/routes/test-isolation";

function computePercentile(samples: number[], p: number): number {
  if (samples.length === 0) return 0;
  const sorted = [...samples].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, idx)];
}

test("T45-1: Pre-registered performance budgets align with compose.coolify.yaml and runtime limit constants", () => {
  assert.equal(MAX_XLSX_BYTES, PERFORMANCE_BUDGETS.frontend.browserXlsxMaxBytes);
  assert.equal(MAX_QUOTE_IMPORT_BYTES, PERFORMANCE_BUDGETS.frontend.browserXlsxMaxBytes);

  const ifcLimits = readIfcEnvironmentLimits({});
  assert.equal(
    ifcLimits.maxFileBytes,
    PERFORMANCE_BUDGETS.containers.ifcWorker.maxIfcFileMb * 1024 * 1024,
  );
  assert.equal(
    ifcLimits.maxConcurrent,
    PERFORMANCE_BUDGETS.containers.worker.concurrency,
  );

  const composeText = readFileSync(path.resolve("compose.coolify.yaml"), "utf8");
  assert.match(composeText, /mem_limit:\s*1536m/);
  assert.match(composeText, /mem_limit:\s*1024m/);
  assert.match(composeText, /mem_limit:\s*2048m/);
  assert.match(composeText, /NODE_OPTIONS:\s*--max-old-space-size=768/);
  assert.match(composeText, /NODE_OPTIONS:\s*--max-old-space-size=1024/);
  assert.match(composeText, /PG_POOL_MAX:\s*'4'/);
});

test("T45-2: Production frontend bundle enforces entry ceiling and isolates exceljs, charts, and ifc-viewer from initial/route preloads", () => {
  const viteConfigText = readFileSync(path.resolve("vite.config.ts"), "utf8");
  assert.match(viteConfigText, /pkg\.startsWith\('exceljs\/'\)/);
  assert.match(viteConfigText, /return 'exceljs'/);
  assert.match(viteConfigText, /!dep\.includes\('exceljs'\)/);
  assert.match(viteConfigText, /!dep\.includes\('ifc-viewer'\)/);
  assert.match(viteConfigText, /!dep\.includes\('charts'\)/);

  const createQuoteText = readFileSync(path.resolve("src/pages/CreateQuote.tsx"), "utf8");
  assert.doesNotMatch(createQuoteText, /from\s+['"]exceljs['"]/);
  assert.match(createQuoteText, /await import\(['"]@\/lib\/quote-xlsx['"]\)/);

  const preBimPanelText = readFileSync(
    path.resolve("src/components/smartcheck/PreBimFeasibilityPanel.tsx"),
    "utf8",
  );
  assert.doesNotMatch(preBimPanelText, /from\s+['"]exceljs['"]/);
  assert.match(preBimPanelText, /await import\(["']@\/lib\/pre-bim-xlsx["']\)/);

  const distIndexHtmlPath = path.resolve("dist/index.html");
  const distAssetsDir = path.resolve("dist/assets");
  if (!existsSync(distIndexHtmlPath) || !existsSync(distAssetsDir)) {
    return;
  }

  const indexHtml = readFileSync(distIndexHtmlPath, "utf8");
  for (const forbidden of PERFORMANCE_BUDGETS.frontend.forbiddenInitialPreloadChunks) {
    assert.ok(
      !indexHtml.includes(`/assets/${forbidden}-`),
      `dist/index.html must not preload optional heavy chunk '${forbidden}'`,
    );
  }

  const assetFiles = readdirSync(distAssetsDir);
  const entryFile = assetFiles.find((f) => /^index-[A-Za-z0-9_-]+\.js$/.test(f));
  const exceljsFile = assetFiles.find((f) => /^exceljs-[A-Za-z0-9_-]+\.js$/.test(f));
  const ifcViewerFile = assetFiles.find((f) => /^ifc-viewer-[A-Za-z0-9_-]+\.js$/.test(f));
  const chartsFile = assetFiles.find((f) => /^charts-[A-Za-z0-9_-]+\.js$/.test(f));
  const quoteXlsxFile = assetFiles.find((f) => /^quote-xlsx-[A-Za-z0-9_-]+\.js$/.test(f));
  const preBimXlsxFile = assetFiles.find((f) => /^pre-bim-xlsx-[A-Za-z0-9_-]+\.js$/.test(f));

  assert.ok(entryFile, "entry chunk index-*.js must exist");
  assert.ok(exceljsFile, "dedicated exceljs-*.js chunk must exist");
  assert.ok(ifcViewerFile, "dedicated ifc-viewer-*.js chunk must exist");
  assert.ok(chartsFile, "dedicated charts-*.js chunk must exist");
  assert.ok(quoteXlsxFile, "lazy wrapper quote-xlsx-*.js chunk must exist");
  assert.ok(preBimXlsxFile, "lazy wrapper pre-bim-xlsx-*.js chunk must exist");

  const entrySizeBytes = readFileSync(path.join(distAssetsDir, entryFile)).byteLength;
  assert.ok(
    entrySizeBytes <= PERFORMANCE_BUDGETS.frontend.entryChunkMaxBytes,
    `Entry chunk ${entryFile} (${entrySizeBytes} B) exceeds ceiling (${PERFORMANCE_BUDGETS.frontend.entryChunkMaxBytes} B)`,
  );

  for (const routePrefix of PERFORMANCE_BUDGETS.frontend.exceljsIsolatedFromRouteChunks) {
    const routeChunk = assetFiles.find((f) =>
      new RegExp(`^${routePrefix}-[A-Za-z0-9_-]+\\.js$`).test(f),
    );
    assert.ok(routeChunk, `Route chunk for ${routePrefix} must exist`);
    const routeSource = readFileSync(path.join(distAssetsDir, routeChunk), "utf8");
    assert.ok(
      !routeSource.includes(exceljsFile),
      `Route chunk ${routeChunk} must not directly reference ${exceljsFile}; it must load via lazy xlsx helper only when .xlsx is chosen`,
    );
  }
});

test("T45-3: Spreadsheet 1,000-row XLSX benchmark and isolated worker limit recovery stay within budget", async () => {
  // 1. Oversize browser .xlsx files fail-fast before loading exceljs
  const oversizeBuffer = new Uint8Array(MAX_QUOTE_IMPORT_BYTES + 1);
  const startOversize = performance.now();
  const quoteOversize = await parseQuoteXlsx(oversizeBuffer, "oversize.xlsx");
  const parcelOversize = await parseParcelXlsx(oversizeBuffer);
  const oversizeElapsedMs = performance.now() - startOversize;
  assert.ok(quoteOversize.errors[0]?.includes("5 MB sınırını aşıyor"));
  assert.ok(parcelOversize.errors[0]?.includes("5 MB sınırını aşıyor"));
  assert.ok(oversizeElapsedMs < 50, `Oversize check took ${oversizeElapsedMs.toFixed(2)} ms`);

  // 2. Oversize server spreadsheet fails immediately with FILE_SIZE_INVALID
  await assert.rejects(
    () => inspectDocument(Buffer.alloc(25 * 1024 * 1024 + 1), "xlsx"),
    /FILE_SIZE_INVALID/,
  );

  // 3. Build a realistic 1,000-row construction BOQ .xlsx workbook and measure browser + isolated worker parse latency
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Teklif Metraj");
  ws.addRow(["Poz No", "İş Kalemi Açıklaması", "Birim", "Miktar", "Birim Fiyat (TL)", "KDV (%)"]);
  for (let i = 1; i <= 1000; i++) {
    ws.addRow([
      `15.120.${1000 + (i % 50)}`,
      `C30/37 Betonarme Yapı Elemanı Kalemi #${i}`,
      "m3",
      12.5 + (i % 10),
      3450,
      20,
    ]);
  }
  const xlsxArrayBuffer = await wb.xlsx.writeBuffer();
  const xlsxBuffer = Buffer.from(xlsxArrayBuffer);

  const browserStart = performance.now();
  const parsedQuote = await parseQuoteXlsx(xlsxBuffer, "boq-1000.xlsx");
  const browserElapsedMs = performance.now() - browserStart;
  assert.equal(parsedQuote.errors.length, 0);
  assert.equal(parsedQuote.totalImported, 1000);
  assert.ok(
    browserElapsedMs <= PERFORMANCE_BUDGETS.slos.xlsx1000RowParseP95MaxMs,
    `1,000-row browser XLSX parse took ${browserElapsedMs.toFixed(1)} ms (> ${PERFORMANCE_BUDGETS.slos.xlsx1000RowParseP95MaxMs} ms)`,
  );

  const workerStart = performance.now();
  const preview = await inspectDocument(xlsxBuffer, "xlsx");
  const parsedWorker = await parseDocument(xlsxBuffer, "xlsx", {
    positionCode: "Poz No",
    description: "İş Kalemi Açıklaması",
    unit: "Birim",
    quantity: "Miktar",
    price: "Birim Fiyat (TL)",
  });
  const workerElapsedMs = performance.now() - workerStart;
  assert.equal(preview.sheets[0]?.rowCount, 1001);
  assert.equal(parsedWorker.rows.length, 1000);
  assert.ok(
    workerElapsedMs <= PERFORMANCE_BUDGETS.slos.xlsx1000RowParseP95MaxMs * 2,
    `Isolated worker preview+parse took ${workerElapsedMs.toFixed(1)} ms`,
  );

  // 4. Concurrency ceiling (max 2 concurrent child processes; 3rd rejects with SPREADSHEET_BUSY and system recovers)
  const [r1, r2, r3] = await Promise.allSettled([
    inspectDocument(xlsxBuffer, "xlsx"),
    inspectDocument(xlsxBuffer, "xlsx"),
    inspectDocument(xlsxBuffer, "xlsx"),
  ]);
  const fulfilled = [r1, r2, r3].filter((r) => r.status === "fulfilled");
  const rejected = [r1, r2, r3].filter(
    (r): r is PromiseRejectedResult => r.status === "rejected",
  );
  assert.equal(fulfilled.length, 2);
  assert.equal(rejected.length, 1);
  assert.match(String(rejected[0].reason?.message), /SPREADSHEET_BUSY/);

  // Recovery after busy rejection: subsequent call succeeds
  const recovered = await inspectDocument(xlsxBuffer, "xlsx");
  assert.equal(recovered.sheets[0]?.rowCount, 1001);
});

test("T45-4: Observability PII scrubbing and AI provider router fallback meet latency and safety budgets", async () => {
  // 1. Sentry PII scrubbing & error sanitization benchmark (100 iterations)
  const scrubSamples: number[] = [];
  for (let i = 0; i < 100; i++) {
    const t0 = performance.now();
    const scrubbed = scrubEvent({
      request: {
        url: "https://bimmetraj.com/api/quotations?token=secret-jwt&email=user@example.com",
        query_string: "token=secret-jwt",
        cookies: { bm_session: "secret-cookie" },
        data: { password: "plaintext-password" },
        headers: {
          authorization: "Bearer secret",
          cookie: "bm_session=secret",
          "user-agent": "Playwright/1.52",
          "x-request-id": `req-${i}`,
        },
      },
      user: {
        id: "user-uuid-123",
        email: "private@example.com",
        ip_address: "192.0.2.1",
      } as any,
    });
    const sanitizedErr = sanitizeErrorForReporting({
      name: "PostgresError",
      code: "42501",
      message: "SELECT * FROM users WHERE email = 'secret@example.com'",
      detail: "Key (email)=(secret@example.com)",
    });
    const hashedId = hashReportingIdentifier("tenant-123");
    scrubSamples.push(performance.now() - t0);

    assert.equal(scrubbed.request?.url, "https://bimmetraj.com/api/quotations");
    assert.equal(scrubbed.request?.query_string, undefined);
    assert.equal(scrubbed.request?.cookies, undefined);
    assert.equal(scrubbed.request?.data, undefined);
    assert.equal(scrubbed.request?.headers?.authorization, undefined);
    assert.equal(scrubbed.request?.headers?.["x-request-id"], `req-${i}`);
    assert.deepEqual(scrubbed.user, { id: "user-uuid-123" });
    assert.deepEqual(sanitizedErr, { name: "PostgresError", code: "42501" });
    assert.equal(hashedId?.length, 16);
  }
  const scrubP95Ms = computePercentile(scrubSamples, 95);
  assert.ok(
    scrubP95Ms <= PERFORMANCE_BUDGETS.slos.telemetryScrubMaxMs,
    `Telemetry scrub p95 ${scrubP95Ms.toFixed(3)} ms exceeds ${PERFORMANCE_BUDGETS.slos.telemetryScrubMaxMs} ms`,
  );

  // 2. AI Provider Router fallback latency and bounded response ceiling
  let primaryCalls = 0;
  let fallbackCalls = 0;
  const router = new AIProviderRouter([
    {
      name: "primary-openai",
      isConfigured: () => true,
      generateQuotation: async () => {
        primaryCalls += 1;
        throw new Error("UPSTREAM_RATE_LIMIT_429");
      },
      improveQuotation: async () => {
        throw new Error("UPSTREAM_RATE_LIMIT_429");
      },
      generateText: async () => {
        throw new Error("UPSTREAM_RATE_LIMIT_429");
      },
    },
    {
      name: "fallback-gemini",
      isConfigured: () => true,
      generateQuotation: async (input) => {
        fallbackCalls += 1;
        return {
          projectType: `Fallback summary for ${input.inputText}`,
          confidence: 0.85,
          industryId: input.industryId,
          assumptions: ["TS 500 varsayımı"],
          lineItems: [
            {
              description: "C30/37 Beton",
              unit: "m3",
              quantity: 100,
              unitPrice: 3200,
            },
          ],
          riskFlags: [],
          riskLevel: "low",
        };
      },
      improveQuotation: async (items) => items,
      generateText: async () => '{"ok":true}',
    },
  ]);

  const fallbackStart = performance.now();
  const aiQuote = await router.generateQuotation({
    inputText: "100m3 betonarme temel",
    industryId: "residential",
    plugin: {},
  });
  const fallbackText = await router.generateText("test", true);
  const fallbackElapsedMs = performance.now() - fallbackStart;
  assert.equal(primaryCalls, 1);
  assert.equal(fallbackCalls, 1);
  assert.equal(aiQuote.lineItems.length, 1);
  assert.equal(fallbackText, '{"ok":true}');
  assert.ok(
    fallbackElapsedMs <= PERFORMANCE_BUDGETS.slos.aiProviderFallbackOverheadMaxMs,
    `AI fallback took ${fallbackElapsedMs.toFixed(2)} ms (> ${PERFORMANCE_BUDGETS.slos.aiProviderFallbackOverheadMaxMs} ms)`,
  );

  // Oversize upstream AI response is rejected before buffering unbounded memory
  const oversizeResponse = new Response(
    "x".repeat(PERFORMANCE_BUDGETS.slos.aiResponseMaxBytes + 1024),
  );
  await assert.rejects(
    () => readAIResponse(oversizeResponse, PERFORMANCE_BUDGETS.slos.aiResponseMaxBytes),
    /AI_RESPONSE_TOO_LARGE/,
  );
});

test("T45-5: Concurrent multi-tenant PostgreSQL 16 isolation and worker queue claim p95 latency stay within budget", async (t) => {
  if (await skipIfDatabaseUnavailable(t, "T45 PG16 concurrency and queue claim benchmark")) {
    return;
  }

  const isolation = await createTestIsolation(
    process.env.TEST_ISOLATION_SOURCE_DATABASE_URL ?? process.env.DATABASE_URL!,
  );
  const overrides: Record<string, string> = {
    DATABASE_URL: isolation.databaseUrl,
    CONTROL_DATABASE_URL: isolation.controlDatabaseUrl,
    ...(isolation.workerDatabaseUrl ? { WORKER_DATABASE_URL: isolation.workerDatabaseUrl } : {}),
    GRAPHILE_WORKER_SCHEMA: isolation.workerSchema,
    SMARTCHECK_LOCAL_STORAGE_DIR: isolation.storageDir,
    NODE_ENV: "test",
  };
  const saved = Object.fromEntries(Object.keys(overrides).map((k) => [k, process.env[k]]));
  Object.assign(process.env, overrides);

  const [
    { db },
    { closeControlDatabase, getControlDatabase },
    { withAppTenant, withAppTenantTransaction },
    { clients, companies, documentProcessingRuns, documents, memberships, users },
  ] = await Promise.all([
    import("../db"),
    import("../db/control-plane"),
    import("../db/app-tenant"),
    import("../db/schema"),
  ]);

  t.after(async () => {
    try {
      await closeControlDatabase();
      await db.$client.end();
    } finally {
      try {
        await isolation.cleanup();
      } finally {
        for (const [k, v] of Object.entries(saved)) {
          if (v === undefined) delete process.env[k];
          else process.env[k] = v;
        }
      }
    }
  });

  const controlDb = getControlDatabase().db;
  const tenantAId = crypto.randomUUID();
  const tenantBId = crypto.randomUUID();
  const ctxA = { companyId: tenantAId, userId: crypto.randomUUID(), role: "owner" };
  const ctxB = { companyId: tenantBId, userId: crypto.randomUUID(), role: "owner" };

  await controlDb.insert(companies).values([
    { id: tenantAId, name: "T45 Tenant A" },
    { id: tenantBId, name: "T45 Tenant B" },
  ]);
  await db.insert(users).values({
    id: ctxA.userId,
    email: `owner-${ctxA.userId}@t45.test`,
    passwordHash: "hash",
    fullName: "T45 Owner",
  });
  await controlDb.insert(memberships).values({
    userId: ctxA.userId,
    companyId: tenantAId,
    role: "owner",
  });

  await withAppTenantTransaction(ctxA, async (tx) => {
    await tx.insert(clients).values({
      companyId: tenantAId,
      name: "Tenant A Exclusive Client",
      type: "Corporate",
      email: "a@t45.test",
    });
  });
  await withAppTenantTransaction(ctxB, async (tx) => {
    await tx.insert(clients).values({
      companyId: tenantBId,
      name: "Tenant B Exclusive Client",
      type: "Corporate",
      email: "b@t45.test",
    });
  });

  // 20 concurrent interleaved tenant transactions (10 Tenant A, 10 Tenant B)
  const latencySamplesMs: number[] = [];
  await Promise.all(
    Array.from({ length: 20 }, async (_, idx) => {
      const ctx = idx % 2 === 0 ? ctxA : ctxB;
      const expectedEmail = idx % 2 === 0 ? "a@t45.test" : "b@t45.test";
      const t0 = performance.now();
      const rows = await withAppTenant(
        ctx,
        async (tx) => tx.select().from(clients).where(eq(clients.companyId, ctx.companyId)),
        { readOnly: true },
      );
      latencySamplesMs.push(performance.now() - t0);
      assert.equal(rows.length, 1);
      assert.equal(rows[0]?.email, expectedEmail);
    }),
  );

  const tenantDbP95Ms = computePercentile(latencySamplesMs, 95);
  assert.ok(
    tenantDbP95Ms <= PERFORMANCE_BUDGETS.slos.concurrentTenantDbP95MaxMs,
    `Concurrent tenant DB p95 (${tenantDbP95Ms.toFixed(2)} ms) exceeds budget (${PERFORMANCE_BUDGETS.slos.concurrentTenantDbP95MaxMs} ms)`,
  );

  // Worker queue claim + lease acquisition latency measurement
  const docId = crypto.randomUUID();
  const runId = crypto.randomUUID();
  await withAppTenantTransaction(ctxA, async (tx) => {
    await tx.insert(documents).values({
      id: docId,
      companyId: tenantAId,
      uploadedByUserId: ctxA.userId,
      originalFileName: "t45-queue.csv",
      displayName: "t45-queue.csv",
      storageKey: `smartcheck/${tenantAId}/${docId}/t45-queue.csv`,
      mimeType: "text/csv",
      fileSizeBytes: 256,
      checksumSha256: "a".repeat(64),
      status: "queued",
    });
    await tx.insert(documentProcessingRuns).values({
      id: runId,
      documentId: docId,
      companyId: tenantAId,
      idempotencyKey: `t45-idem-${runId}`,
      status: "queued",
    });
  });

  const claimStart = performance.now();
  const claimed = await withAppTenantTransaction(ctxA, async (tx) => {
    const leaseToken = crypto.randomUUID();
    const [row] = await tx
      .update(documentProcessingRuns)
      .set({
        status: "running",
        currentStage: "parsing",
        progressPercent: 10,
        startedAt: new Date(),
        updatedAt: new Date(),
        workerJobId: `t45-bench:${runId}`,
        workerLeaseToken: leaseToken,
      })
      .where(
        and(
          eq(documentProcessingRuns.id, runId),
          eq(documentProcessingRuns.documentId, docId),
          eq(documentProcessingRuns.companyId, tenantAId),
          eq(documentProcessingRuns.status, "queued"),
        ),
      )
      .returning();
    return row;
  });
  const claimElapsedMs = performance.now() - claimStart;
  assert.ok(claimed?.workerLeaseToken);
  assert.ok(
    claimElapsedMs <= PERFORMANCE_BUDGETS.slos.workerQueueClaimP95MaxMs,
    `Worker queue claim took ${claimElapsedMs.toFixed(2)} ms (> ${PERFORMANCE_BUDGETS.slos.workerQueueClaimP95MaxMs} ms)`,
  );
  t.diagnostic(
    `T45-5 measured: 20-request concurrent tenant DB p95=${tenantDbP95Ms.toFixed(2)} ms, worker queue claim=${claimElapsedMs.toFixed(2)} ms`,
  );
});
