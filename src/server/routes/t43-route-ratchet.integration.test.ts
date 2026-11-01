import assert from "node:assert/strict";
import crypto from "node:crypto";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import { useTestIsolation } from "./test-isolation";
import { skipIfDatabaseUnavailable } from "./test-db-reachability";

useTestIsolation();

test("T43 R+1 route coverage ratchet: admin, pricing-file-import, academy, billing, company, quotations, profit, crm, and smartcheck routes", { timeout: 90_000 }, async (t) => {
  if (await skipIfDatabaseUnavailable(t)) return;

  const prevAcademyEnabled = process.env.ACADEMY_ENABLED;
  const prevAcademyRuntimeEnabled = process.env.ACADEMY_RUNTIME_ENABLED;
  const prevWebhookSecret = process.env.ACADEMY_PAYMENT_WEBHOOK_SECRET;
  const prevAcademyAdminEmails = process.env.ACADEMY_ADMIN_EMAILS;
  const prevSmartcheckEnabled = process.env.SMARTCHECK_IMPORT_ENABLED;
  process.env.ACADEMY_ENABLED = "true";
  process.env.ACADEMY_RUNTIME_ENABLED = "true";
  process.env.ACADEMY_PAYMENT_WEBHOOK_SECRET = "t43-webhook-secret-minimum-32-characters-long-key";
  process.env.ACADEMY_ADMIN_EMAILS = "hazarvolga@gmail.com";
  process.env.SMARTCHECK_IMPORT_ENABLED = "true";
  t.after(() => {
    if (prevAcademyEnabled === undefined) delete process.env.ACADEMY_ENABLED;
    else process.env.ACADEMY_ENABLED = prevAcademyEnabled;
    if (prevAcademyRuntimeEnabled === undefined) delete process.env.ACADEMY_RUNTIME_ENABLED;
    else process.env.ACADEMY_RUNTIME_ENABLED = prevAcademyRuntimeEnabled;
    if (prevWebhookSecret === undefined) delete process.env.ACADEMY_PAYMENT_WEBHOOK_SECRET;
    else process.env.ACADEMY_PAYMENT_WEBHOOK_SECRET = prevWebhookSecret;
    if (prevAcademyAdminEmails === undefined) delete process.env.ACADEMY_ADMIN_EMAILS;
    else process.env.ACADEMY_ADMIN_EMAILS = prevAcademyAdminEmails;
    if (prevSmartcheckEnabled === undefined) delete process.env.SMARTCHECK_IMPORT_ENABLED;
    else process.env.SMARTCHECK_IMPORT_ENABLED = prevSmartcheckEnabled;
  });

  const [
    { createApiApp },
    { getControlDatabase },
    { withAppTenant, withSuperAdminQueueRead },
    schema,
    { AuthService },
    { ALLPLAN_DETAILED_LESSONS },
    { ALLPLAN_ASSESSMENT, ALLPLAN_PROGRAM_VERSION },
  ] = await Promise.all([
    import("../app"),
    import("../../db/control-plane"),
    import("../../db/app-tenant"),
    import("../../db/schema"),
    import("../../services/auth/authService"),
    import("../../academy/allplan/track"),
    import("../../academy/allplan/certification"),
  ]);

  const server = createServer(createApiApp());
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise<void>((resolve) => {
    server.close(() => resolve());
    server.closeAllConnections();
  }));
  const { port } = server.address() as AddressInfo;
  const base = `http://127.0.0.1:${port}`;

  const suffix = crypto.randomUUID().slice(0, 8);
  const controlDb = getControlDatabase().db;

  // 1. Seed plan, company, super admin, and tenant owner
  const [plan] = await controlDb.insert(schema.plans).values({
    name: `T43 Kurumsal ${suffix}`,
    monthlyPrice: 8500,
    monthlyQuoteLimit: 100,
    monthlyIfcLimit: 50,
    ifcMaxFileMb: 85,
    ifcMaxConcurrent: 2,
    monthlyAiLimit: 50,
    monthlyPdfLimit: 100,
    monthlyCrmLimit: 100,
    monthlyRegulationLimit: 50,
    monthlyProfitAnalysisLimit: 100,
    storageMaxBytes: 50 * 1024 * 1024,
    maxDocuments: 50,
    isActive: true,
    isPublished: true,
  }).returning();

  const [company] = await controlDb.insert(schema.companies).values({
    name: `T43 Mühendislik A.Ş. ${suffix}`,
    isSmartcheckEnabled: true,
  }).returning();

  await controlDb.insert(schema.subscriptions).values({
    companyId: company.id,
    planId: plan.id,
    status: "active",
  });

  const [superAdmin] = await controlDb.insert(schema.users).values({
    email: "hazarvolga@gmail.com",
    fullName: "Hazar Volga Ekiz",
    isSuperAdmin: true,
    emailVerified: new Date(),
  }).onConflictDoUpdate({
    target: schema.users.email,
    set: { isSuperAdmin: true, emailVerified: new Date() },
  }).returning();

  const [owner] = await controlDb.insert(schema.users).values({
    email: `owner-${suffix}@example.test`,
    fullName: "T43 Firma Sahibi",
    emailVerified: new Date(),
  }).returning();

  await controlDb.insert(schema.memberships).values([
    { userId: owner.id, companyId: company.id, role: "owner" },
    { userId: superAdmin.id, companyId: company.id, role: "admin" },
  ]);

  const adminToken = AuthService.generateToken({
    userId: superAdmin.id,
    companyId: company.id,
    role: "admin",
  });
  const ownerToken = AuthService.generateToken({
    userId: owner.id,
    companyId: company.id,
    role: "owner",
  });

  const reqJson = async (method: string, path: string, token: string, body?: unknown, extraHeaders?: Record<string, string>) => {
    const res = await fetch(`${base}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...extraHeaders,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let json: any = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = text;
    }
    return { status: res.status, json, text };
  };

  // ── A. Admin Dashboard, Tenants, Plans, Reports ───────────────────────────
  const dash = await reqJson("GET", "/api/admin/dashboard", adminToken);
  assert.equal(dash.status, 200);
  assert.ok(typeof dash.json.totalTenants === "number");

  const tenants = await reqJson("GET", "/api/admin/tenants", adminToken);
  assert.equal(tenants.status, 200);
  assert.ok(Array.isArray(tenants.json));

  const badTenant = await reqJson("GET", "/api/admin/tenants/not-a-uuid", adminToken);
  assert.equal(badTenant.status, 400);

  const missingTenant = await reqJson("GET", `/api/admin/tenants/${crypto.randomUUID()}`, adminToken);
  assert.equal(missingTenant.status, 404);

  const tenantDetail = await reqJson("GET", `/api/admin/tenants/${company.id}`, adminToken);
  assert.equal(tenantDetail.status, 200);
  assert.equal(tenantDetail.json.company.id, company.id);

  const patchTenantEmpty = await reqJson("PATCH", `/api/admin/tenants/${company.id}`, adminToken, {});
  assert.equal(patchTenantEmpty.status, 400);

  const patchTenantOk = await reqJson("PATCH", `/api/admin/tenants/${company.id}`, adminToken, {
    isSmartcheckEnabled: true,
    adminNotes: "T43 denetim notu",
  });
  assert.equal(patchTenantOk.status, 200);

  const plansList = await reqJson("GET", "/api/admin/plans", adminToken);
  assert.equal(plansList.status, 200);
  assert.ok(Array.isArray(plansList.json));

  const createPlanBad = await reqJson("POST", "/api/admin/plans", adminToken, { name: "" });
  assert.equal(createPlanBad.status, 400);

  const createPlanOk = await reqJson("POST", "/api/admin/plans", adminToken, {
    name: `T43 Yeni Paket ${suffix}`,
    monthlyPrice: 4500,
    monthlyQuoteLimit: 40,
    monthlyIfcLimit: 10,
    ifcMaxFileMb: 50,
    ifcMaxConcurrent: 1,
    monthlyAiLimit: 20,
    monthlyPdfLimit: 40,
    monthlyCrmLimit: 40,
    monthlyRegulationLimit: 20,
    monthlyProfitAnalysisLimit: 20,
    storageMaxBytes: 25 * 1024 * 1024,
    maxDocuments: 20,
    isActive: true,
    isPublished: true,
  });
  assert.equal(createPlanOk.status, 201);

  const syncCatalog = await reqJson("POST", "/api/admin/plans/sync-catalog", adminToken, {});
  assert.equal(syncCatalog.status, 200);
  assert.equal(syncCatalog.json.success, true);
  const catalogPlanId = "2b507e20-83d1-4b21-9fc1-000000000005";
  const tunePlan = await reqJson("PATCH", `/api/admin/plans/${catalogPlanId}`, adminToken, { ifcMaxFileMb: 100 });
  assert.equal(tunePlan.status, 200);
  const resync = await reqJson("POST", "/api/admin/plans/sync-catalog", adminToken, {});
  assert.equal(resync.status, 200);
  assert.equal(resync.json.inserted, 0);
  assert.ok(resync.json.preserved.some((plan: { id: string; fields: string[] }) => plan.id === catalogPlanId && plan.fields.includes("ifcMaxFileMb")));

  const watchList = await reqJson("GET", "/api/admin/regulation-watch", adminToken);
  assert.equal(watchList.status, 200);
  assert.ok(Array.isArray(watchList.json.items) && Array.isArray(watchList.json.days));
  assert.equal((await reqJson("PATCH", `/api/admin/regulation-watch/${crypto.randomUUID()}`, adminToken, { status: "other" })).status, 400);
  assert.equal((await reqJson("PATCH", `/api/admin/regulation-watch/${crypto.randomUUID()}`, adminToken, { status: "reviewed" })).status, 404);

  const previousTuikKey = process.env.TUIK_SDMX_API_KEY;
  delete process.env.TUIK_SDMX_API_KEY;
  const tuikConnection = await reqJson("GET", "/api/admin/tuik/connection", adminToken);
  if (previousTuikKey !== undefined) process.env.TUIK_SDMX_API_KEY = previousTuikKey;
  assert.equal(tuikConnection.status, 200);
  assert.equal(tuikConnection.json.status, "not_configured");

  const usageReport = await reqJson("GET", "/api/admin/reports/usage", adminToken);
  assert.equal(usageReport.status, 200);
  assert.ok(Array.isArray(usageReport.json.topConsumers));

  const csvExport = await reqJson("GET", "/api/admin/reports/export", adminToken);
  assert.equal(csvExport.status, 200);
  assert.ok(csvExport.text.includes("Firma Adı"));

  // ── B. Admin Pricing Sources, Official Catalog Import & Staging Review ────
  const createSourceBad = await reqJson("POST", "/api/admin/pricing-sources", adminToken, {
    name: "X",
    code: "BAD CODE!",
  });
  assert.equal(createSourceBad.status, 400);

  const sourceCode = `t43_src_${suffix.replace(/-/g, "_")}`;
  const createSource = await reqJson("POST", "/api/admin/pricing-sources", adminToken, {
    name: `T43 Kaynak ${suffix}`,
    code: sourceCode,
    authority: "ÇŞB Yüksek Fen Kurulu",
    category: "official_gazette",
    sourceUrl: "https://csb.gov.tr/birim-fiyatlar-2026",
    syncFrequency: "monthly",
    versionTag: "metadata-only",
    autoApprove: false,
  });
  assert.equal(createSource.status, 201);
  const sourceId = createSource.json.id as string;

  const duplicateSource = await reqJson("POST", "/api/admin/pricing-sources", adminToken, {
    name: `T43 Kaynak ${suffix}`,
    code: sourceCode,
    category: "official_gazette",
    sourceUrl: "https://csb.gov.tr/birim-fiyatlar-2026",
  });
  assert.equal(duplicateSource.status, 409);

  const verifySource = await reqJson("POST", `/api/admin/pricing-sources/${sourceId}/verify`, adminToken, {
    versionTag: "2026/1",
    validityStart: "2026-01-01",
    validityEnd: "2026-12-31",
    autoApprove: false,
  });
  assert.equal(verifySource.status, 200);
  assert.equal(verifySource.json.success, true);

  const listSources = await reqJson("GET", "/api/admin/pricing-sources", adminToken);
  assert.equal(listSources.status, 200);
  assert.ok(Array.isArray(listSources.json));

  const officialCatalogs = await reqJson("GET", "/api/admin/pricing-sources/official-catalogs", adminToken);
  assert.equal(officialCatalogs.status, 200);
  assert.ok(Array.isArray(officialCatalogs.json.catalogs));

  const importCsvRes = await reqJson("POST", `/api/admin/pricing-sources/${sourceId}/import-csv`, adminToken, {
    fileName: "csb-2026-test.csv",
    licenseConfirmed: true,
    licenseReference: "CSB-2026-RESMI-TEST-LISANS",
    validityStart: "2026-01-01",
    validityEnd: "2026-12-31",
    autoApprove: false,
    csv: "itemCode,itemName,unit,price\n15.120.1001,C25/30 Hazır Beton,m3,3450.50\n15.140.1002,Nervürlü Donatı Çeliği,ton,42000.00\n",
  });
  assert.equal(importCsvRes.status, 201);
  assert.equal(importCsvRes.json.insertedCount, 2);

  const stagingList = await reqJson("GET", "/api/admin/pricing-sources/staging", adminToken);
  assert.equal(stagingList.status, 200);
  const stagedForSource = (stagingList.json as any[]).filter((r) => r.sourceId === sourceId);
  assert.equal(stagedForSource.length, 2);

  const reviewSingleReject = await reqJson(
    "POST",
    `/api/admin/pricing-sources/staging/${stagedForSource[0].id}/review`,
    adminToken,
    { action: "reject", notes: "Tekil ret testi" },
  );
  assert.equal(reviewSingleReject.status, 200);
  assert.equal(reviewSingleReject.json.item.status, "rejected");

  const bulkReject = await reqJson("POST", "/api/admin/pricing-sources/staging/bulk-review", adminToken, {
    action: "reject",
    sourceId,
    notes: "Toplu ret testi",
  });
  assert.equal(bulkReject.status, 200);
  assert.equal(bulkReject.json.processedCount, 1);

  if (officialCatalogs.json.catalogs.length > 0) {
    const firstCatalogId = officialCatalogs.json.catalogs[0].id;
    const importOfficial = await reqJson(
      "POST",
      `/api/admin/pricing-sources/${sourceId}/import-official-catalog`,
      adminToken,
      {
        catalogId: firstCatalogId,
        licenseConfirmed: true,
        licenseReference: "CSB-2026-OFFICIAL-CATALOG-TEST",
        autoApprove: true,
      },
    );
    assert.equal(importOfficial.status, 201);

    const importOfficialReuse = await reqJson(
      "POST",
      `/api/admin/pricing-sources/${sourceId}/import-official-catalog`,
      adminToken,
      {
        catalogId: firstCatalogId,
        licenseConfirmed: true,
        licenseReference: "CSB-2026-OFFICIAL-CATALOG-TEST",
        autoApprove: true,
      },
    );
    assert.equal(importOfficialReuse.status, 200);
    assert.equal(importOfficialReuse.json.reused, true);
  }

  const schedulerStatus = await reqJson("GET", "/api/admin/pricing-sources/scheduler/status", adminToken);
  assert.equal(schedulerStatus.status, 200);

  const syncPricingCatalog = await reqJson("POST", "/api/admin/pricing-sources/sync-catalog", adminToken, {});
  assert.equal(syncPricingCatalog.status, 200);
  assert.equal(syncPricingCatalog.json.success, true);

  const tuikMeta = await reqJson("GET", "/api/admin/pricing-sources/tuik-sdmx/metadata", adminToken);
  assert.equal(tuikMeta.status, 200);
  assert.equal(tuikMeta.json.standard, "SDMX 2.1 (ISO 17369)");

  assert.equal(
    (await reqJson("POST", "/api/admin/pricing-sources/not-a-uuid/sync-tuik-sdmx", adminToken, {})).status,
    400,
  );
  assert.equal(
    (await reqJson("POST", `/api/admin/pricing-sources/${sourceId}/sync-tuik-sdmx`, adminToken, {})).status,
    400,
  );
  assert.equal(
    (
      await reqJson("POST", `/api/admin/pricing-sources/${sourceId}/sync-tuik-sdmx`, adminToken, {
        mode: "live_nsiws",
        licenseConfirmed: true,
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await reqJson("POST", `/api/admin/pricing-sources/${sourceId}/sync-tuik-sdmx`, adminToken, {
        mode: "baseline_2026_catalog",
        licenseConfirmed: true,
        autoApprove: true,
      })
    ).status,
    201,
  );
  assert.equal(
    (
      await reqJson("POST", `/api/admin/pricing-sources/${sourceId}/sync-tuik-sdmx`, adminToken, {
        mode: "sdmx_csv",
        licenseConfirmed: true,
        autoApprove: true,
        sdmxPayload: [
          "DATAFLOW,NACE_REV2,TIME_PERIOD,OBS_VALUE",
          "TUIK:DF_IME(1.0),IME_GENEL,2026-02,1485.60",
        ].join("\n"),
      })
    ).status,
    201,
  );
  assert.equal(
    (
      await reqJson("POST", `/api/admin/pricing-sources/${sourceId}/sync-tuik-sdmx`, adminToken, {
        mode: "sdmx_json",
        licenseConfirmed: true,
        autoApprove: true,
        sdmxPayload: JSON.stringify({
          dataSets: [{ series: { "0:0": { observations: { "0": [4112.45] } } } }],
          structure: {
            dimensions: {
              series: [
                { id: "FREQ", values: [{ id: "M" }] },
                { id: "NACE_REV2", values: [{ id: "23.51", name: "Çimento" }] },
              ],
              observation: [{ id: "TIME_PERIOD", values: [{ id: "2026-02" }] }],
            },
          },
        }),
      })
    ).status,
    201,
  );

  // Additional admin & pricing-file-import validation/filter branches
  assert.equal((await reqJson("GET", `/api/admin/tenants?search=T43&status=active`, adminToken)).status, 200);
  assert.equal((await reqJson("PATCH", "/api/admin/tenants/not-a-uuid", adminToken, {})).status, 400);
  assert.equal((await reqJson("PATCH", "/api/admin/plans/not-a-uuid", adminToken, {})).status, 400);
  assert.equal((await reqJson("POST", "/api/admin/impersonate", adminToken, {})).status, 400);
  assert.equal((await reqJson("POST", "/api/admin/impersonate", adminToken, { targetCompanyId: company.id, readOnly: true })).status, 200);
  assert.equal((await reqJson("POST", "/api/admin/pricing-sources", adminToken, {})).status, 400);
  assert.equal((await reqJson("POST", "/api/admin/pricing-sources/not-a-uuid/verify", adminToken, {})).status, 400);
  assert.equal((await reqJson("POST", `/api/admin/pricing-sources/${crypto.randomUUID()}/verify`, adminToken, {})).status, 404);
  assert.equal((await reqJson("DELETE", "/api/admin/pricing-sources/not-a-uuid", adminToken)).status, 400);
  assert.equal((await reqJson("DELETE", `/api/admin/pricing-sources/${crypto.randomUUID()}`, adminToken)).status, 404);
  assert.equal((await reqJson("POST", "/api/admin/pricing-sources/not-a-uuid/import-csv", adminToken, {})).status, 400);
  assert.equal((await reqJson("POST", `/api/admin/pricing-sources/${sourceId}/import-csv`, adminToken, { csv: "x" })).status, 400);
  assert.equal((await reqJson("POST", `/api/admin/pricing-sources/${crypto.randomUUID()}/import-csv`, adminToken, {
    fileName: "missing.csv",
    licenseConfirmed: true,
    licenseReference: "CSB-2026-RESMI-TEST-LISANS",
    validityStart: "2026-01-01",
    validityEnd: "2026-12-31",
    csv: "itemCode,itemName,unit,price\n15.120.1001,C25/30 Hazır Beton,m3,3450.50\n",
  })).status, 404);
  assert.equal((await reqJson("POST", `/api/admin/pricing-sources/${sourceId}/import-csv`, adminToken, {
    fileName: "csb-2026-auto.csv",
    licenseConfirmed: true,
    licenseReference: "CSB-2026-RESMI-TEST-LISANS",
    validityStart: "2026-01-01",
    validityEnd: "2026-12-31",
    autoApprove: true,
    versionTag: "2026/2",
    csv: "itemCode,itemName,unit,price\n15.120.1001,C25/30 Hazır Beton,m3,3600.00\n",
  })).status, 201);
  assert.equal((await reqJson("POST", `/api/admin/pricing-sources/${sourceId}/import-official-catalog`, adminToken, {
    catalogId: "unknown_catalog_id",
    licenseConfirmed: true,
    licenseReference: "CSB-2026-OFFICIAL-CATALOG-TEST",
  })).status, 404);
  assert.equal((await reqJson("GET", `/api/admin/pricing-sources/staging?status=approved&sourceId=${sourceId}&search=C25&limit=10`, adminToken)).status, 200);
  assert.equal((await reqJson("POST", `/api/admin/pricing-sources/staging/${crypto.randomUUID()}/review`, adminToken, { action: "reject" })).status, 404);
  assert.equal((await reqJson("POST", "/api/admin/pricing-sources/staging/bulk-review", adminToken, { action: "approve", sourceId })).status, 409, "source usage permission review is required before approving staged prices");

  const deleteSource = await reqJson("DELETE", `/api/admin/pricing-sources/${sourceId}`, adminToken);
  assert.equal(deleteSource.status, 200);

  // ── C. Admin & Tenant Bank Transfer / Billing Routes ──────────────────────
  const saveBanksBad = await reqJson("PUT", "/api/admin/billing/bank-accounts", adminToken, { accounts: "invalid" });
  assert.equal(saveBanksBad.status, 400);

  const saveBanksOk = await reqJson("PUT", "/api/admin/billing/bank-accounts", adminToken, {
    accounts: [
      {
        id: "garanti-try-1",
        bankName: "Garanti BBVA",
        branchName: "Kurumsal Şube",
        accountHolder: "BIMPlan Teknoloji A.Ş.",
        iban: "TR330006100519786457841326",
        currency: "TRY",
        description: "Kurumsal Havale/EFT",
        isActive: true,
      },
    ],
  });
  assert.equal(saveBanksOk.status, 200);

  const adminBanks = await reqJson("GET", "/api/admin/billing/bank-accounts", adminToken);
  assert.equal(adminBanks.status, 200);

  const publicBanks = await reqJson("GET", "/api/public/bank-accounts", ownerToken);
  assert.equal(publicBanks.status, 200);

  const tenantBanks = await reqJson("GET", "/api/billing/bank-accounts", ownerToken);
  assert.equal(tenantBanks.status, 200);

  const tenantSub = await reqJson("GET", "/api/billing/subscription", ownerToken);
  assert.equal(tenantSub.status, 200);

  const tenantUsage = await reqJson("GET", "/api/billing/usage-stats", ownerToken);
  assert.equal(tenantUsage.status, 200);

  const tenantAlerts = await reqJson("GET", "/api/billing/alerts", ownerToken);
  assert.equal(tenantAlerts.status, 200);

  const initPayment = await reqJson("POST", "/api/billing/payment-requests/init", ownerToken, {
    planId: plan.id,
    billingCycle: "yearly",
  });
  assert.equal(initPayment.status, 201);
  const paymentRequestId = initPayment.json.requestId as string;

  const submitPayment = await reqJson("POST", "/api/billing/payment-requests", ownerToken, {
    requestId: paymentRequestId,
    planId: plan.id,
    billingCycle: "yearly",
    senderName: "T43 Mühendislik A.Ş.",
    receiptNumber: `DEKONT-${suffix}`,
    notes: "Yıllık paket ödemesi",
  });
  assert.equal(submitPayment.status, 201);

  const tenantPaymentList = await reqJson("GET", "/api/billing/payment-requests", ownerToken);
  assert.equal(tenantPaymentList.status, 200);

  const adminPaymentList = await reqJson("GET", `/api/admin/billing/payment-requests?companyId=${company.id}`, adminToken);
  assert.equal(adminPaymentList.status, 200);
  assert.equal(adminPaymentList.json.length, 1);

  const reviewPayment = await reqJson(
    "POST",
    `/api/admin/billing/payment-requests/${paymentRequestId}/review`,
    adminToken,
    { decision: "approved", adminDecisionNote: "Dekont doğrulandı" },
  );
  assert.equal(reviewPayment.status, 200);
  assert.equal(reviewPayment.json.request.status, "approved");

  assert.equal((await reqJson("POST", `/api/admin/billing/payment-requests/${paymentRequestId}/review`, adminToken, { decision: "approved" })).status, 409);
  assert.equal((await reqJson("POST", `/api/admin/billing/payment-requests/${crypto.randomUUID()}/review`, adminToken, { decision: "approved" })).status, 404);
  assert.equal((await reqJson("POST", `/api/admin/billing/payment-requests/${paymentRequestId}/review`, adminToken, {})).status, 400);
  assert.equal((await reqJson("POST", "/api/billing/payment-requests/init", ownerToken, {})).status, 400);
  assert.equal((await reqJson("POST", "/api/billing/payment-requests", ownerToken, {})).status, 400);

  // ── D. Company, Clients, Quotations, Profit, CRM Routes ───────────────────
  const aiStatusRes = await reqJson("GET", "/api/ai/status", ownerToken);
  assert.equal(aiStatusRes.status, 200);
  assert.equal(typeof aiStatusRes.json.configured, "boolean");

  const companyInfo = await reqJson("GET", "/api/company", ownerToken);
  assert.equal(companyInfo.status, 200);

  const companyProfile = await reqJson("GET", "/api/company/profile", ownerToken);
  assert.equal(companyProfile.status, 200);

  const patchProfile = await reqJson("PATCH", "/api/company/profile", ownerToken, {
    name: `T43 Mühendislik Güncel ${suffix}`,
    taxOffice: "Kadıköy VD",
    taxNumber: "1234567890",
    city: "İstanbul",
    district: "Kadıköy",
  });
  assert.equal(patchProfile.status, 200);

  const teamList = await reqJson("GET", "/api/company/team", ownerToken);
  assert.equal(teamList.status, 200);
  assert.ok(teamList.json.length >= 1);

  const riskSettingsGet = await reqJson("GET", "/api/company/risk-settings", ownerToken);
  assert.equal(riskSettingsGet.status, 200);

  const riskSettingsPost = await reqJson("POST", "/api/company/risk-settings", ownerToken, {
    activeStandard: "TS500",
    maxWastePercent: 6.5,
  });
  assert.equal(riskSettingsPost.status, 200);

  const riskCalibration = await reqJson("GET", "/api/company/risk-calibration", ownerToken);
  assert.equal(riskCalibration.status, 200);

  const riskReport = await reqJson("GET", "/api/company/risk-calibration/report", ownerToken);
  assert.equal(riskReport.status, 200);

  const createClientRes = await reqJson("POST", "/api/clients", ownerToken, {
    name: "T43 İşveren İnşaat A.Ş.",
    email: `client-${suffix}@example.test`,
    phone: "+905551112233",
    address: "Ataşehir / İstanbul",
  });
  assert.equal(createClientRes.status, 200);
  const clientId = createClientRes.json.id as string;

  const listClientsRes = await reqJson("GET", "/api/clients", ownerToken);
  assert.equal(listClientsRes.status, 200);
  assert.equal(listClientsRes.json.length, 1);

  const clientDetailRes = await reqJson("GET", `/api/clients/${clientId}`, ownerToken);
  assert.equal(clientDetailRes.status, 200);

  const updateClientRes = await reqJson("PATCH", `/api/clients/${clientId}`, ownerToken, {
    pipelineStage: "contacted",
    stageNote: { stage: "contacted", content: "İlk keşif toplantısı yapıldı." },
  });
  assert.equal(updateClientRes.status, 200);

  const addClientNoteRes = await reqJson("POST", `/api/clients/${clientId}/notes`, ownerToken, {
    stage: "quotation_sent",
    content: "Birim fiyat icmali paylaşıldı.",
    updatePipelineStage: true,
  });
  assert.equal(addClientNoteRes.status, 201);

  const bulkClientsRes = await reqJson("POST", "/api/clients/bulk-import", ownerToken, {
    duplicateStrategy: "update",
    clients: [{ name: "T43 İşveren İnşaat A.Ş.", email: `client-${suffix}@example.test`, pipelineStage: "negotiation", notes: "Revize pazarlık notu" }],
  });
  assert.equal(bulkClientsRes.status, 200);
  assert.equal(bulkClientsRes.json.updatedCount, 1);

  const createQuoteRes = await reqJson("POST", "/api/quotations", ownerToken, {
    clientId,
    quoteNumber: `TEK-T43-${suffix}`,
    projectName: `T43 Konut Projesi ${suffix}`,
    date: "2026-10-26",
    expiryDate: "2026-11-26",
    status: "draft",
    currency: "TRY",
    projectDurationMonths: 12,
    items: [
      {
        description: "C30/37 Betonarme Betonu",
        quantity: 100,
        unit: "m3",
        unitPrice: 1000,
        costUnitPrice: 800,
        wastePercent: 5,
        vatPercent: 20,
        discountPercent: 0,
      },
    ],
  });
  assert.equal(createQuoteRes.status, 200);
  const quotationId = createQuoteRes.json.id as string;

  const getQuotes = await reqJson("GET", "/api/quotations", ownerToken);
  assert.equal(getQuotes.status, 200);
  assert.equal(getQuotes.json.length, 1);

  const getQuoteDetail = await reqJson("GET", `/api/quotations/${quotationId}`, ownerToken);
  assert.equal(getQuoteDetail.status, 200);

  const getQuoteSmartcheck = await reqJson("GET", `/api/quotations/${quotationId}/smartcheck`, ownerToken);
  assert.equal(getQuoteSmartcheck.status, 200);

  const patchStatus = await reqJson("PATCH", `/api/quotations/${quotationId}/status`, ownerToken, {
    status: "sent",
  });
  assert.equal(patchStatus.status, 200);

  const patchCalibration = await reqJson("PATCH", `/api/quotations/${quotationId}/calibration`, ownerToken, {
    actualCost: 85000,
    actualDurationMonths: 6,
    note: "Gerçekleşen şantiye marjı",
  });
  assert.equal(patchCalibration.status, 200);

  const createRevision = await reqJson("POST", `/api/quotations/${quotationId}/revision`, ownerToken, {});
  assert.equal(createRevision.status, 200);

  const calcProfit = await reqJson("POST", "/api/profit/calculate", ownerToken, {
    quotationId,
  });
  assert.equal(calcProfit.status, 200);

  const getProfitReport = await reqJson("GET", `/api/profit/report/${quotationId}`, ownerToken);
  assert.equal(getProfitReport.status, 200);

  const createLead = await reqJson("POST", "/api/crm/leads", ownerToken, {
    name: "T43 Potansiyel Müşteri",
    email: `lead-${suffix}@example.test`,
    phone: "+905559998877",
    source: "web",
    notes: "Allplan BIM ihale talebi",
  });
  assert.equal(createLead.status, 201);

  const listLeads = await reqJson("GET", "/api/crm/leads?limit=20&offset=0", ownerToken);
  assert.equal(listLeads.status, 200);

  const createDeal = await reqJson("POST", "/api/crm/deals", ownerToken, {
    name: "T43 Konut Projesi İhalesi",
    clientId,
    value: 120000,
    stage: "lead",
  });
  assert.equal(createDeal.status, 201);
  const dealId = createDeal.json.id as string;

  const getDeal = await reqJson("GET", `/api/crm/deals/${dealId}`, ownerToken);
  assert.equal(getDeal.status, 200);

  const getPipeline = await reqJson("GET", "/api/crm/pipeline", ownerToken);
  assert.equal(getPipeline.status, 200);

  const addActivity = await reqJson("POST", "/api/crm/activities", ownerToken, {
    dealId,
    description: "İşveren teknik ofisi ile metraj mutabakatı yapıldı.",
  });
  assert.equal(addActivity.status, 201);

  const getActivities = await reqJson("GET", `/api/crm/deals/${dealId}/activities`, ownerToken);
  assert.equal(getActivities.status, 200);
  assert.equal(getActivities.json.length, 2);

  const updateStage = await reqJson("POST", "/api/crm/deals/update-stage", ownerToken, {
    dealId,
    stage: "negotiation",
  });
  assert.equal(updateStage.status, 200);

  assert.equal((await reqJson("PATCH", "/api/company/profile", ownerToken, { name: "" })).status, 400);
  assert.equal((await reqJson("POST", "/api/company/risk-settings", ownerToken, { activeStandard: "INVALID", maxWastePercent: -5 })).status, 200);
  assert.equal((await reqJson("POST", "/api/clients", ownerToken, { name: "" })).status, 400);
  assert.equal((await reqJson("GET", `/api/quotations/${crypto.randomUUID()}`, ownerToken)).status, 404);
  assert.equal((await reqJson("GET", `/api/quotations/${crypto.randomUUID()}/smartcheck`, ownerToken)).status, 404);
  assert.equal((await reqJson("PATCH", `/api/quotations/${quotationId}/status`, ownerToken, { status: "invalid" })).status, 400);
  assert.equal((await reqJson("PATCH", `/api/quotations/${quotationId}/calibration`, ownerToken, { actualCost: -5 })).status, 400);
  assert.equal((await reqJson("GET", "/api/crm/deals/not-a-uuid", ownerToken)).status, 400);
  assert.equal((await reqJson("GET", `/api/crm/deals/${crypto.randomUUID()}`, ownerToken)).status, 404);
  assert.equal((await reqJson("POST", "/api/crm/deals", ownerToken, {})).status, 400);
  assert.equal((await reqJson("POST", "/api/crm/activities", ownerToken, {})).status, 400);
  assert.equal((await reqJson("POST", "/api/crm/deals/update-stage", ownerToken, {})).status, 400);

  // ── E. Academy Routes (Enrollment, Webhook, Lessons, Progress, Certs) ─────
  const [product] = await controlDb.insert(schema.academyProducts).values({
    code: "allplan-pro",
    name: "ALLPLAN Pro BimPlan Academy",
    isActive: true,
  }).onConflictDoUpdate({
    target: schema.academyProducts.code,
    set: { isActive: true },
  }).returning();

  const [edition] = await controlDb.insert(schema.academyEditions).values({
    productId: product.id,
    version: ALLPLAN_PROGRAM_VERSION,
    name: "ALLPLAN 2026 Profesyonel",
    accessMode: "paid",
    isActive: true,
  }).onConflictDoUpdate({
    target: [schema.academyEditions.productId, schema.academyEditions.version],
    set: { isActive: true, name: "ALLPLAN 2026 Profesyonel" },
  }).returning();

  await controlDb.insert(schema.academyLearnerProfiles).values({
    userId: owner.id,
    companyId: company.id,
    termsVersion: "2026-01",
    termsAcceptedAt: new Date(),
    privacyVersion: "2026-01",
    privacyAcceptedAt: new Date(),
  });

  const summaryForbidden = await reqJson("GET", "/api/academy/activation/summary", ownerToken);
  assert.equal(summaryForbidden.status, 403);

  const summaryOk = await reqJson("GET", "/api/academy/activation/summary", adminToken);
  assert.equal(summaryOk.status, 200);

  // Non-super-admin owner cannot self-grant academy enrollments
  const ownerDeniedGrant = await reqJson("POST", "/api/academy/allplan/admin/enrollments", ownerToken, {
    userId: owner.id,
    source: "pilot",
  });
  assert.equal(ownerDeniedGrant.status, 403);

  // Super-admin grant enrollment
  const grantEnrollment = await reqJson("POST", "/api/academy/allplan/admin/enrollments", adminToken, {
    userId: owner.id,
    source: "pilot",
  });
  assert.equal(grantEnrollment.status, 201);
  const enrollmentId = grantEnrollment.json.enrollment.id as string;

  const listEnrollments = await reqJson("GET", "/api/academy/allplan/admin/enrollments", adminToken);
  assert.equal(listEnrollments.status, 200);
  assert.equal(listEnrollments.json.enrollments.length, 1);

  const revokeEnrollment = await reqJson(
    "POST",
    `/api/academy/allplan/admin/enrollments/${enrollmentId}/status`,
    adminToken,
    { status: "revoked", reason: "Test iptali" },
  );
  assert.equal(revokeEnrollment.status, 200);

  // Payment webhook (purchase completed + duplicate)
  const webhookPayload = JSON.stringify({
    provider: "iyzico",
    eventId: `evt_${suffix}_1`,
    type: "academy.purchase.completed",
    paymentReference: `pay_${suffix}_1`,
    companyId: company.id,
    userId: owner.id,
  });
  const ts = Math.floor(Date.now() / 1000);
  const hmac = crypto
    .createHmac("sha256", process.env.ACADEMY_PAYMENT_WEBHOOK_SECRET!)
    .update(`${ts}.`)
    .update(Buffer.from(webhookPayload, "utf8"))
    .digest("hex");
  const signature = `t=${ts},v1=${hmac}`;
  const webhookRes = await fetch(`${base}/api/academy/allplan/webhooks/payment`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-academy-signature": signature,
    },
    body: webhookPayload,
  });
  assert.equal(webhookRes.status, 201);

  const webhookDup = await fetch(`${base}/api/academy/allplan/webhooks/payment`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-academy-signature": signature,
    },
    body: webhookPayload,
  });
  assert.equal(webhookDup.status, 200);

  // Learner routes under active enrollment
  const entitlementRes = await reqJson("GET", "/api/academy/allplan/entitlement", ownerToken);
  assert.equal(entitlementRes.status, 200);

  const learnerProfileRes = await reqJson("GET", "/api/academy/allplan/learner-profile", ownerToken);
  assert.equal(learnerProfileRes.status, 200);

  const firstLesson = ALLPLAN_DETAILED_LESSONS[0];
  const onboardingRes = await reqJson("PUT", "/api/academy/allplan/onboarding", ownerToken, {
    lessonSlug: firstLesson.slug,
  });
  assert.equal(onboardingRes.status, 200);

  const earlyAccess1 = await reqJson("POST", "/api/academy/allplan/structural-early-access", ownerToken, {});
  assert.equal(earlyAccess1.status, 201);
  const earlyAccess2 = await reqJson("POST", "/api/academy/allplan/structural-early-access", ownerToken, {});
  assert.equal(earlyAccess2.status, 200);

  const curriculumRes = await reqJson("GET", "/api/academy/allplan/curriculum", ownerToken);
  assert.equal(curriculumRes.status, 200);

  const companionRes = await reqJson("POST", "/api/academy/allplan/companion/query", ownerToken, {
    question: "Allplan içinde duvar ve katman yüksekliği nasıl tanımlanır?",
  });
  assert.equal(companionRes.status, 200);

  const getLessonRes = await reqJson("GET", `/api/academy/allplan/lessons/${firstLesson.slug}`, ownerToken);
  assert.equal(getLessonRes.status, 200);

  const createNoteRes = await reqJson("POST", `/api/academy/allplan/lessons/${firstLesson.slug}/notes`, ownerToken, {
    body: "Kat yüksekliği ve düzlem bağlantısı notu.",
  });
  assert.equal(createNoteRes.status, 201);
  const noteId = createNoteRes.json.note.id as string;

  const bookmarkOn = await reqJson("PUT", `/api/academy/allplan/lessons/${firstLesson.slug}/bookmark`, ownerToken, {
    bookmarked: true,
  });
  assert.equal(bookmarkOn.status, 200);

  const studyTimeRes = await reqJson("PUT", `/api/academy/allplan/lessons/${firstLesson.slug}/time`, ownerToken, {
    deltaSeconds: 30,
  });
  assert.equal(studyTimeRes.status, 200);

  const getActivityRes = await reqJson("GET", `/api/academy/allplan/lessons/${firstLesson.slug}/activity`, ownerToken);
  assert.equal(getActivityRes.status, 200);
  assert.equal(getActivityRes.json.notes.length, 1);
  assert.equal(getActivityRes.json.bookmarked, true);

  const deleteNoteRes = await reqJson("DELETE", `/api/academy/allplan/lessons/${firstLesson.slug}/notes/${noteId}`, ownerToken);
  assert.equal(deleteNoteRes.status, 204);

  const bookmarkOff = await reqJson("PUT", `/api/academy/allplan/lessons/${firstLesson.slug}/bookmark`, ownerToken, {
    bookmarked: false,
  });
  assert.equal(bookmarkOff.status, 200);

  const progressInsufficient = await reqJson("PUT", `/api/academy/allplan/progress/${firstLesson.slug}`, ownerToken, {
    completed: true,
  });
  assert.equal(progressInsufficient.status, 409);

  // Seed study time & progress for all lessons so certification exam can be taken
  await withAppTenant({ companyId: company.id, userId: owner.id }, async (tenantDb) => {
    const now = new Date();
    for (const lesson of ALLPLAN_DETAILED_LESSONS) {
      await tenantDb.insert(schema.allplanLessonActivity).values({
        companyId: company.id,
        userId: owner.id,
        lessonSlug: lesson.slug,
        activeSeconds: 7200,
        lastViewedAt: now,
        updatedAt: now,
      }).onConflictDoUpdate({
        target: [schema.allplanLessonActivity.userId, schema.allplanLessonActivity.companyId, schema.allplanLessonActivity.lessonSlug],
        set: { activeSeconds: 7200, updatedAt: now },
      });
      await tenantDb.insert(schema.allplanLessonProgress).values({
        companyId: company.id,
        userId: owner.id,
        lessonSlug: lesson.slug,
        completedAt: now,
        checkpointCompletedAt: lesson.interactiveTool ? now : null,
        checkpointVersion: lesson.interactiveTool ? "v1" : null,
        checkpointEvidence: lesson.interactiveTool ? { seeded: true } : null,
        updatedAt: now,
      }).onConflictDoUpdate({
        target: [schema.allplanLessonProgress.userId, schema.allplanLessonProgress.companyId, schema.allplanLessonProgress.lessonSlug],
        set: {
          completedAt: now,
          checkpointCompletedAt: lesson.interactiveTool ? now : null,
          checkpointVersion: lesson.interactiveTool ? "v1" : null,
          updatedAt: now,
        },
      });
    }
  });

  const progressListRes = await reqJson("GET", "/api/academy/allplan/progress", ownerToken);
  assert.equal(progressListRes.status, 200);
  assert.equal(progressListRes.json.completedLessons.length, ALLPLAN_DETAILED_LESSONS.length);

  const certStateRes = await reqJson("GET", "/api/academy/allplan/certification", ownerToken);
  assert.equal(certStateRes.status, 200);
  assert.equal(certStateRes.json.eligibility.eligible, true);

  const winningAnswers = ALLPLAN_ASSESSMENT.map((q) => q.answer);
  const examAttemptRes = await reqJson("POST", "/api/academy/allplan/certification/attempts", ownerToken, {
    answers: winningAnswers,
  });
  assert.equal(examAttemptRes.status, 201);
  assert.equal(examAttemptRes.json.attempt.passed, true);
  const certNumber = examAttemptRes.json.certificate.certificateNumber as string;

  const verifyCertRes = await reqJson("GET", `/api/academy/allplan/certificates/verify/${certNumber}`, ownerToken);
  assert.equal(verifyCertRes.status, 200);
  assert.equal(verifyCertRes.json.certificate.status, "active");

  const revokeCertRes = await reqJson("POST", `/api/academy/allplan/certificates/${certNumber}/revoke`, ownerToken, {
    reason: "Test kapsamında iptal edildi",
  });
  assert.equal(revokeCertRes.status, 200);
  assert.equal(revokeCertRes.json.status, "revoked");

  // Academy validation & edge branches
  assert.equal((await reqJson("GET", "/api/academy/allplan/certificates/verify/INVALID", ownerToken)).status, 400);
  assert.equal((await reqJson("GET", "/api/academy/allplan/certificates/verify/BPA-2026-000000000000", ownerToken)).status, 404);
  assert.equal((await reqJson("POST", "/api/academy/allplan/admin/enrollments", adminToken, { userId: "bad" })).status, 400);
  assert.equal((await reqJson("POST", "/api/academy/allplan/admin/enrollments", adminToken, { userId: crypto.randomUUID(), source: "pilot" })).status, 404);
  assert.equal((await reqJson("POST", "/api/academy/allplan/admin/enrollments", adminToken, { userId: owner.id, source: "pilot" })).status, 200);
  assert.equal((await reqJson("POST", "/api/academy/allplan/admin/enrollments/bad/status", adminToken, { status: "revoked", reason: "x" })).status, 400);
  assert.equal((await reqJson("POST", `/api/academy/allplan/admin/enrollments/${enrollmentId}/status`, adminToken, { status: "revoked", reason: "" })).status, 400);
  assert.equal((await reqJson("POST", `/api/academy/allplan/admin/enrollments/${crypto.randomUUID()}/status`, adminToken, { status: "revoked", reason: "x" })).status, 404);
  assert.equal((await reqJson("PUT", "/api/academy/allplan/onboarding", ownerToken, { lessonSlug: "no-such-lesson" })).status, 400);
  assert.equal((await reqJson("POST", "/api/academy/allplan/companion/query", ownerToken, { question: "a" })).status, 400);
  assert.equal((await reqJson("GET", "/api/academy/allplan/lessons/no-such-lesson", ownerToken)).status, 404);
  assert.equal((await reqJson("GET", "/api/academy/allplan/lessons/no-such-lesson/activity", ownerToken)).status, 404);
  assert.equal((await reqJson("POST", "/api/academy/allplan/lessons/no-such-lesson/notes", ownerToken, { body: "x" })).status, 404);
  assert.equal((await reqJson("POST", `/api/academy/allplan/lessons/${firstLesson.slug}/notes`, ownerToken, { body: "" })).status, 400);
  assert.equal((await reqJson("PUT", "/api/academy/allplan/lessons/no-such-lesson/bookmark", ownerToken, { bookmarked: true })).status, 400);
  assert.equal((await reqJson("PUT", `/api/academy/allplan/lessons/${firstLesson.slug}/time`, ownerToken, { deltaSeconds: 0 })).status, 400);
  assert.equal((await reqJson("PUT", "/api/academy/allplan/lessons/no-such-lesson/time", ownerToken, { deltaSeconds: 10 })).status, 404);
  assert.equal((await reqJson("PUT", "/api/academy/allplan/progress/no-such-lesson", ownerToken, { completed: true })).status, 400);
  assert.equal((await reqJson("PUT", `/api/academy/allplan/progress/${firstLesson.slug}`, ownerToken, { completed: false })).status, 200);
  assert.equal((await reqJson("PUT", `/api/academy/allplan/progress/${firstLesson.slug}`, ownerToken, { completed: true })).status, 200);
  assert.equal((await reqJson("POST", "/api/academy/allplan/lessons/no-such-lesson/checkpoint", ownerToken, {})).status, 404);
  const interactiveLesson = ALLPLAN_DETAILED_LESSONS.find((l) => Boolean(l.interactiveTool));
  if (interactiveLesson) {
    assert.equal((await reqJson("POST", `/api/academy/allplan/lessons/${interactiveLesson.slug}/checkpoint`, ownerToken, { evidence: {} })).status, 400);
  }
  assert.equal((await reqJson("POST", "/api/academy/allplan/certification/attempts", ownerToken, { answers: [] })).status, 400);
  assert.equal((await reqJson("POST", `/api/academy/allplan/certificates/${certNumber}/revoke`, ownerToken, { reason: "" })).status, 400);
  assert.equal((await reqJson("POST", `/api/academy/allplan/certificates/${certNumber}/revoke`, ownerToken, { reason: "Tekrar iptal" })).status, 409);
  assert.equal((await reqJson("POST", "/api/academy/allplan/certificates/BPA-2026-000000000000/revoke", ownerToken, { reason: "Yok" })).status, 404);

  // ── F. SmartCheck Kit, IDS, Sample Projects & Document Read/Review Routes ─
  const epysKit = await reqJson("GET", "/api/smartcheck/epys-allplan-kit", ownerToken);
  assert.equal(epysKit.status, 200);

  const epysIds = await reqJson("GET", "/api/smartcheck/epys-ids", ownerToken);
  assert.equal(epysIds.status, 200);

  const sampleList = await reqJson("GET", "/api/smartcheck/sample-projects", ownerToken);
  assert.equal(sampleList.status, 200);
  assert.ok(Array.isArray(sampleList.json.items));

  for (const sampleItem of sampleList.json.items.slice(0, 2)) {
    const sampleId = sampleItem.id as string;
    const loadSample = await reqJson("POST", `/api/smartcheck/sample-projects/${sampleId}`, ownerToken, {});
    assert.equal(loadSample.status, 201);
    const sampleDocId = loadSample.json.documentId as string;

    const docStatus = await reqJson("GET", `/api/smartcheck/documents/${sampleDocId}/status`, ownerToken);
    assert.equal(docStatus.status, 200);

    const docRows = await reqJson("GET", `/api/smartcheck/documents/${sampleDocId}/rows`, ownerToken);
    assert.equal(docRows.status, 200);

    const docEpys = await reqJson("GET", `/api/smartcheck/documents/${sampleDocId}/epys-preflight`, ownerToken);
    assert.ok([200, 404].includes(docEpys.status));

    const docPdf = await reqJson("GET", `/api/smartcheck/documents/${sampleDocId}/pdf-preflight`, ownerToken);
    assert.ok([200, 404].includes(docPdf.status));

    const docPdfa = await reqJson("GET", `/api/smartcheck/documents/${sampleDocId}/pdfa-validation`, ownerToken);
    assert.ok([200, 404].includes(docPdfa.status));

    if (Array.isArray(docRows.json) && docRows.json.length > 0) {
      const firstRowId = docRows.json[0].id as string;
      const reviewRow = await reqJson("PATCH", `/api/smartcheck/rows/${firstRowId}/review`, ownerToken, {
        status: "accepted_exception",
        notes: "T43 satır inceleme istisna onayı",
        correction: {
          price: 1200,
          quantity: 10,
          unit: "m3",
          wastePercent: 2,
        },
      });
      assert.equal(reviewRow.status, 200);

      if (docRows.json.length > 1) {
        const cleanRows = docRows.json
          .slice(1)
          .filter((r: any) => !Array.isArray(r.findingsJson) || r.findingsJson.length === 0);
        if (cleanRows.length > 0) {
          const bulkReviewRows = await reqJson("PATCH", `/api/smartcheck/documents/${sampleDocId}/bulk-review`, ownerToken, {
            rowIds: [cleanRows[0].id],
            status: "approved",
            notes: "T43 toplu inceleme onayı",
          });
          assert.equal(bulkReviewRows.status, 200);
        }
      }

      const transferNew = await reqJson(
        "POST",
        `/api/smartcheck/documents/${sampleDocId}/transfer-to-new-quotation`,
        ownerToken,
        {
          clientId,
          projectName: `SmartCheck Aktarım ${sampleId}`,
          rowIds: [firstRowId],
          overrides: {
            [firstRowId]: {
              quantity: 10,
              unitPrice: 1200,
              costUnitPrice: 1000,
              wastePercent: 2,
              vatPercent: 20,
            },
          },
        },
      );
      assert.equal(transferNew.status, 201);
      const draftQuoteId = transferNew.json.quotationId as string;

      const transferExisting = await reqJson(
        "POST",
        `/api/smartcheck/documents/${sampleDocId}/transfer-to-quotation`,
        ownerToken,
        {
          quotationId: draftQuoteId,
          rowIds: [firstRowId],
          overrides: {
            [firstRowId]: {
              quantity: 10,
              unitPrice: 1200,
              costUnitPrice: 1000,
              wastePercent: 2,
              vatPercent: 20,
            },
          },
        },
      );
      assert.equal(transferExisting.status, 200);
    }
  }

  const scQueue = await reqJson("GET", "/api/smartcheck/queue", ownerToken);
  assert.equal(scQueue.status, 200);

  await assert.rejects(
    withSuperAdminQueueRead(superAdmin.id, async () => {
      throw new Error("queue-read-rollback-check");
    }),
    /queue-read-rollback-check/,
  );
});
