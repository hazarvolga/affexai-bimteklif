import assert from "node:assert/strict";
import test from "node:test";
import { resolveAuthorizationInput } from "../../server/routes/pricing";
import { buildTenantPriceCatalogImportPayload, isTenantCompanyActualDeclaration } from "./catalog-import";

test("generic SmartCheck CSV payload matches the tenant-owned server authorization contract", () => {
  const payload = buildTenantPriceCatalogImportPayload({
    sourceName: "Firma gerçekleşen fiyatları",
    fileName: "gerceklesenler.csv",
    documentId: "document-1",
    region: "İstanbul",
    validUntil: "2026-12-31T00:00:00.000Z",
    ownershipConfirmed: true,
    rows: [{ description: "C30 beton", unit: "m3", amount: 2_500, currency: "TRY" }],
  });

  assert.equal(payload.sourceType, "company_actual");
  assert.equal(payload.licenseStatus, "not_applicable");
  assert.deepEqual(payload.ownershipDeclaration, { kind: "tenant_company_actual", version: 1, accepted: true });
  const authorization = resolveAuthorizationInput({
    sourceType: payload.sourceType,
    sourceDocumentHash: "a".repeat(64),
    actorUserId: "tenant-user",
    allowTenantAuthorization: true,
  });
  assert.equal(authorization.authorizationStatus, "authorized");
  assert.equal(authorization.decision.eligible, true);
});

test("generic SmartCheck CSV payload requires an explicit tenant ownership declaration", () => {
  assert.throws(() => buildTenantPriceCatalogImportPayload({
    sourceName: "Belirsiz fiyat listesi",
    rows: [{ description: "C30 beton", unit: "m3", amount: 2_500 }],
    ownershipConfirmed: false,
  }), /TENANT_PRICE_OWNERSHIP_CONFIRMATION_REQUIRED/);
});

test("tenant ownership declaration rejects client-attributed or version-drifted evidence", () => {
  assert.equal(isTenantCompanyActualDeclaration({ kind: "tenant_company_actual", version: 1, accepted: true, acceptedByUserId: "spoofed" }), false);
  assert.equal(isTenantCompanyActualDeclaration({ kind: "tenant_company_actual", version: 2, accepted: true }), false);
});

test("generic CSV payload cannot represent a self-authorized supplier quote", () => {
  const supplierAuthorization = resolveAuthorizationInput({
    sourceType: "supplier_quote",
    sourceDocumentHash: "b".repeat(64),
    actorUserId: "tenant-user",
    allowTenantAuthorization: true,
  });

  assert.equal(supplierAuthorization.authorizationStatus, "pending");
  assert.equal(supplierAuthorization.decision.eligible, false);
});
