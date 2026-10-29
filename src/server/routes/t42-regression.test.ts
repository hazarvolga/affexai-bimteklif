import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createAuthenticate } from "../middleware/auth";
import { createRequireAllplanEntitlement, isAcademyRuntimeEnabled } from "../middleware/academyEntitlement";
import { QuotationIntegrityError, resolveQuotationIndustryId } from "../../services/quotations/integrity";
import { DEFAULT_SMARTCHECK_LEASE_TIMEOUT_MS, isSmartCheckLeaseExpired } from "../../smartcheck/import/processor";
import { AuthService } from "../../services/auth/authService";

function createMockRes() {
  return {
    statusCode: 200,
    headers: {} as Record<string, string>,
    body: undefined as unknown,
    locals: {} as Record<string, unknown>,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    set(key: string, value: string) {
      this.headers[key.toLowerCase()] = value;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
}

describe("T42 — Yetki, kaynak sınırı, sektör varsayılanı ve lease regresyonu", () => {
  it("§8.4: boş sektör kataloğunda varsayılan 'residential' 500 FK hatası yerine null'a düşer; dolu katalogda geçersiz/pasif sektör 400 döner", async () => {
    const emptyCatalogId = await resolveQuotationIndustryId("residential", async () => []);
    assert.equal(emptyCatalogId, null);

    const activeCatalog = [
      { id: "residential", enabled: true },
      { id: "infrastructure", enabled: false },
    ];
    const validId = await resolveQuotationIndustryId("residential", async () => activeCatalog);
    assert.equal(validId, "residential");

    const explicitNull = await resolveQuotationIndustryId(null, async () => activeCatalog);
    assert.equal(explicitNull, null);

    await assert.rejects(
      () => resolveQuotationIndustryId("unknown-sector", async () => activeCatalog),
      (err: unknown) => err instanceof QuotationIntegrityError && err.status === 400 && /sektör kataloğunda/i.test(err.message),
    );

    await assert.rejects(
      () => resolveQuotationIndustryId("infrastructure", async () => activeCatalog),
      (err: unknown) => err instanceof QuotationIntegrityError && err.status === 400,
    );
  });

  it("Academy entitlement: ACADEMY_ENABLED=false iken tüm Allplan uçları 403 ACADEMY_FEATURE_DISABLED ile reddedilir", async () => {
    assert.equal(isAcademyRuntimeEnabled({}), false);
    assert.equal(isAcademyRuntimeEnabled({ ACADEMY_RUNTIME_ENABLED: "true" }), true);

    let dbLookupCalled = false;
    const middlewareDisabled = createRequireAllplanEntitlement({
      isEnabled: () => false,
      findEntitlement: async () => {
        dbLookupCalled = true;
        return null;
      },
    });

    const resDisabled = createMockRes();
    let nextCalled = false;
    await middlewareDisabled(
      { method: "GET", originalUrl: "/api/academy/allplan/curriculum", user: { companyId: "c1", userId: "u1", role: "owner" } },
      resDisabled,
      () => { nextCalled = true; },
    );
    assert.equal(nextCalled, false);
    assert.equal(dbLookupCalled, false);
    assert.equal(resDisabled.statusCode, 403);
    assert.deepEqual(resDisabled.body, {
      error: "Allplan Academy modülü şu anda devre dışıdır.",
      code: "ACADEMY_FEATURE_DISABLED",
    });

    const middlewareEnabledNoGrant = createRequireAllplanEntitlement({
      isEnabled: () => true,
      findEntitlement: async () => null,
    });
    const resNoGrant = createMockRes();
    await middlewareEnabledNoGrant(
      { method: "GET", originalUrl: "/api/academy/allplan/lessons/wall-basics", user: { companyId: "c1", userId: "u1", role: "viewer" } },
      resNoGrant,
      () => { nextCalled = true; },
    );
    assert.equal(nextCalled, false);
    assert.equal(resNoGrant.statusCode, 403);
    assert.deepEqual(resNoGrant.body, {
      error: "Allplan eğitim erişimi etkin değil.",
      code: "ACADEMY_ENTITLEMENT_REQUIRED",
    });

    // Viewer cannot bypass entitlement via certificate revoke endpoint
    const resViewerRevoke = createMockRes();
    await middlewareEnabledNoGrant(
      { method: "POST", originalUrl: "/api/academy/allplan/certificates/BPA-2026-ABCDEF123456/revoke", user: { companyId: "c1", userId: "u1", role: "viewer" } },
      resViewerRevoke,
      () => { nextCalled = true; },
    );
    assert.equal(nextCalled, false);
    assert.equal(resViewerRevoke.statusCode, 403);
  });

  it("SmartCheck uzun iş heartbeat ve orphan lease süresi: aktif lease korunur, süresi dolan lease güvenli devralınır", () => {
    const now = new Date("2026-10-25T16:00:00.000Z");
    const freshHeartbeat = new Date(now.getTime() - 5 * 60 * 1000);
    const staleHeartbeat = new Date(now.getTime() - DEFAULT_SMARTCHECK_LEASE_TIMEOUT_MS - 1000);

    assert.equal(
      isSmartCheckLeaseExpired({ status: "running", updatedAt: freshHeartbeat, startedAt: freshHeartbeat }, now),
      false,
    );
    assert.equal(
      isSmartCheckLeaseExpired({ status: "running", updatedAt: staleHeartbeat, startedAt: staleHeartbeat }, now),
      true,
    );
    assert.equal(
      isSmartCheckLeaseExpired({ status: "succeeded", updatedAt: staleHeartbeat, startedAt: staleHeartbeat }, now),
      false,
    );
  });

  it("Ücretli işlem atlatma ve salt-okunur impersonation negatifleri: askıdaki abonelik ve impersonation mutasyonları 403 döner", async () => {
    const userId = "11111111-1111-4111-8111-111111111111";
    const adminId = "22222222-2222-4222-8222-222222222222";
    const companyId = "33333333-3333-4333-8333-333333333333";

    const suspendedAuth = createAuthenticate({
    isSessionRevoked: async () => false,
      async findUser() {
        return { email: "owner@example.test", emailVerified: new Date(), passwordChangedAt: null, isSuperAdmin: false };
      },
      async findMembership() {
        return { role: "owner" };
      },
      async findSubscription() {
        return { status: "past_due" };
      },
    });

    const token = AuthService.generateToken({ userId, companyId, role: "owner" });
    const resMutation = createMockRes();
    let nextCalled = false;
    await suspendedAuth(
      { method: "POST", originalUrl: "/api/quotations", headers: { authorization: `Bearer ${token}` } },
      resMutation,
      () => { nextCalled = true; },
    );
    assert.equal(nextCalled, false);
    assert.equal(resMutation.statusCode, 403);
    assert.equal((resMutation.body as { code?: string })?.code, "SUBSCRIPTION_SUSPENDED");

    // Read-only impersonation token cannot mutate business resources
    const impersonationToken = AuthService.generateToken({ userId, companyId, role: "owner", impersonatedBy: adminId, readOnly: true } as any);
    const impersonationAuth = createAuthenticate({
    isSessionRevoked: async () => false,
      async findUser(id) {
        return { email: `${id}@example.test`, emailVerified: new Date(), passwordChangedAt: null, isSuperAdmin: id === adminId };
      },
      async findMembership() {
        return { role: "owner" };
      },
      async isImpersonationRevoked() {
        return false;
      },
      async findSubscription() {
        return { status: "active" };
      },
    });

    const resImpersonatedWrite = createMockRes();
    await impersonationAuth(
      { method: "POST", originalUrl: "/api/quotations", headers: { authorization: `Bearer ${impersonationToken}` } },
      resImpersonatedWrite,
      () => { nextCalled = true; },
    );
    assert.equal(nextCalled, false);
    assert.equal(resImpersonatedWrite.statusCode, 403);
    assert.equal((resImpersonatedWrite.body as { code?: string })?.code, "IMPERSONATION_READ_ONLY");
  });
});
