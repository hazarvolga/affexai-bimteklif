import assert from "node:assert/strict";
import test from "node:test";

test("fetchTenantIfcLimits worker production path via capability function", async (t) => {
  const { fetchTenantIfcLimits, IfcNotAvailableError, IfcLimitsUnavailableError } =
    await import("./config");

  const savedNodeEnv = process.env.NODE_ENV;
  t.after(() => { process.env.NODE_ENV = savedNodeEnv; });
  process.env.NODE_ENV = "production";

  await t.test("valid company + active plan returns limits from capability function", async () => {
    const mockDb = {
      execute: async () => ({
        rows: [{
          company_exists: true,
          plan_is_active: true,
          monthly_ifc_limit: 25,
          ifc_max_file_mb: 80,
          ifc_max_concurrent: 2,
        }],
      }),
    };
    const limits = await fetchTenantIfcLimits("00000000-0000-0000-0000-000000000001", mockDb, "worker");
    assert.strictEqual(limits.maxFileBytes, 80 * 1024 * 1024);
    assert.strictEqual(limits.maxConcurrent, 2);
    assert.strictEqual(limits.monthlyLimit, 25);
  });

  await t.test("company_exists=false throws IfcNotAvailableError", async () => {
    const mockDb = {
      execute: async () => ({
        rows: [{ company_exists: false, plan_is_active: null, monthly_ifc_limit: null, ifc_max_file_mb: null, ifc_max_concurrent: null }],
      }),
    };
    await assert.rejects(
      () => fetchTenantIfcLimits("00000000-0000-0000-0000-000000000002", mockDb, "worker"),
      (err: any) => err instanceof IfcNotAvailableError && err.code === "IFC_NOT_AVAILABLE"
    );
  });

  await t.test("plan_is_active=false throws IfcNotAvailableError (fail-closed, no fallback)", async () => {
    const mockDb = {
      execute: async () => ({
        rows: [{ company_exists: true, plan_is_active: false, monthly_ifc_limit: 10, ifc_max_file_mb: 50, ifc_max_concurrent: 1 }],
      }),
    };
    await assert.rejects(
      () => fetchTenantIfcLimits("00000000-0000-0000-0000-000000000003", mockDb, "worker"),
      (err: any) => err instanceof IfcNotAvailableError && err.code === "IFC_NOT_AVAILABLE"
    );
  });

  await t.test("DB execute error fails closed with IfcLimitsUnavailableError", async () => {
    const mockDb = {
      execute: async () => { throw new Error("connection refused"); },
    };
    await assert.rejects(
      () => fetchTenantIfcLimits("00000000-0000-0000-0000-000000000004", mockDb, "worker"),
      (err: any) => err instanceof IfcLimitsUnavailableError && err.code === "IFC_LIMITS_UNAVAILABLE"
    );
  });

  await t.test("env upper bound (SMARTCHECK_MAX_IFC_FILE_MB=50) caps plan 100MB", async () => {
    const savedMaxFileMb = process.env.SMARTCHECK_MAX_IFC_FILE_MB;
    process.env.SMARTCHECK_MAX_IFC_FILE_MB = "50";
    try {
      const mockDb = {
        execute: async () => ({
          rows: [{ company_exists: true, plan_is_active: true, monthly_ifc_limit: 200, ifc_max_file_mb: 100, ifc_max_concurrent: 1 }],
        }),
      };
      const limits = await fetchTenantIfcLimits("00000000-0000-0000-0000-000000000005", mockDb, "worker");
      assert.strictEqual(limits.maxFileBytes, 50 * 1024 * 1024, "plan 100MB capped to env 50MB");
      assert.strictEqual(limits.monthlyLimit, 200, "monthly limit unaffected by file-mb env cap");
    } finally {
      if (savedMaxFileMb !== undefined) process.env.SMARTCHECK_MAX_IFC_FILE_MB = savedMaxFileMb;
      else delete process.env.SMARTCHECK_MAX_IFC_FILE_MB;
    }
  });

  await t.test("caller=app does NOT use execute path even in production", async () => {
    let executeCalled = false;
    const mockDb = {
      execute: async () => { executeCalled = true; return { rows: [] }; },
      select: () => { throw new Error("select-path-reached"); },
    };
    // app path falls through to Drizzle select, which throws → wrapped as IfcLimitsUnavailableError
    await assert.rejects(
      () => fetchTenantIfcLimits("00000000-0000-0000-0000-000000000006", mockDb, "app"),
      (err: any) => err instanceof IfcLimitsUnavailableError
    );
    assert.strictEqual(executeCalled, false, "execute must not be called for app caller");
  });
});
